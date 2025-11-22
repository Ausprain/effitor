import type { Et } from '../@types'
import { runInputSolver } from './beforeinput'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class MainAfterInputTypeSolver implements Et.MainInputTypeSolver {
  [k: string]: Et.InputAction
}
// Object.assign(MainAfterInputTypeSolver.prototype, mainAfterInputTypeSolver)

export const getInputListener = (
  ctx: Et.EditorContext, main: MainAfterInputTypeSolver, sovler?: Et.InputTypeSolver,
) => {
  return (ev: Et.InputEvent) => {
    if (!ctx.isUpdated()) {
      ev.preventDefault()
      return false
    }
    if (runInputSolver(ev, ctx, main, sovler)) {
      // 插件未 skipDefault 时, 若光标不在视口内, 将其移动到视口中央
      ctx.selection.scrollIntoView(
        false,
        ev.inputType === 'insertText' ? 'smooth' : 'instant',
      )
    }

    if (ctx.selection.rawEl) {
      return
    }

    if (ev.data && ev.inputType === 'insertText') {
      // TODO 热字符串功能仅在段落下有效?
      if (ctx.isPlainParagraph(ctx.focusEtElement)) {
        ctx.hotstringManager.listen(ev.data)
      }
    }
    else if (ev.inputType === 'deleteContentBackward') {
      // 回退热字符串游标
      ctx.hotstringManager.backflow(1)
    }
    else {
      ctx.hotstringManager.needResetBeforeJudge()
    }

    // TODO drag/drop 引起的dom改变未触发此回调
    // 思考该回调的用意, 有了 Effitor.observeEditing 是否还必要此回调
    // ctx.editor.callbacks.onEditorContentChanged?.(ctx, [ctx.focusTopElement])
  }
}
