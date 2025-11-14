import type { Et } from '@effitor/core'
import { cmd, cr, dom } from '@effitor/core'

import { EtTableCellElement } from '../EtTableCellElement'
import type { EtTableRowElement } from '../EtTableRowElement'
import { formatTable } from './shared'

export const insertTableRow = (ctx: Et.EditorContext, anchorTr: EtTableRowElement) => {
  const tr = ctx.schema.tableRow.create()
  for (let i = 0; i < anchorTr.childElementCount; i++) {
    const cell = ctx.schema.tableCell.create()
    tr.appendChild(cell)
  }
  const firstCell = tr.firstChild
  if (!firstCell) {
    return false
  }
  return ctx.commandManager.push(cmd.insertNode({
    node: tr,
    execAt: cr.caretOutEnd(anchorTr),
  })).handleAndUpdate(cr.caretEndAuto(firstCell))
}

/**
 * 插入新列
 * @param ctx 编辑器上下文
 * @param anchorTc 锚定单元格
 * @param to 插入位置
 */
export const insertNewColumn = (ctx: Et.EditorContext, anchorTc: EtTableCellElement, to: 'left' | 'right') => {
  // 列数 -> 行元素数组
  const table = anchorTc.parentNode?.parentNode
  if (!ctx.schema.table.is(table)) {
    return
  }
  // 插入新列时, 要保证每行的列数一致
  formatTable(ctx, table)
  const colIndex = dom.prevSiblingCount(anchorTc)
  const cmds: Et.Command[] = []
  const caretFn = to === 'left' ? cr.caretOutStart : cr.caretOutEnd
  for (const row of table.children) {
    const cell = row.children[colIndex] as Et.Node
    if (cell && cell !== anchorTc) {
      cmds.push(cmd.insertNode({
        node: ctx.schema.tableCell.create(),
        execAt: caretFn(cell),
      }))
    }
  }
  const nextCell = ctx.schema.tableCell.create()
  const destCaretRange = cr.caretEndAuto(nextCell)
  cmds.push(cmd.insertNode({
    node: nextCell,
    execAt: caretFn(anchorTc),
  }))
  ctx.commandManager.withTransaction(cmds, destCaretRange)
}
