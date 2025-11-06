import type { EditorContext } from '../context'

export type RemoveHotstringAction = (ctx: EditorContext, hotstring: string) => Text | null
/**
 * 移除已输入的热字符串
 * @param hotstring 不包含触发字符（尾空格）的热字符串
 * @returns 若不存在#text节点，或输入的字符串不是该热字符串, 返回 null;
 *  否则删除热字符串, 返回对应的文本节点, 可通过 ctx.selection.caretRange 获取最新光标位置
 */
export const removeHotstringOnTrigger: RemoveHotstringAction = (ctx, hotstring) => {
  if (!ctx.selection.isCollapsed) return null
  const text = ctx.selection.anchorText
  if (!text) return null
  const startOffset = ctx.selection.anchorOffset - hotstring.length
  if (text.data.slice(startOffset, startOffset + hotstring.length) === hotstring) {
    if (ctx.commonHandler.deleteInTextNode(text, startOffset, hotstring, true)) {
      return text
    }
  }
  return null
}
