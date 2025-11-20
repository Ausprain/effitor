/**
 * // TODO 此处依赖当前选区 ctx.selection, 尚未完全转移到仅依据 TargetRange 进行删除
 */
import { createInputEffectHandle } from '../../utils'
import { removeByTargetRange } from './deleteAtRange'

export const deleteEntireSoftLine = createInputEffectHandle((ctx) => {
  if (ctx.selection.isCollapsed) {
    return true
  }
  ctx.selection.modifyMulti([
    ['extend', 'backward', 'lineboundary'],
    ['extend', 'forward', 'lineboundary'],
  ])
  ctx.forceUpdate()
  const tr = ctx.selection.getTargetRange()
  if (!tr || tr.collapsed) {
    return false
  }
  return removeByTargetRange(ctx, tr)
})
export const deleteSoftLineBackward = createInputEffectHandle((ctx) => {
  if (ctx.selection.isCaretAtParagraphStart) {
    return true
  }
  ctx.selection.modify('extend', 'backward', 'lineboundary', false)
  ctx.forceUpdate()
  const tr = ctx.selection.getTargetRange()
  if (!tr || tr.collapsed) {
    return false
  }
  return removeByTargetRange(ctx, tr)
})
export const deleteSoftLineForward = createInputEffectHandle((ctx) => {
  if (ctx.selection.isCaretAtParagraphEnd) {
    return true
  }
  ctx.selection.modify('extend', 'forward', 'lineboundary', false)
  ctx.forceUpdate()
  const tr = ctx.selection.getTargetRange()
  if (!tr || tr.collapsed) {
    return false
  }
  return removeByTargetRange(ctx, tr)
})
// export const deleteHardLineBackward = createInputEffectHandle((ctx, ev) => {
//   return true
// })
// export const deleteHardLineForward = createInputEffectHandle((ctx, ev) => {
//   return true
// })
