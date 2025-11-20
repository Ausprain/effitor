import type { Et } from '@effitor/core'

import { MarkEnum, markerMap, MarkType } from '../config'
import { ectx as _ectx } from './ectx'

export const markBeforeKeydownSolver: Et.KeyboardSolver<typeof _ectx> = {
  [markerMap[MarkType.CODE].char]: (_ev, ctx, ectx) => {
    return ectx.$mark_ctx.checkInsertMark(ctx, MarkType.CODE)
  },
  [markerMap[MarkType.ITALIC].char]: (ev, ctx, ectx) => {
    // * 插入 italic
    if (ctx.prevUpKey !== ev.key) {
      return ectx.$mark_ctx.checkInsertMark(ctx, MarkType.ITALIC)
    }
    // ** 插入 bold
    // 输入第二个*时, 一定在 italic 节点内, 因此在 inMarkHandler.insertText 中处理插入 bold
  },
  [markerMap[MarkType.DELETE].char]: (ev, ctx, ectx) => {
    if (ctx.prevUpKey === ev.key) {
      return ectx.$mark_ctx.checkInsertMark(ctx, MarkType.DELETE)
    }
  },
  [markerMap[MarkType.HIGHLIGHT].char]: (ev, ctx, ectx) => {
    if (ctx.prevUpKey === ev.key) {
      return ectx.$mark_ctx.checkInsertMark(ctx, MarkType.HIGHLIGHT)
    }
  },

  default: (ev, ctx) => {
    if (ctx.commonEtElement.localName !== MarkEnum.ElName) {
      return false
    }
    switch (ev.key) {
      case 'Tab':
      case 'Enter':
      case 'Backspace':
      case 'Delete':
      case 'ArrowDown':
      case 'ArrowUp':
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'Home':
      case 'End':
      {
        if (ctx.pctx.$mark_ctx.markState.checkAndEndMarking(false)) {
          ctx.commandManager.discard()
          return ctx.skipDefault()
        }
      }
    }
  },
}
