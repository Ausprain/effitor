import { createInputEffectHandle } from '../../config'
import {
  checkBackspaceAtCaretDeleteNode,
  checkBackspaceAtCaretDeleteParagraph,
  checkBackspaceAtCaretDeleteText,
  checkBackspaceAtCaretInTextStart,
  checkDeleteAtCaretDeleteNode,
  checkDeleteAtCaretDeleteParagraph,
  checkDeleteAtCaretDeleteText,
  checkDeleteAtCaretInTextEnd,
} from './deleteContent'
import { removeByTargetRange } from './shared'

export const deleteWordBackward = createInputEffectHandle((_this,
  ctx) => {
  if (!ctx.selection.isCollapsed) {
    return removeByTargetRange(ctx, ctx.selection.range)
  }
  return checkBackspaceAtCaretDeleteText(ctx, true)
  // 光标在段落开头?
    || checkBackspaceAtCaretDeleteParagraph(_this, ctx)
    // 光标落在非文本节点边缘?
    || checkBackspaceAtCaretDeleteNode(ctx)
    // 光标落在文本节点开头?
    || checkBackspaceAtCaretInTextStart(ctx)
})
export const deleteWordForward = createInputEffectHandle((_this, ctx) => {
  if (!ctx.selection.isCollapsed) {
    return removeByTargetRange(ctx, ctx.selection.range)
  }
  return checkDeleteAtCaretDeleteText(ctx, true)
  // 光标在段落末尾
    || checkDeleteAtCaretDeleteParagraph(_this, ctx)
    // 光标在非文本节点边缘
    || checkDeleteAtCaretDeleteNode(ctx)
    // 光标落在文本节点末尾
    || checkDeleteAtCaretInTextEnd(ctx)
})
