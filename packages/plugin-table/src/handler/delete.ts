import type { Et } from '@effitor/core'
import { cmd, cr, dom } from '@effitor/core'

import { EtTableCellElement } from '../EtTableCellElement'
import type { EtTableRowElement } from '../EtTableRowElement'
import { addCmdsToEmptyTableCell, replaceTableWithPlainParagraph } from './shared'

const checkRemoveTable = (ctx: Et.EditorContext, anchorTr: EtTableRowElement) => {
  const table = anchorTr.parentNode
  if (!ctx.schema.table.is(table)) {
    return false
  }
  if (table.childNodes.length === 1) {
    replaceTableWithPlainParagraph(ctx, table)
    return true
  }
  return false
}

export const backspaceToRemoveEmptyRowOrFocusToPrevRow = (ctx: Et.EditorContext, anchorTr: EtTableRowElement) => {
  const lastCell = anchorTr.previousSibling?.lastChild
  if (dom.isEmptyContentNode(anchorTr)) {
    if (checkRemoveTable(ctx, anchorTr)) {
      return
    }
    if (!lastCell) {
      return
    }
    ctx.commandManager.handleRemoveNode(anchorTr, cr.caretInEnd(lastCell))
    return
  }
  if (!lastCell) {
    return
  }
  ctx.setSelection(cr.caretInEnd(lastCell).toTextAffinity())
}

export const deleteToRemoveRowEmptyOrFocusToNextRow = (ctx: Et.EditorContext, anchorTr: EtTableRowElement) => {
  const firstCell = anchorTr.nextSibling?.firstChild
  if (dom.isEmptyContentNode(anchorTr)) {
    if (checkRemoveTable(ctx, anchorTr)) {
      return
    }
    if (!firstCell) {
      return
    }
    ctx.commandManager.handleRemoveNode(anchorTr, cr.caretInStart(firstCell))
    return
  }
  if (!firstCell) {
    return
  }
  ctx.setSelection(cr.caretInStart(firstCell).toTextAffinity())
}

export const backspaceAtCellStart = (ctx: Et.EditorContext, anchorTc: EtTableCellElement) => {
  const prevCell = anchorTc.previousSibling
  const currRow = anchorTc.parentElement
  if (!ctx.schema.tableRow.is(currRow)) {
    return
  }
  if (!prevCell) {
    return backspaceToRemoveEmptyRowOrFocusToPrevRow(ctx, currRow)
  }
  ctx.setSelection(cr.caretInEnd(prevCell).toTextAffinity())
}

export const deleteAtCellEnd = (ctx: Et.EditorContext, anchorTc: EtTableCellElement) => {
  const nextCell = anchorTc.nextSibling
  const currRow = anchorTc.parentElement
  if (!ctx.schema.tableRow.is(currRow)) {
    return
  }
  if (!nextCell) {
    return deleteToRemoveRowEmptyOrFocusToNextRow(ctx, currRow)
  }
  ctx.setSelection(cr.caretInStart(nextCell).toTextAffinity())
}

export const deleteInTableRow = (ctx: Et.EditorContext, tr: Et.ValidTargetSelection, isBackward: boolean) => {
  if (tr.collapsed || !ctx.schema.tableRow.is(tr.commonEtElement)) {
    return
  }
  const startTc = tr.getStartPartialNode('paragraph')
  const endTc = tr.getEndPartialNode('paragraph')
  if (!startTc || !endTc || !ctx.schema.tableCell.is(startTc) || !ctx.schema.tableCell.is(endTc)) {
    return
  }
  if (startTc === endTc) {
    // 这应该不会发生, 因为选区两端在同一个单元格内的话, commonEtElement 不会是 tableRow
    return
  }
  const r1 = tr.DOMRange.cloneRange()
  const r2 = r1.cloneRange()
  r1.setEnd(startTc, startTc.childNodes.length)
  r2.setStart(endTc, 0)
  const tr1 = ctx.selection.createTargetRange(r1)
  const tr2 = ctx.selection.createTargetRange(r2)
  if (!tr1 || !tr2 || !ctx.isUpdated()) {
    return
  }

  // 删除中间单元格的内容
  const cmds: Et.Command[] = []
  let needEmptyCell = startTc.nextSibling
  while (needEmptyCell && needEmptyCell !== endTc) {
    addCmdsToEmptyTableCell(cmds, needEmptyCell as EtTableCellElement)
    needEmptyCell = needEmptyCell.nextSibling
  }
  // 删除两端单元格内容
  ctx.commandManager.withTransactionFn((cm) => {
    cm.push(...cmds).handle()
    if (isBackward) {
      ctx.getEtHandler(endTc).EdeleteContentBackward?.(ctx, { targetRange: tr2 })
      ctx.getEtHandler(startTc).EdeleteContentBackward?.(ctx, { targetRange: tr1 })
    }
    else {
      ctx.getEtHandler(startTc).EdeleteContentForward?.(ctx, { targetRange: tr1 })
      ctx.getEtHandler(endTc).EdeleteContentForward?.(ctx, { targetRange: tr2 })
    }
    return true
  })
}
/**
 * 判断是否为空单元格并将焦点移动到上一个或下一个单元格
 * @returns 是否移动了焦点
 */
export const checkEmptyCellAndFocusToPrevOrNext = (
  ctx: Et.EditorContext, tr: Et.ValidTargetSelection, isBackward: boolean,
) => {
  if (tr.collapsed && ctx.schema.tableCell.is(tr.commonEtElement)
    && dom.isEmptyContentNode(tr.commonEtElement)
  ) {
    ctx.commandManager.commitNextHandle()
    if (checkDeleteEmptyCellInSingleRowTable(ctx, tr.commonEtElement, isBackward)) {
      return true
    }
    if (isBackward) {
      const prevCell = tr.commonEtElement.previousSibling
      if (prevCell) {
        ctx.setSelection(cr.caretInEnd(prevCell).toTextAffinity())
      }
      else if (ctx.schema.tableRow.is(tr.anchorParagraph)) {
        backspaceToRemoveEmptyRowOrFocusToPrevRow(ctx, tr.anchorParagraph)
      }
    }
    else {
      const nextCell = tr.commonEtElement.nextSibling
      if (nextCell) {
        ctx.setSelection(cr.caretInStart(nextCell).toTextAffinity())
      }
      else if (ctx.schema.tableRow.is(tr.anchorParagraph)) {
        deleteToRemoveRowEmptyOrFocusToNextRow(ctx, tr.anchorParagraph)
      }
    }
    return true
  }
  return false
}

const checkDeleteEmptyCellInSingleRowTable = (
  ctx: Et.EditorContext, emptyCell: EtTableCellElement, isBackward: boolean,
) => {
  if (emptyCell.parentNode?.parentNode?.childNodes?.length !== 1) {
    return false
  }
  if (isBackward) {
    const prevCell = emptyCell.previousSibling
    if (!prevCell) {
      return false
    }
    ctx.commandManager.handleRemoveNode(emptyCell, cr.caretInEnd(prevCell))
  }
  else {
    const nextCell = emptyCell.nextSibling
    if (!nextCell) {
      return false
    }
    ctx.commandManager.handleRemoveNode(emptyCell, cr.caretInStart(nextCell))
  }
  return true
}

export const tryToRemoveNextRow = (ctx: Et.EditorContext, anchorTr?: EtTableRowElement) => {
  const nextRow = anchorTr?.nextSibling
  if (!ctx.schema.tableRow.is(nextRow)) {
    return
  }
  ctx.commandManager.commitNextHandle(true)
  ctx.commandManager.handleRemoveNode(nextRow, false)
}
export const tryToRemoveNextColumn = (ctx: Et.EditorContext, anchorTc?: EtTableCellElement) => {
  const nextCell = anchorTc?.nextSibling
  const table = anchorTc?.parentNode?.parentNode
  if (!ctx.schema.tableCell.is(nextCell) || !ctx.schema.table.is(table)) {
    return
  }
  const index = dom.prevSiblingCount(nextCell)
  const cmds: Et.Command[] = []
  for (const row of table.childNodes) {
    const curr = row.childNodes.item(index)
    if (!curr) {
      continue
    }
    cmds.push(cmd.removeNode({ node: curr }))
  }
  if (!cmds.length) {
    return
  }
  ctx.commandManager.commitNextHandle(true)
  ctx.commandManager.push(...cmds).handle()
}
