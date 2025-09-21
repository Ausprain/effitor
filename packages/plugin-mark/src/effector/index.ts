import type { Et } from '@effitor/core'

import { MarkEnum, MarkStatus, MarkType } from '../config'
import { ectx } from './ectx'
import { markKeyupSolver } from './keyup'

export const markEffector: Et.EffectorSupportInline = {
  inline: true,
  keydownSolver: {
    // mark 元素独占效应器处理函数
    [MarkEnum.ElName]: (ev, ctx) => {
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
          if (ctx.pctx[MarkEnum.CtxKey].markState.checkAndEndMarking(false)) {
            ctx.commandManager.discard()
            return ctx.skipDefault()
          }
        }
      }
    },
  },
  keyupSolver: markKeyupSolver,
  htmlEventSolver: {
    mousedown: (_ev, ctx) => {
      if (ctx.pctx[MarkEnum.CtxKey].markState.checkAndEndMarking(false)) {
        ctx.commandManager.discard()
      }
    },
  },
  onMounted(ctx) {
    ctx.settings.toggleHintingMarker = (hinting: boolean) => {
      if (hinting === void 0) {
        hinting = !ctx.bodyEl.hasCssClass(MarkStatus.HINTING_HIDDEN)
      }
      if (hinting) {
        ctx.bodyEl.removeCssClass(MarkStatus.HINTING_HIDDEN)
      }
      else {
        ctx.bodyEl.addCssClass(MarkStatus.HINTING_HIDDEN)
      }
    }
    ctx.hotkeyManager.bindActionRun({
      markBold: ctx => ectx._et_$mark_.checkFormatMark(ctx, MarkType.BOLD),
      markItalic: ctx => ectx._et_$mark_.checkFormatMark(ctx, MarkType.ITALIC),
      markDelete: ctx => ectx._et_$mark_.checkFormatMark(ctx, MarkType.DELETE),
      markHighlight: ctx => ectx._et_$mark_.checkFormatMark(ctx, MarkType.HIGHLIGHT),
      markInlineCode: ctx => ectx._et_$mark_.checkFormatMark(ctx, MarkType.CODE),
    })
  },
}
