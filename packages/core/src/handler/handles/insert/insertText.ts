import { HtmlCharEnum } from '@effitor/shared'

import type { Et } from '../../../@types'
import { cr } from '../../../selection'
import { dom } from '../../../utils'
import { cmd } from '../../command'
import { createInputEffectHandle } from '../../utils'
import { insertTextAtRange } from './insert.shared'

export const insertText = createInputEffectHandle((ctx, { data, targetRange }) => {
  if (!data) {
    return true
  }
  if (targetRange.collapsed) {
    return insertTextAtCaretByTyping(ctx, data, targetRange.toTargetCaret())
  }
  return insertTextAtRange(ctx, data, targetRange)
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
    // 若前面(左边)是零宽空格, 则替换为当前字符
    if (offset > 0 && anchorText.data[offset - 1] === HtmlCharEnum.ZERO_WIDTH_SPACE) {
      let i = offset - 1
      while (i > 0 && anchorText.data[i - 1] === HtmlCharEnum.ZERO_WIDTH_SPACE) {
        i--
      }
      ctx.commandManager.push(cmd.replaceText({
        text: anchorText,
        data,
        delLen: offset - i,
        offset: i,
        setCaret: true,
      }))
      return true
    }
    // TODO 这里可以加一个判断, 后续是否有相邻兄弟文本节点, 有的话合并为一个文本节点
    // 光标右边是零宽字符, 全部替换
    // 避免出现某个段落内容为: `xxx&ZeroWidthSpace;&ZeroWidthSpace;&ZeroWidthSpace;`的情况
    if (offset === 0 && anchorText.data[offset] === HtmlCharEnum.ZERO_WIDTH_SPACE) {
      let r = offset + 1
      while (r < anchorText.length && anchorText.data[r] === HtmlCharEnum.ZERO_WIDTH_SPACE) {
        r++
      }
      ctx.commandManager.push(cmd.replaceText({
        text: anchorText,
        data,
        delLen: r,
        offset,
        setCaret: true,
      }))
      return true
    }
    // 左右都不是零宽字符, 正常插入
    ctx.commandManager.push(cmd.insertText({
      text: anchorText,
      data,
      offset,
      setCaret: true,
    }))
    return true
  }
  // 尝试将前一个全角字符替换为半角
  const replaceChar = ctx.composition.getWritableKey(
    anchorText.data[offset - 1] as string,
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
