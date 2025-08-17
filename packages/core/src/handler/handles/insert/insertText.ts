import { Et } from '@effitor/core'

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
  // 光标在#text节点, 直接插入文本
  if (ctx.node) {
    ctx.commandManager.push(cmd.insertText({
      text: ctx.node,
      data: data,
      offset: ctx.selection.anchorOffset,
      setCaret: true,
    }))
  }
  // 无#text节点, 插入新节点
  else {
    const node = dom.createText(data)
    ctx.commandManager.push(cmd.insertNode({
      node,
      execAt: ctx.selection.getCaretRange().toCaret(true),
      destCaretRange: cr.caret(node, node.length),
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
  if (removeByTargetRange(ctx, targetRange)) {
    if (ctx.selection.isCollapsed) {
      insertTextAtCaret(ctx, data)
    }
  }
  return ctx.commandManager.closeTransaction()
}
