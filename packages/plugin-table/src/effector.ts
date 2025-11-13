import { dom, type Et } from '@effitor/core'
import { HtmlCharEnum } from '@effitor/shared'

import { TableEnum } from './config'
import { ectx } from './ectx'

const beforeKeydownSolver: Et.KeyboardSolver = {
  default: (ev, ctx) => {
    if (ctx.commonEtElement.localName !== TableEnum.TableCell) {
      return
    }
    if (ctx.hotkeyManager.listenEffect(ectx.$table_ctx.tableCellKeyMap) === false) {
      return
    }
    return ctx.preventAndSkipDefault(ev)
  },
}

export const tableEffector: Et.EffectorSupportInline = {
  inline: true,
  beforeKeydownSolver,
}

/**
 * OneNote 风格插入表格
 */
export const tabToTableEffector: Et.EffectorSupportInline = {
  inline: true,
  keydownSolver: {
    Tab: (ev, ctx) => {
      if (!ctx.selection.isCollapsed || !ctx.isPlainParagraph(ctx.focusParagraph)
        || !ctx.selection.anchorText || ctx.focusParagraph.childNodes.length > 1
      ) {
        return
      }
      const data = ctx.selection.anchorText.data
      if (data.length > 20 || data.includes('\t') || data.replaceAll(HtmlCharEnum.ZERO_WIDTH_SPACE, '') === ''
        || (data.length !== ctx.selection.anchorOffset && !dom.isTrailingZWS(data, ctx.selection.anchorOffset))
      ) {
        return
      }
      ctx.effectInvoker.invoke(ctx.focusParagraph, 'replaceParagraphWithTable', ctx, {
        data,
        paragraph: ctx.focusParagraph,
      })
      return ctx.preventAndSkipDefault(ev)
    },
  },
}
