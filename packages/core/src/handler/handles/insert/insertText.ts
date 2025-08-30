import type { Et } from '~/core/@types'
import { cr } from '~/core/selection'
import { dom } from '~/core/utils'

import { cmd } from '../../command'
import { createInputEffectHandle } from '../../utils'
import { insertTextAtRange } from './insert.shared'

export const insertText = createInputEffectHandle((_this, ctx, ev) => {
  const tr = ctx.selection.getTargetRange()
  if (!ev.data || !tr) {
    return true
  }
  if (tr.collapsed) {
    return insertTextAtCaretByTyping(ctx, ev.data, tr.toTargetCaret())
  }
  return insertTextAtRange(ctx, ev.data, tr)
})

/**
 * 在光标位置插入文本, 如果插入的是单个空格, 那么插入行为会受编辑器
 * `AUTO_REPLACE_FULL_WIDTH_PUNC_WITH_HALF_AFTER_SPACE`配置的影响
 */
const insertTextAtCaretByTyping = (
  ctx: Et.EditorContext,
  data: string,
  targetCaret: Et.ValidTargetCaret,
): true => {
  if (!data) {
    return true
  }
  // 不在#text节点上, 插入新节点
  if (!targetCaret.isAtText()) {
    const node = dom.createText(data)
    ctx.commandManager.push(cmd.insertNode({
      node,
      execAt: targetCaret.etCaret,
      destCaretRange: cr.caret(node, node.length),
    }))
    return true
  }
  const anchorText = targetCaret.container
  const offset = targetCaret.offset
  // 光标在#text节点, 若全角标点后边输入空格, 自动替换为半角; 否则直接插入空格
  if (data !== ' ' || offset === 0
    || !ctx.editor.config.AUTO_REPLACE_FULL_WIDTH_PUNC_WITH_HALF_AFTER_SPACE
  ) {
    ctx.commandManager.push(cmd.insertText({
      text: anchorText,
      data,
      offset,
      setCaret: true,
    }))
  }
  else {
    const replaceChar = ctx.hotkeyManager.getWritableKey(
      anchorText.data[offset - 1],
    )
    if (replaceChar) {
      ctx.commandManager.push(cmd.replaceText({
        text: anchorText,
        data: replaceChar,
        delLen: replaceChar.length,
        offset: offset - 1,
        setCaret: true,
      }))
    }
    else {
      ctx.commandManager.push(cmd.insertText({
        text: anchorText,
        data: ' ',
        offset: offset,
        setCaret: true,
      }))
    }
  }
  return true
}
