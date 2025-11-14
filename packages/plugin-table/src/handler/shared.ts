import type { Et } from '@effitor/core'
import { cmd, cr } from '@effitor/core'

import type { EtTableCellElement } from '../EtTableCellElement'
import type { EtTableElement } from '../EtTableElement'
import type { EtTableRowElement } from '../EtTableRowElement'

export const replaceTableWithPlainParagraph = (ctx: Et.EditorContext, table: EtTableElement) => {
  const p = ctx.createPlainParagraph()
  return ctx.commonHandler.replaceNode(table, p, cr.caretInAuto(p))
}

export const addCmdsToEmptyTableCell = (cmds: Et.CommandQueue, cell: EtTableCellElement) => {
  if (!cell.hasChildNodes()) {
    return
  }
  if (cell.childNodes.length === 1) {
    cmds.push(cmd.removeNode({
      node: cell.firstChild as Et.Node,
    }))
    return
  }
  const removeRange = cr.spanRangeAllIn(cell)
  if (removeRange) {
    cmds.push(cmd.removeContent({
      removeRange,
    }))
  }
}

export const collapseTargetRangeOfInputEffectPayload = (payload: Et.InputEffectPayload): Et.InputEffectPayload => {
  let _payload
  if (payload.targetRange.collapsed) {
    _payload = payload
  }
  else {
    _payload = { ...payload }
    _payload.targetRange = _payload.targetRange.toTargetCaret()
  }
  return _payload
}

/**
 * 格式化表格, 保证每行列数一致; 若不一致, 统一格式化到已有最大列数
 */
export const formatTable = (ctx: Et.EditorContext, table: EtTableElement) => {
  const colMap: Record<number, EtTableRowElement[]> = {}
  let maxCol = 0
  for (const row of table.children) {
    if (ctx.schema.tableRow.is(row)) {
      if (row.childElementCount > maxCol) {
        maxCol = row.childElementCount
      }
      if (colMap[row.childElementCount]) {
        colMap[row.childElementCount].push(row)
      }
      else {
        colMap[row.childElementCount] = [row]
      }
    }
  }
  const cols = Object.keys(colMap).map(Number)
  if (cols.length === 1 && cols[0] === maxCol) {
    return
  }
  // 若不一致, 统一格式化到已有最大列数
  const cmds: Et.Command[] = []
  for (const col of cols) {
    if (col === maxCol) {
      continue
    }
    const addCount = maxCol - col
    const rows = colMap[col]
    if (addCount === 1) {
      for (const row of rows) {
        cmds.push(cmd.insertNode({
          node: ctx.schema.tableCell.create(),
          execAt: cr.caretInEnd(row),
        }))
      }
    }
    else {
      for (const row of rows) {
        const content = ctx.createFragment()
        content.append(...new Array(addCount).fill(ctx.schema.tableCell.create()))
        cmds.push(cmd.insertContent({
          content,
          execAt: cr.caretInStart(row),
        }))
      }
    }
  }
  if (cmds.length) {
    ctx.commandManager.withTransaction(cmds)
  }
}
