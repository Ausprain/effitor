import { createInputEffectHandle } from '../../utils'
import { removeByTargetRange } from './deleteAtRange'

export const deleteEntireSoftLine = createInputEffectHandle((_this, ctx) => {
  if (ctx.selection.isCollapsed) {
    return true
  }
  ctx.selection.modifyMulti([
    ['extend', 'backward', 'lineboundary'],
    ['extend', 'forward', 'lineboundary'],
  ])
  ctx.forceUpdate()
  return removeByTargetRange(ctx, ctx.selection.range)
})
export const deleteSoftLineBackward = createInputEffectHandle((_this, ctx) => {
  if (ctx.selection.isCaretAtParagraphStart) {
    return false
  }
  ctx.selection.modify('extend', 'backward', 'lineboundary', false)
  ctx.forceUpdate()
  return removeByTargetRange(ctx, ctx.selection.range)
})
export const deleteSoftLineForward = createInputEffectHandle((_this, ctx) => {
  if (ctx.selection.isCaretAtParagraphEnd) {
    return false
  }
  ctx.selection.modify('extend', 'forward', 'lineboundary', false)
  ctx.forceUpdate()
  return removeByTargetRange(ctx, ctx.selection.range)
})
// export const deleteHardLineBackward = createInputEffectHandle((_this, ctx, ev) => {
//   return true
// })
// export const deleteHardLineForward = createInputEffectHandle((_this, ctx, ev) => {
//   return true
// })
