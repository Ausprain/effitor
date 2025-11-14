import { dom, type Et } from '@effitor/core'
import { HtmlCharEnum } from '@effitor/shared'

import { TableEnum } from './config'
import { ectx } from './ectx'

const beforeKeydownSolver: Et.KeyboardSolver = {
  [TableEnum.TableCell]: (ev, ctx) => {
    ctx.commandManager.checkKeydownNeedCommit(ev, ctx)
    if (ctx.hotkeyManager.listenEffect(ectx.$table_ctx.tableCellKeyMap) === false) {
      return
    }
    return ctx.preventAndSkipDefault(ev)
  },
}

export const tableEffector: Et.EffectorSupportInline = {
  inline: true,
  beforeKeydownSolver,
  htmlEventSolver: {
    // 提前让选区 collapse, 防止 core 中 compositionstart 的选区删除行为将单元格删除
    // 为什么要在这里处理, 而不是在 handler 中判断 payload.targetRange?
    // 因为 Safari 在这个阶段就执行其输入法输入, 并删除选区行为
    // 此外, payload.targetRange 可能非 collapse, 取决于输入法会话期间的最后一次更新上下文时机
    // 该时机可能在输入法会话开始时, 也可能在输入法输入第一个字符后, 这个上一次动作有关
    compositionstart: (_ev, ctx) => {
      if (ctx.commonEtElement?.localName === TableEnum.TableRow && !ctx.selection.isCollapsed) {
        ctx.selection.collapse(true)
        ctx.forceUpdate()
      }
    },
  },
}

/**
 * OneNote 风格插入表格
 */
export const tabToTableEffector: Et.EffectorSupportInline = {
  inline: true,
  keydownSolver: {
    Tab: (ev, ctx) => {
      if (!ctx.selection.isCollapsed || !ctx.isPlainParagraph(ctx.focusParagraph)
        || !ctx.selection.anchorText || ctx.focusParagraph.childElementCount > 0
      ) {
        return
      }
      const data = ctx.focusParagraph.textContent
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
