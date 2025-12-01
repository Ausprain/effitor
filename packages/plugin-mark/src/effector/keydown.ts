import type { Et } from '@effitor/core'

import { MarkEnum, markerMap, MarkType } from '../config'
import { checkInsertMark } from './check'

export const markBeforeKeydownSolver: Et.KeyboardSolver = {
  [markerMap[MarkType.CODE].char]: (_ev, ctx) => {
    return checkInsertMark(ctx, MarkType.CODE)
  },
  [markerMap[MarkType.ITALIC].char]: (ev, ctx) => {
    // * 插入 italic
    if (ctx.prevUpKey !== ev.key) {
      return checkInsertMark(ctx, MarkType.ITALIC)
    }
    // ** 插入 bold
    // 输入第二个*时, 一定在 italic 节点内, 因此在 inMarkHandler.insertText 中处理插入 bold
  },
  [markerMap[MarkType.DELETE].char]: (ev, ctx) => {
    if (ctx.prevUpKey === ev.key) {
      return checkInsertMark(ctx, MarkType.DELETE)
    }
  },
  [markerMap[MarkType.HIGHLIGHT].char]: (ev, ctx) => {
    if (ctx.prevUpKey === ev.key) {
      return checkInsertMark(ctx, MarkType.HIGHLIGHT)
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
      case 'Escape':
      {
        if (ctx.pctx.$markPx.markState.checkAndEndMarking(false)) {
          ctx.commandManager.discard()
          return ctx.skipDefault()
        }
      }
    }
  },
}
