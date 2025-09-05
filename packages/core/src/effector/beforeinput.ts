import type { Et } from '../@types'
import { BuiltinConfig } from '../enums'

const mainBeforeInputTypeSolver: Et.MainInputTypeSolver = {
  'default': (ev, ctx) => {
    const targetRange = ctx.selection.getTargetRange()
    if (!targetRange) {
      return false
    }
    if (ctx.effectInvoker.invoke(
      ctx.commonEtElement,
      BuiltinConfig.BUILTIN_EFFECT_PREFFIX + ev.inputType as Et.InputTypeEffect,
      ctx,
      {
        data: ev.data,
        dataTransfer: ev.dataTransfer,
        targetRange,
      },
    )) {
      ev.preventDefault()
    }
    ctx.commandManager.handleAndUpdate()
  },
  /** 未声明或不合法的inputType, 执行此回调 */
  '': (ev, ctx) => {
    if (ev.data) {
      const targetRange = ctx.selection.getTargetRange()
      if (!targetRange) {
        return false
      }
      // 将 InputEvent 不接受的 inputType写入 data 中来读取
      const effect = ev.data[0].toUpperCase() === ev.data[0]
        ? ev.data
        : BuiltinConfig.BUILTIN_EFFECT_PREFFIX + ev.data

      ctx.effectInvoker.invoke(
        ctx.commonEtElement,
        effect as Et.InputTypeEffect,
        ctx,
        {
          data: ev.data,
          dataTransfer: ev.dataTransfer,
          targetRange,
        },
      )
      if (ctx.commandManager.handleAndUpdate()) {
        ev.preventDefault()
      }
      return
    }
    if (import.meta.env.DEV) {
      console.error(`handle beforeinput type=="${ev.inputType}"  ======`)
    }
  },
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class MainBeforeInputTypeSolver implements Et.InputTypeSolver {
  [k: string]: Et.InputAction | undefined
}
Object.assign(MainBeforeInputTypeSolver.prototype, mainBeforeInputTypeSolver)

export const runInputSolver = (
  ev: Et.InputEvent, ctx: Et.EditorContext,
  main: MainBeforeInputTypeSolver, solver?: Et.InputTypeSolver,
) => {
  if (!ctx.isUpdated()) {
    ev.preventDefault()
    return false
  }

  let fn
  if (solver) {
    fn = solver[ev.inputType] ?? solver.default
    if (typeof fn === 'function') {
      fn(ev, ctx)
    }
  }
  if (ctx.defaultSkipped) return false

  fn = main[ev.inputType] ?? main.default
  if (typeof fn === 'function') {
    fn(ev, ctx)
  }
}

export const getBeforeinputListener = (
  ctx: Et.EditorContext, main: MainBeforeInputTypeSolver, solver?: Et.InputTypeSolver,
) => {
  return (ev: Et.InputEvent) => {
    // console.log('beforeinput', ev.inputType, ev.data)
    // 输入法会话内 跳过delete 处理, 因为其不可 preventDefault
    if (ctx.inCompositionSession) {
      if ([
        'deleteContentBackward', // Windows
        'deleteWordBackward', // MacOS
        'deleteContentForward',
        'deleteWordForward',
      ].includes(ev.inputType)) {
        return
      }
      // 输入法相关 inputType 不走插件, 直接进入 MainSolver
      runInputSolver(ev, ctx, main, void 0)
      return
    }

    runInputSolver(ev, ctx, main, solver)

    if (!ev.defaultPrevented) {
      // todo remove
      if (import.meta.env.DEV) {
        if (!['insertCompositionText', 'deleteCompositionText'].includes(ev.inputType)) {
          console.error(`There's unhandled input:`, ev.inputType, ev.getTargetRanges()[0], ev)
        }
      }
      // 阻止所有beforeinput默认行为
      // FIXME 拖拽插入(deleteByDrag) 若不在 drag/drop 事件中阻止默认行为, 此处阻止无效
      ev.preventDefault()
      return
    }
    // MacOS 下 Safari 有 deleteCompositionText 也无法 preventDefault
    if (!['insertCompositionText', 'deleteCompositionText'].includes(ev.inputType)) {
      // 默认事件被取消, 手动dispatch input事件
      ctx.dispatchInputEvent('input', {
        inputType: ev.inputType,
        data: ev.data,
      })
    }
  }
}
