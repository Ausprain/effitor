import type { Et } from '../@types'
import { type MainKeyboardSolver, runKeyboardSolver } from './keydown'

const mainKeyupSolver: MainKeyboardSolver = {
  ' ': (_ev, ctx) => {
    if (ctx.prevUpKey === ' ') {
      const tc = ctx.selection.getTargetCaret()
      if (!tc) {
        return
      }
      ctx.getEtHandler(tc.anchorEtElement).dblSpace?.(ctx, tc)
    }
  },
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class MainKeyupKeySolver implements Et.KeyboardKeySolver {
  [k: string]: Et.KeyboardAction
}
Object.assign(MainKeyupKeySolver.prototype, mainKeyupSolver)

let doubleKeyTimer: number | undefined = undefined
export const getKeyupListener = (
  ctx: Et.EditorContext, main: MainKeyupKeySolver, solver?: Et.KeyboardKeySolver,
) => {
  return (ev: Et.KeyboardEvent) => {
    if (!ctx.isUpdated()) {
      ev.preventDefault()
      return false
    }
    // import.meta.env.DEV && console.error('keyup', ev.key)
    runKeyboardSolver(ev, ctx, main, solver)

    ctx.affinityPreference = void 0
    // 用于判定双击按键, range时禁用
    ctx.prevUpKey = ctx.prevUpKey === null ? undefined : ev.key
    if (doubleKeyTimer) {
      clearTimeout(doubleKeyTimer)
    }
    doubleKeyTimer = window.setTimeout(() => {
      ctx.prevUpKey = undefined
    }, 211)
  }
}
