/**
 * 表格的 handler 需要处理几个维度
 *
 * 1. 光标状态
 *    光标必定在 tc 内
 *        insertParagraph: 插入相同列数的 tr, 光标置于开头
 *        insertLineBreak: 在当前位置插入 br
 * 2. 选区状态
 *    2.1 commonEtElement 是 tr
 *        insertParagraph: 插入相同列数的 tr, 光标置于开头
 *        deleteContentBackward(及其他): 清空完全选择的 tc, 删除被部分选择的部分
 *    2.2 commonEtElement 是 tc
 *        insertParagraph: 插入相同列数的 tr, 光标置于开头
 *        insertLineBreak: 删除选择内容, 插入 br
 *    2.3 commonEtElement 是 table
 *        现阶段不会发生, 因为 table 被设置为了 component, 不可编辑;
 *        而里边的每一个 tr 独立可编辑, 用户主动的选区无法跨越 tr 边界
 *
 * 表格内插入内容(片段)的问题, 目前核心 `core` 的实现中, 会尝试拆分段落下最外层子节点, 这会导致一个 tc 变成 2 个
 * 这不符合表格直觉;
 * 妥协方案: 目前表格内插入内容(片段)会强制转为纯文本.
 *
 */

import type { Et } from '@effitor/core'
import { cr } from '@effitor/core'

import { TableEnum } from '../config'
import type { EtTableCellElement } from '../EtTableCellElement'
import { EtTableRowElement } from '../EtTableRowElement'
import { backspaceToRemoveEmptyRowOrFocusToPrevRow, checkEmptyCellAndFocusToPrevOrNext, deleteInTableRow, deleteToRemoveRowEmptyOrFocusToNextRow } from './delete'
import { insertTableRowOrEnterNewParagraph } from './insert'
import { collapseTargetRangeOfInputEffectPayload } from './shared'

export const tableHandler: Et.EffectHandler = {
  replaceParagraphWithTable: (ctx, { data, paragraph }) => {
    if (!data) {
      data = ''
    }
    const el = ctx.schema.table.create(true)
    const cell = el.firstChild?.firstChild as EtTableCellElement
    if (!cell) {
      return false
    }
    cell.textContent = data
    let destCaretRange
    if (data) {
      const nextCell = ctx.schema.tableCell.create()
      ;(el.firstChild as EtTableRowElement).appendChild(nextCell)
      destCaretRange = cr.caretInStart(nextCell)
    }
    else {
      destCaretRange = cr.caretInEnd(cell)
    }
    return ctx.commonHandler.replaceNode(paragraph, el, destCaretRange)
  },
}

// export const inTableHandler: Et.EffectHandler = {}
export const inTableRowHandler: Et.EffectHandler = {
  EinsertText(ctx, payload) {
    return this.superHandler.EinsertText?.(ctx, collapseTargetRangeOfInputEffectPayload(payload))
  },
  // EinsertCompositionText(ctx, payload) {
  //   return this.superHandler.EinsertCompositionText?.(ctx, collapseTargetRangeOfInputEffectPayload(payload))
  // },
  EinsertParagraph(ctx, payload) {
    if (!ctx.schema.tableRow.is(payload.targetRange.commonEtElement)) {
      return this.superHandler.EinsertParagraph?.(ctx, payload)
    }
    return insertTableRowOrEnterNewParagraph(ctx, payload.targetRange.commonEtElement)
  },
  // 触发 tableRow 的删除 handler, 则选区必定 range, 且 commonEtElement 为 tableRow
  EdeleteContentBackward: (ctx, payload) => deleteInTableRow(ctx, payload.targetRange, true),
  EdeleteContentForward: (ctx, payload) => deleteInTableRow(ctx, payload.targetRange, false),
  EdeleteWordBackward: (ctx, payload) => deleteInTableRow(ctx, payload.targetRange, true),
  EdeleteWordForward: (ctx, payload) => deleteInTableRow(ctx, payload.targetRange, false),
}
export const inTableCellHandler: Et.EffectHandler = {
  EinsertParagraph(ctx, payload) {
    const tr = ctx.body.findInclusiveParentByName(
      payload.targetRange.commonEtElement,
      TableEnum.TableRow,
    )
    if (!tr || !ctx.schema.tableRow.is(tr)) {
      return this.superHandler.EinsertParagraph?.(ctx, payload)
    }
    return insertTableRowOrEnterNewParagraph(ctx, tr)
  },
  EdeleteContentBackward(ctx, payload) {
    if (checkEmptyCellAndFocusToPrevOrNext(ctx, payload.targetRange, true)) {
      return
    }
    return this.superHandler.EdeleteContentBackward?.(ctx, payload)
  },
  EdeleteContentForward(ctx, payload) {
    if (checkEmptyCellAndFocusToPrevOrNext(ctx, payload.targetRange, false)) {
      return
    }
    return this.superHandler.EdeleteContentForward?.(ctx, payload)
  },
  EdeleteWordBackward(ctx, payload) {
    if (checkEmptyCellAndFocusToPrevOrNext(ctx, payload.targetRange, true)) {
      return
    }
    return this.superHandler.EdeleteWordBackward?.(ctx, payload)
  },
  EdeleteWordForward(ctx, payload) {
    if (checkEmptyCellAndFocusToPrevOrNext(ctx, payload.targetRange, false)) {
      return
    }
    return this.superHandler.EdeleteWordForward?.(ctx, payload)
  },
  DeleteBackwardAtParagraphStart(ctx, tc) {
    if (ctx.schema.tableRow.is(tc.anchorParagraph)) {
      backspaceToRemoveEmptyRowOrFocusToPrevRow(ctx, tc.anchorParagraph)
      return true
    }
    return this.superHandler.DeleteBackwardAtParagraphStart?.(ctx, tc)
  },
  DeleteForwardAtParagraphEnd(ctx, tc) {
    if (ctx.schema.tableRow.is(tc.anchorParagraph)) {
      deleteToRemoveRowEmptyOrFocusToNextRow(ctx, tc.anchorParagraph)
      return true
    }
    return this.superHandler.DeleteForwardAtParagraphEnd?.(ctx, tc)
  },
}
