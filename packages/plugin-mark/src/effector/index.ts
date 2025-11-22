import type { Et } from '@effitor/core'
import {
  boldIcon,
  highlightIcon,
  inlineCodeIcon,
  italicIcon,
  strikeThroughIcon,
} from '@effitor/shared'

import { MarkStatus, MarkType } from '../config'
import { checkFormatMark, checkInsertMark } from './check'
import { markBeforeKeydownSolver } from './keydown'

export const markEffector: Et.Effector = {
  enforce: 'pre',
  beforeKeydownSolver: markBeforeKeydownSolver,
  htmlEventSolver: {
    mousedown: (_ev, ctx) => {
      if (ctx.pctx.$markEx.enableHinting) {
        // 光标已经在 mark 节点内, 不处理; 避免页面跳动(layout shift)
        if (ctx.schema.mark.is(ctx.focusEtElement)) {
          return
        }
        ctx.bodyEl.addCssClass(MarkStatus.HINTING_HIDDEN)
      }
      if (ctx.pctx.$markEx.markState.checkAndEndMarking(false)) {
        ctx.commandManager.discard()
      }
    },
    mouseup: (_ev, ctx) => {
      if (ctx.pctx.$markEx.enableHinting) {
        ctx.bodyEl.removeCssClass(MarkStatus.HINTING_HIDDEN)
      }
    },
  },
  onMounted(ctx) {
    ctx.settings.toggleHintingMarker = (hinting: boolean) => {
      if (hinting === void 0) {
        hinting = !ctx.bodyEl.hasCssClass(MarkStatus.HINTING_HIDDEN)
      }
      ctx.pctx.$markEx.enableHinting = hinting
      if (hinting) {
        ctx.bodyEl.removeCssClass(MarkStatus.HINTING_HIDDEN)
      }
      else {
        ctx.bodyEl.addCssClass(MarkStatus.HINTING_HIDDEN)
      }
    }
    ctx.hotkeyManager.bindActionRun({
      markBold: ctx => checkFormatMark(ctx, MarkType.BOLD),
      markItalic: ctx => checkFormatMark(ctx, MarkType.ITALIC),
      markDelete: ctx => checkFormatMark(ctx, MarkType.DELETE),
      markHighlight: ctx => checkFormatMark(ctx, MarkType.HIGHLIGHT),
      markInlineCode: ctx => checkFormatMark(ctx, MarkType.CODE),
    })
    // 下拉菜单添加 mark 相关的 item
    addMarkItemToDropdown(ctx.assists.dropdown)
  },
}

const addMarkItemToDropdown = (dropdown?: Required<Et.EditorAssists>['dropdown']) => {
  if (!dropdown) {
    return
  }
  ([
    [boldIcon(), (ctx: Et.EditorContext) => checkInsertMark(ctx, MarkType.BOLD, false), ['bold', 'strong']],
    [italicIcon(), (ctx: Et.EditorContext) => checkInsertMark(ctx, MarkType.ITALIC, false), ['italic', 'emphasis']],
    [strikeThroughIcon(), (ctx: Et.EditorContext) => checkInsertMark(ctx, MarkType.DELETE, false), ['delete', 'strikethrough']],
    [inlineCodeIcon(), (ctx: Et.EditorContext) => checkInsertMark(ctx, MarkType.CODE, false), ['code', 'inlinecode']],
    [highlightIcon(), (ctx: Et.EditorContext) => checkInsertMark(ctx, MarkType.HIGHLIGHT, false), ['highlight']],
  ] as (readonly [SVGElement, (ctx: Et.EditorContext) => boolean, string[]][]))
    .forEach(([icon, onchosen, prefixes]) => {
      dropdown.addInlineRichTextMenuItem(dropdown.createMenuItem(icon, onchosen, { prefixes }))
    })
}
