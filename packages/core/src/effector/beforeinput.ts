import { BuiltinConfig } from '@effitor/shared'

import type { Et } from '../@types'
import { cr } from '../selection'
import { solveInputInRawEl } from './beforeinputInRaw'

const mainBeforeInputTypeSolver: Et.MainInputTypeSolver = {
  default: (ev, ctx) => {
    let effect
    if (ev.inputType) {
      effect = BuiltinConfig.BUILTIN_EFFECT_PREFFIX + ev.inputType
    }
    else {
      // chrome 会将未声明或不合法的inputType转为"", 判断是否设置在了 data 里
      if (!ev.data) {
        if (import.meta.env.DEV) {
          ctx.assists.logger?.logWarn(`handle unvalid inputType: ${ev.inputType}`, `beforeinput.${ev.inputType}`)
        }
        return
      }
      effect = ev.data[0].toUpperCase() === ev.data[0]
        ? ev.data
        : BuiltinConfig.BUILTIN_EFFECT_PREFFIX + ev.data
    }
    // 如果 beforeinput 事件提供了 targetRange, 则尝试从事件对象中获取 targetRange
    // 由于 effitor 拦截了所有默认行为, 理论上这里的 targetRange 不会是浏览器创建的
    // 而如果非空, 则说明是由 effitor 创建并触发的 beforeinput 事件, 并提供了 StaticRange
    let targetRange, staticRange
    if ((staticRange = ev.getTargetRanges?.()[0])) {
      targetRange = ctx.selection.createTargetRange(cr.fromRange(staticRange))
    }
    if (!targetRange) {
      targetRange = ctx.selection.getTargetRange()
    }
    // 理论上通过用户编辑行为触发的事件, ctx 上下文与targetRange 上下文应该是一致的
    if (!targetRange || (!staticRange && ctx.commonEtElement !== targetRange.commonEtElement)) {
      return false
    }
    if (ctx.effectInvoker.invoke(ctx.commonEtElement, effect as Et.InputTypeEffect, ctx, {
      data: ev.data,
      dataTransfer: ev.dataTransfer,
      targetRange,
    })) {
      ev.preventDefault()
    }
    ctx.commandManager.handleAndUpdate()
  },
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class MainBeforeInputTypeSolver implements Et.InputTypeSolver {
  [k: string]: Et.InputAction | undefined
}
Object.assign(MainBeforeInputTypeSolver.prototype, mainBeforeInputTypeSolver)

/**
 * 运行效应器 inputSolver
 * @returns 是否执行了默认行为, ctx 未更新或ctx.defaultSkipped为 true, 则返回 false
 */
export const runInputSolver = (
  ev: Et.InputEvent, ctx: Et.EditorContext,
  main: MainBeforeInputTypeSolver, solver?: Et.InputSolver,
) => {
  if (!ctx.isUpdated()) {
    ev.preventDefault()
    return false
  }

  let fn
  if (solver) {
    fn = solver[ctx.commonEtElement.localName as keyof Et.DefinedEtElementMap]
      || solver[ev.inputType] || solver.default
    if (typeof fn === 'function') {
      fn(
        ev,
        // @ts-expect-error 效应元素独占 solver 的 ctx 的 commonEtElement就是该效应元素类型
        ctx,
      )
    }
  }
  if (ctx.defaultSkipped) return false

  fn = main[ev.inputType] || main.default
  if (typeof fn === 'function') {
    fn(ev, ctx)
  }
  return true
}

export const getBeforeinputListener = (
  ctx: Et.EditorContext, main: MainBeforeInputTypeSolver, solver?: Et.InputSolver,
) => {
  return (ev: Et.InputEvent) => {
    if (!ctx.isUpdated()) {
      return
    }
    // console.log('beforeinput', ev.inputType, ev.data)
    ev.stopPropagation()
    // 输入法会话内 跳过显式的 delete 处理; 正常情况下, 输入法会话内的 inputType 不会是以下值, 只可能是
    // [insertCompositionText, deleteCompositionText, insertFromComposition], 后两项是Safari 独有
    // TODO, 测试以下判断是否已经过时 (不必要的)
    if (ctx.composition.inSession) {
      if ([
        'deleteContentBackward', // Windows
        'deleteWordBackward', // MacOS
        'deleteContentForward',
        'deleteWordForward',
      ].includes(ev.inputType)) {
        if (import.meta.env.DEV) {
          throw new Error('delete 相关 inputType 不应该在输入法会话内触发')
        }
        return
      }
      if (ctx.selection.rawEl) {
        solveInputInRawEl(ev, ctx, ctx.selection.rawEl)
      }
      else {
        // 输入法相关 inputType 不走插件, 直接进入 MainSolver
        runInputSolver(ev, ctx, main, void 0)
      }
      return
    }

    if (ctx.selection.rawEl) {
      solveInputInRawEl(ev, ctx, ctx.selection.rawEl, solver)
    }
    else {
      runInputSolver(ev, ctx, main, solver)
    }

    if (!ev.defaultPrevented) {
      // todo remove
      if (import.meta.env.DEV) {
        if (!['insertCompositionText', 'deleteCompositionText'].includes(ev.inputType)) {
          ctx.assists.logger?.logWarn(`There's unhandled inputType: ${ev.inputType}`, `core[beforeinput]`)
        }
      }
      // 阻止所有beforeinput默认行为
      ev.preventDefault()
      return
    }
    // MacOS 下 Safari 有 deleteCompositionText 也无法 preventDefault
    if (!['insertCompositionText', 'deleteCompositionText'].includes(ev.inputType)) {
      // 默认事件被取消, 手动dispatch input事件
      ctx.body.dispatchInputEvent('input', {
        inputType: ev.inputType,
        data: ev.data,
      })
    }
  }
}
