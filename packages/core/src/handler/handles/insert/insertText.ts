import { Et } from '@effitor/core'

import { cr } from '~/core/selection'
import { dom } from '~/core/utils'

import { cmd } from '../../command'
import { createInputEffectHandle } from '../../config'
import { checkTargetRangePosition } from '../../utils/handler'

const insertTextAtCaret = (
  data: string,
  ctx: Et.UpdatedContext,
) => {
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
      execAt: ctx.selection.getCaretRange(),
      destCaretRange: cr.caret(node, node.length),
    }))
  }
}

const insertTextAtRange = (
  data: string,
  ctx: Et.UpdatedContext,
  targetRange: Et.StaticRange,
) => {
  checkTargetRangePosition(ctx, targetRange, (p, t) => {
    insertTextAtCaret(data, ctx)
  })
}

export const insertText = createInputEffectHandle((_this, ctx, ev) => {
  return true
})
