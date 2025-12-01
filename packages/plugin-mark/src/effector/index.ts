import { type Et, hotkey } from '@effitor/core'
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
  // enforce: 'pre',
  beforeKeydownSolver: markBeforeKeydownSolver,
  htmlEventSolver: {
    mousedown: (_ev, ctx) => {
      if (ctx.pctx.$markPx.enableHinting) {
        // 光标已经在 mark 节点内, 不处理; 避免页面跳动(layout shift)
        if (ctx.schema.mark.is(ctx.focusEtElement)) {
          return
        }
        ctx.bodyEl.addCssClass(MarkStatus.HINTING_HIDDEN)
      }
      if (ctx.pctx.$markPx.markState.checkAndEndMarking(false)) {
        ctx.commandManager.discard()
      }
    },
    mouseup: (_ev, ctx) => {
      if (ctx.pctx.$markPx.enableHinting) {
        ctx.bodyEl.removeCssClass(MarkStatus.HINTING_HIDDEN)
      }
    },
  },
  onMounted(ctx) {
    ctx.settings.toggleHintingMarker = (hinting: boolean) => {
      if (hinting === void 0) {
        hinting = !ctx.bodyEl.hasCssClass(MarkStatus.HINTING_HIDDEN)
      }
      ctx.pctx.$markPx.enableHinting = hinting
      if (hinting) {
        ctx.bodyEl.removeCssClass(MarkStatus.HINTING_HIDDEN)
      }
      else {
        ctx.bodyEl.addCssClass(MarkStatus.HINTING_HIDDEN)
      }
    }
    ctx.hotkeyManager.addActions({
      /** 斜体 */
      markItalic: hotkey.createAction('editor', 'Italic', {
        hotkey: hotkey.withMod('KeyI'),
        run: markActions.formatItalic,
      }),
      /** 粗体 */
      markBold: hotkey.createAction('editor', 'Bold', {
        hotkey: hotkey.withMod('KeyB'),
        run: markActions.formatBold,
      }),
      /** 内联代码, mac的 cmd+` 无法拦截, 绑定为ctrl+` */
      markInlineCode: hotkey.createAction('editor', 'InlineCode', {
        hotkey: hotkey.create('Backquote', hotkey.Mod.Ctrl),
        run: markActions.formatInlineCode,
      }),
      /** 删除线 */
      markStrikethrough: hotkey.createAction('editor', 'Strikethrough', {
        hotkey: hotkey.withMod('KeyD'),
        run: markActions.formatStrikethrough,
      }),
      // /** 下划线 */
      // markUnderline: hotkey.createAction('editor', 'Underline', {
      //   hotkey: hotkey.withMod('KeyU'),
      //   run:
      //  }),
      /** 高亮 */
      markHighlight: hotkey.createAction('editor', 'Highlight', {
        hotkey: hotkey.withMod('KeyH'),
        run: markActions.formatHighlight,
      }),
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

export const markActions = {
  formatBold: (ctx: Et.EditorContext) => checkFormatMark(ctx, MarkType.BOLD),
  formatItalic: (ctx: Et.EditorContext) => checkFormatMark(ctx, MarkType.ITALIC),
  formatStrikethrough: (ctx: Et.EditorContext) => checkFormatMark(ctx, MarkType.DELETE),
  formatInlineCode: (ctx: Et.EditorContext) => checkFormatMark(ctx, MarkType.CODE),
  formatHighlight: (ctx: Et.EditorContext) => checkFormatMark(ctx, MarkType.HIGHLIGHT),
}
