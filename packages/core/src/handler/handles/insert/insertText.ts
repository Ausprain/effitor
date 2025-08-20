import type { Et } from '~/core/@types'
import { cr } from '~/core/selection'
import { dom } from '~/core/utils'

import { cmd } from '../../command'
import { createInputEffectHandle } from '../../config'
import { removeByTargetRange } from '../delete/shared'

export const insertText = createInputEffectHandle((_this, ctx, ev) => {
  if (!ev.data) {
    return true
  }
  if (ctx.selection.isCollapsed) {
    return insertTextAtCaret(ctx, ev.data)
  }
  else {
    return insertTextAtRange(ctx, ev.data, ctx.selection.range)
  }
})

const insertTextAtCaret = (
  ctx: Et.UpdatedContext,
  data: string,
) => {
  if (!data) {
    return true
  }
  // 无#text节点, 插入新节点
  if (!ctx.selection.anchorText) {
    const node = dom.createText(data)
    ctx.commandManager.push(cmd.insertNode({
      node,
      execAt: ctx.selection.getCaretRange().toCaret(true),
      destCaretRange: cr.caret(node, node.length),
    }))
    return true
  }
  // 光标在#text节点, 若全角标点后边输入空格, 自动替换为半角; 否则直接插入空格
  if (data !== ' ' || ctx.selection.anchorOffset === 0
    || !ctx.editor.config.AUTO_REPLACE_FULL_WIDTH_PUNC_WITH_HALF_AFTER_SPACE
  ) {
    ctx.commandManager.push(cmd.insertText({
      text: ctx.selection.anchorText,
      data,
      offset: ctx.selection.anchorOffset,
      setCaret: true,
    }))
  }
  else {
    let offset = ctx.selection.anchorOffset
    let replaceChar = ctx.hotkeyManager.getWritableKey(
      ctx.selection.anchorText.data[offset - 1],
    )
    if (replaceChar) {
      offset -= replaceChar.length
      replaceChar += ' '
    }
    else {
      replaceChar = ' '
    }
    ctx.commandManager.push(cmd.replaceText({
      text: ctx.selection.anchorText,
      data: replaceChar,
      delLen: replaceChar.length,
      offset: offset,
      setCaret: true,
    }))
  }
  return true
}

const insertTextAtRange = (
  ctx: Et.UpdatedContext,
  data: string,
  targetRange: Et.StaticRange,
) => {
  if (!data) {
    return true
  }
  ctx.commandManager.startTransaction()
  if (removeByTargetRange(ctx, targetRange) && ctx.commandManager.handle()) {
    if (ctx.selection.isCollapsed) {
      insertTextAtCaret(ctx, data)
    }
  }
  return ctx.commandManager.closeTransaction()
}
