import type { Et } from '~/core/@types'

import { BuiltinConfig } from '../enums'

const mainBeforeInputTypeSolver: Et.MainInputTypeSolver = {
  'default': (ev, ctx) => {
    ctx.effectInvoker.invoke(
      ctx.effectElement,
      BuiltinConfig.BUILTIN_EFFECT_PREFFIX + ev.inputType as Et.InputTypeEffect,
      ctx,
      ev,
    )
    if (ctx.commandManager.handle()) {
      ev.preventDefault()
    }
  },
  /** 未声明或不合法的inputType, 执行此回调 */
  '': (ev, ctx) => {
    if (ev.data) {
      // 将 InputEvent 不接受的 inputType写入 data 中来读取
      ctx.effectInvoker.invoke(
        ctx.effectElement,
        BuiltinConfig.BUILTIN_EFFECT_PREFFIX + ev.data as Et.InputTypeEffect,
        ctx,
        ev,
      )
      if (ctx.commandManager.handle()) {
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
  ev: Et.InputEvent, ctx: Et.UpdatedContext,
  main: MainBeforeInputTypeSolver, solver?: Et.InputTypeSolver,
) => {
  if (!ctx.effectElement) {
    if (import.meta.env.DEV) {
      console.error('无效应元素')
    }
    return
  }

  let fn
  if (solver) {
    fn = solver[ev.inputType] ?? solver.default
    if (typeof fn === 'function') {
      fn(ev, ctx)
    }
  }
  if (ctx.skipDefault) return (ctx.skipDefault = false)

  fn = main[ev.inputType] ?? main.default
  if (typeof fn === 'function') {
    fn(ev, ctx)
  }
}

export const getBeforeinputListener = (
  ctx: Et.UpdatedContext, main: MainBeforeInputTypeSolver, solver?: Et.InputTypeSolver,
) => {
  return (ev: Et.InputEvent) => {
    // 输入法会话内 跳过delete 处理, 因为其不可 preventDefault
    // FIXME. safari 使用 insertFromComposition 和 deleteCompositionText 处理输入法输入结束;
    // 并且insertFromComposition 可以被preventDefault
    // 说明在 Safari 中, 可直接拦截输入法输入, 不用像 chromium 那样合并 insertCompositionText
    if (
      ctx.inCompositionSession && [
        'deleteContentBackward', // Windows
        'deleteWordBackward', // MacOS
        'deleteContentForward',
        'deleteWordForward',
      ].includes(ev.inputType)
    ) {
      return false
    }

    runInputSolver(ev, ctx, main, solver)

    if (!ev.defaultPrevented && ev.inputType !== 'insertCompositionText') {
      // todo remove
      if (import.meta.env.DEV) {
        console.error(`There's unhandled input:`, ev.inputType, ev.getTargetRanges()[0], ev)
      }
      // 阻止所有beforeinput默认行为
      ev.preventDefault()
    }
    else {
      // 默认事件被取消, 手动dispatch input事件
      ctx.dispatchInputEvent('input', {
        inputType: ev.inputType,
        data: ev.data,
        // bubbles: false,   //不可冒泡
      })
    }
  }
}
