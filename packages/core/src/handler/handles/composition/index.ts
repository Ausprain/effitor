import { platform } from '~/core/config'

import { cmd } from '../../command'
import { createInputEffectHandle } from '../../config'

export const insertCompositionText = createInputEffectHandle((_this, ctx, ev) => {
  // safari 中, 不用合并 InsertCompositionText 命令
  if (platform.isSafari || !ev.data) {
    return false
  }
  // 输入法会话的第一个输入, 若当前选区非空, 则删除当前选区
  if (ctx.compositionUpdateCount === 1 && !ctx.selection.isCollapsed) {
    ctx.selection.deleteContents()
  }
  ctx.commandManager.push(cmd.insertCompositionText({
    data: ev.data,
  }))
  return true
})

/**
 * 输入法会话中删除输入法组合串文本, 仅 Safari; 不用处理
 */
export const deleteCompositionText = createInputEffectHandle(() => {
  return true
})

/**
 * 输入法会话结束后, 自动删除输入法组合串, 并将组合结果插入到光标位置, 仅 Safari;
 * 阻止这个默认行为, 用 InsertText 命令代替
 */
export const insertFromComposition = createInputEffectHandle((_this, ctx, ev) => {
  const text = ctx.node
  if (!ev.data || !text) {
    return false
  }
  ev.preventDefault()
  ctx.commandManager.withTransaction([
    cmd.insertText({
      text,
      data: ev.data,
      offset: ctx.selection.anchorOffset,
    }),
  ])
  return true
})
