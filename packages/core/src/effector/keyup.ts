import type { Et } from '..'
import { etcode } from '../element'
import { EtTypeEnum } from '../enums'
import { cr } from '../selection'
import { type MainKeyboardSolver, runKeyboardSolver } from './keydown'

const keyupSolver: MainKeyboardSolver = {
  Tab: (ev, ctx) => {
    if (ev.ctrlKey || ev.altKey) return
    if (!ctx.selection.isCollapsed) {
      ctx.selection.collapse(false)
      return
    }
    if (etcode.check(ctx.effectElement, EtTypeEnum.CaretOut)) {
      // 在富文本`or`组件节点内, 跳到下一节点开头
      return ctx.commonHandlers.tabout(ctx)
    }
    const text = ctx.selection.anchorText
    // 有文本节点，插入制表符
    if (text) {
      return ctx.commandManager
        .push('Insert_Text', {
          data: '\t',
          text: text,
          offset: ctx.selection.anchorOffset,
        })
        .handle(cr.caret(text, ctx.selection.anchorOffset + 1))
    }
  },
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class MainKeyupKeySolver implements Et.KeyboardKeySolver {
  [k: string]: Et.KeyboardAction | undefined
}
Object.assign(MainKeyupKeySolver.prototype, keyupSolver)

let doubleKeyTimer: number | undefined = undefined
export const getKeyupListener = (
  ctx: Et.UpdatedContext, main: MainKeyupKeySolver, solver?: Et.KeyboardKeySolver,
) => {
  return (ev: Et.KeyboardEvent) => {
    // import.meta.env.DEV && console.error('keyup', ev.key)
    runKeyboardSolver(ev, ctx, main, solver)

    // 用于判定双击按键, range时禁用
    ctx.prevUpKey = ctx.prevUpKey === null ? undefined : ev.key
    if (doubleKeyTimer) {
      clearTimeout(doubleKeyTimer)
    }
    doubleKeyTimer = window.setTimeout(() => {
      ctx.prevUpKey = undefined
    }, 111)
  }
}
