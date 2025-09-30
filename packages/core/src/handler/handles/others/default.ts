import type { Et } from '../../../@types'
import { cr } from '../../../selection'
import { cmd } from '../../command'
import { createEffectHandle } from '../../utils'

export const initEditorContents = createEffectHandle('InitEditorContents', (
  ctx, { create, isFirstInit },
) => {
  let newP, dest
  const bodyEl = ctx.bodyEl
  const out = create
    ? create()
    : ctx.editor.callbacks.firstInsertedParagraph?.() ?? ctx.createPlainParagraph()
  if (Array.isArray(out)) {
    newP = out[0]
    dest = out[1]
  }
  else {
    newP = out
  }
  if (!dest) {
    dest = cr.caretInStart(newP)
  }
  if (isFirstInit) {
    bodyEl.appendChild(newP)
    ctx.setSelection(dest)
    return true
  }

  if (bodyEl.hasChildNodes()) {
    ctx.commandManager.push(cmd.removeContent({
      removeRange: cr.spanRangeAllIn(bodyEl) as Et.SpanRange,
    }))
  }

  ctx.commandManager.push(cmd.insertNode({
    node: newP,
    execAt: cr.caretInStart(bodyEl),
  })).handleAndUpdate(dest)

  return true
})

export const updateEditorContentsFromMarkdown = createEffectHandle('UpdateEditorContentsFromMarkdown', (
  ctx, { mdText, mdOptions },
) => {
  const df = ctx.fromMarkdown(mdText, mdOptions)
  const cm = ctx.commandManager
  const bodyEl = ctx.bodyEl

  // 刚刚初始化, 直接插入, 无需撤回支持
  if (cm.stackLength === 0) {
    bodyEl.textContent = ''
    bodyEl.appendChild(df)
    return true
  }
  if (bodyEl.hasChildNodes()) {
    cm.withTransaction([
      cmd.removeContent({
        // body 必有子节点
        removeRange: cr.spanRangeAllIn(bodyEl) as Et.SpanRange,
      }),
      cmd.insertContent({
        content: df,
        execAt: cr.caretInStart(bodyEl),
      }),
    ])
  }
  else {
    cm.withTransaction([
      cmd.insertContent({
        content: df,
        execAt: cr.caretInStart(bodyEl),
      }),
    ])
  }

  return true
})

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
