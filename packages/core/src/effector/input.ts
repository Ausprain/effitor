import type { Et } from '../@types'
// import { HtmlCharEnum } from '../enums'
// import { handlerUtils } from '../handler'
import { runInputSolver } from './beforeinput'

/**
 * 删除内容后（更新上下文前），若当前效应元素内容为零宽字符，则一起删除，并合并前后可合并节点
 */
// const checkRemoveZWSNodeAfterDeleteContent = (ev: Et.InputEvent, ctx: Et.UpdatedContext) => {
//   // fixed. 命令handler中已经更新了ctx.range和ctx.node, 应直接从ctx.node向上找EtElement，
//   // 因为ctrl删除时ctx.effectElement可能是段落
//   // 若剩下零宽字符，则ctx.node必定存在
//   if (!ctx.node) return false
//   const etElement = ctx.findEffectParent(ctx.node)
//   if (!etElement || etElement === ctx.paragraphEl // 段落不应参与
//     || etElement.textContent !== HtmlCharEnum.ZERO_WIDTH_SPACE
//   ) {
//     return false
//   }
//   return handlerUtils.removeNodeAndMerge(ctx, etElement)
//     && ctx.commandManager.handle() && (ctx.skipDefault = true)
// }

// const mainAfterInputTypeSolver: Et.MainInputTypeSolver = {
//   deleteContentBackward: checkRemoveZWSNodeAfterDeleteContent,
//   deleteContentForward: checkRemoveZWSNodeAfterDeleteContent,
//   deleteWordBackward: checkRemoveZWSNodeAfterDeleteContent,
//   deleteWordForward: checkRemoveZWSNodeAfterDeleteContent,
// }

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
    // TODO 热字符串功能仅在段落下有效?
    if (ev.inputType === 'insertText' && ctx.isPlainParagraph(ctx.focusEtElement)) {
      ctx.hasInsertText = true
      if (ev.data) {
        ctx.hotstringManager.listen(ev.data)
      }
    }
    runInputSolver(ev, ctx, main, sovler)

    // 若光标不在视口内, 将其移动到视口中央
    ctx.selection.revealSelection(false, ev.inputType.startsWith('insert') ? 'smooth' : 'instant')

    // TODO drag/drop 引起的dom改变未触发此回调
    // 思考该回调的用意, 有了 Effitor.observeEditing 是否还必要此回调
    ctx.editor.callbacks.onEditorContentChanged?.(ctx, [ctx.focusTopElement])
  }
}

declare global {
  interface Element {
    /**
     * 如果当前元素不在视口内, 将尝试将其滚动到视口内, 默认滚动到中间位置
     * [Element: scrollIntoViewIfNeeded](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoViewIfNeeded)
     * @param centerIfNeeded 默认为true
     */
    scrollIntoViewIfNeeded?(centerIfNeeded?: boolean): void
  }
}
