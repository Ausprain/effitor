import type { EditorContext } from '../context'

export type RemoveHotstringAction = (ctx: EditorContext, hotstring: string) => boolean
/**
 * 移除已输入的热字符串
 * @param hotstring 不包含触发字符（尾空格）的热字符串
 * @returns 若不存在#text节点，或输入的字符串不是该热字符串, 返回 false;
 *  否则删除热字符串, 返回 true, 可通过 ctx.selection.caretRange 获取最新光标位置
 */
export const removeHotstringOnTrigger: RemoveHotstringAction = (ctx, hotstring) => {
  if (!ctx.selection.isCollapsed) return false
  const text = ctx.selection.anchorText
  if (!text) return false
  if (!text.data.endsWith(hotstring)) return false
  const startOffset = text.length - hotstring.length
  ctx.commandManager
    .push('Delete_Text', {
      text,
      data: hotstring,
      offset: startOffset,
      isBackward: true,
      setCaret: true,
    })
    .handle()
  return true
}
