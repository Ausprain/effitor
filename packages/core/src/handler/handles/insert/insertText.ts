import type { Et } from '../../../@types'
import { HtmlCharEnum } from '../../../enums'
import { cr } from '../../../selection'
import { dom } from '../../../utils'
import { cmd } from '../../command'
import { createInputEffectHandle } from '../../utils'
import { insertTextAtRange } from './insert.shared'

export const insertText = createInputEffectHandle((_this, ctx, pl) => {
  if (!pl.data) {
    return true
  }
  if (pl.targetRange.collapsed) {
    return insertTextAtCaretByTyping(ctx, pl.data, pl.targetRange.toTargetCaret())
  }
  return insertTextAtRange(ctx, pl.data, pl.targetRange)
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
    // 若前一个字符是零宽空格, 则替换为当前字符
    if (offset > 0 && anchorText.data[offset - 1] === HtmlCharEnum.ZERO_WIDTH_SPACE) {
      ctx.commandManager.push(cmd.replaceText({
        text: anchorText,
        data,
        delLen: 1,
        offset: offset - 1,
        setCaret: true,
      }))
    }
    else {
      ctx.commandManager.push(cmd.insertText({
        text: anchorText,
        data,
        offset,
        setCaret: true,
      }))
    }
    return true
  }
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
  return true
}
