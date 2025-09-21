import type { Et } from '@effitor/core'

import { markerMap, MarkType } from '../config'
import { ectx } from './ectx'

export const markKeyupSolver: Et.KeyboardSolver = {
  [markerMap[MarkType.CODE].char]: (_ev, ctx) => {
    return ectx._et_$mark_.checkInsertMarkNode(ctx, MarkType.CODE) && ctx.skipDefault()
  },
  [markerMap[MarkType.ITALIC].char]: (ev, ctx) => {
    // * 插入 italic
    if (ctx.prevUpKey !== ev.key) {
      return ectx._et_$mark_.checkInsertMarkNode(ctx, MarkType.ITALIC) && ctx.skipDefault()
    }
    // ** 插入 bold
    // 输入第二个*时, 一定在 italic 节点内, 因此在 inMarkHandler.insertText 中处理插入 bold
  },
  [markerMap[MarkType.DELETE].char]: (ev, ctx) => {
    if (ctx.prevUpKey === ev.key) {
      return ectx._et_$mark_.checkInsertMarkNode(ctx, MarkType.DELETE) && ctx.skipDefault()
    }
  },
  [markerMap[MarkType.HIGHLIGHT].char]: (ev, ctx) => {
    if (ctx.prevUpKey === ev.key) {
      return ectx._et_$mark_.checkInsertMarkNode(ctx, MarkType.HIGHLIGHT) && ctx.skipDefault()
    }
  },
}
