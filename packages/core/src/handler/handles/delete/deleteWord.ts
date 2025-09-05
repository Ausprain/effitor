import { createInputEffectHandle } from '../../utils'
import {
  checkBackspaceAtCaretDeleteNode,
  checkBackspaceAtCaretDeleteParagraph,
  checkBackspaceAtCaretDeleteText,
  checkBackspaceAtCaretInTextStart,
  checkDeleteAtCaretDeleteNode,
  checkDeleteAtCaretDeleteParagraph,
  checkDeleteAtCaretDeleteText,
  checkDeleteAtCaretInTextEnd,
} from './deleteAtCaret'
import { removeByTargetRange } from './deleteAtRange'

export const deleteWordBackward = createInputEffectHandle((_this, ctx, pl) => {
  ctx.setCaretAffinityPreference(true)
  if (!pl.targetRange.collapsed) {
    return removeByTargetRange(ctx, pl.targetRange)
  }
  const tc = pl.targetRange.toTargetCaret()
  return (
    // 光标在文本节点上
    checkBackspaceAtCaretDeleteText(ctx, tc, true)
    // 光标在段落开头?
    || checkBackspaceAtCaretDeleteParagraph(_this, ctx, tc)
    // 光标落在非文本节点边缘?
    || checkBackspaceAtCaretDeleteNode(ctx, tc)
    // 光标落在文本节点开头?
    || checkBackspaceAtCaretInTextStart(ctx, tc)
  )
})
export const deleteWordForward = createInputEffectHandle((_this, ctx, pl) => {
  ctx.setCaretAffinityPreference(false)
  if (!pl.targetRange.collapsed) {
    return removeByTargetRange(ctx, pl.targetRange)
  }
  const tc = pl.targetRange.toTargetCaret()
  return (
    // 光标在文本节点上
    checkDeleteAtCaretDeleteText(ctx, tc, true)
    // 光标在段落末尾?
    || checkDeleteAtCaretDeleteParagraph(_this, ctx, tc)
    // 光标在非文本节点边缘
    || checkDeleteAtCaretDeleteNode(ctx, tc)
    // 光标落在文本节点末尾
    || checkDeleteAtCaretInTextEnd(ctx, tc)
  )
})
