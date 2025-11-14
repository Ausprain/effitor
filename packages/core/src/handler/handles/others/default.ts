import { cr } from '../../../selection'
import { cmd } from '../../command'
import { createEffectHandle } from '../../utils'

export const transformInsertContents = createEffectHandle('TransformInsertContents', (_ctx, payload) => {
  // 原样返回
  return payload.fragment
})

export const insertParagraphAtParagraphStart = createEffectHandle('InsertParagraphAtParagraphStart', (ctx, tc) => {
  const newP = tc.anchorParagraph.createForInsertParagraph(ctx, -1)
  if (newP === null) {
    return true
  }
  // 段落开头插入段落, 直接向上插入新段落, 光标不动
  ctx.commandManager.push(cmd.insertNode({
    node: newP,
    execAt: cr.caretOutStart(tc.anchorParagraph),
    destCaretRange: null,
  }))
  return true
})

export const insertParagraphAtParagraphEnd = createEffectHandle('InsertParagraphAtParagraphEnd', (ctx, tc) => {
  const newP = tc.anchorParagraph.createForInsertParagraph(ctx, 1)
  if (newP === null) {
    return true
  }
  // 段落结尾插入段落, 直接向下插入新段落
  ctx.commandManager.push(cmd.insertNode({
    node: newP,
    execAt: cr.caretOutEnd(tc.anchorParagraph),
    // 如果新段落有文本节点(通常是 zws), 则光标定位到文本节点结尾, 否则定位到新段落开头
    destCaretRange: newP.firstChild && newP.firstChild.nodeType === 3 /** Node.TEXT_NODE */
      ? cr.caretInEnd(newP.firstChild)
      : cr.caretInStart(newP),
  }))
  return true
})

export const paragraphMoveUp = createEffectHandle('ParagraphMoveUp', (ctx, tr) => {
  const prevP = tr.anchorParagraph.previousSibling
  if (!prevP) {
    return false
  }
  // 记录当前滚动位置, 移动段落后, 恢复滚动位置; 避免移动时因增删节点导致页面跳动
  return ctx.commandManager.withRememberScrollTop(ctx, () => {
    ctx.commandManager.pushHandleCallback(() => ctx.selection.scrollIntoViewSync())
    return ctx.commonHandler.moveNode(prevP, cr.caretOutEnd(prevP))
  })
})

export const paragraphMoveDown = createEffectHandle('ParagraphMoveDown', (ctx, tr) => {
  const nextP = tr.anchorParagraph.nextSibling
  if (!nextP) {
    return false
  }
  return ctx.commandManager.withRememberScrollTop(ctx, () => {
    ctx.commandManager.pushHandleCallback(() => ctx.selection.scrollIntoViewSync())
    return ctx.commonHandler.moveNode(nextP, cr.caretOutStart(nextP).moved(-1))
  })
})
