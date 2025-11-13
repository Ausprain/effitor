import type { Et } from '@effitor/core'
import { cmd, cr, dom, hotkey, useEffectorContext } from '@effitor/core'

import type { EtTableCellElement } from './EtTableCellElement'
import type { EtTableElement } from './EtTableElement'
import type { EtTableRowElement } from './EtTableRowElement'

/**
 * 格式化表格, 保证每行列数一致; 若不一致, 统一格式化到已有最大列数
 */
const formatTable = (ctx: Et.EditorContext, table: EtTableElement) => {
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

/**
 * 插入新列
 * @param ctx 编辑器上下文
 * @param anchorTc 锚定单元格
 * @param to 插入位置
 */
const insertNewColumn = (ctx: Et.EditorContext, anchorTc: EtTableCellElement, to: 'left' | 'right') => {
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
  const destCaretRange = cr.caretInStart(nextCell)
  cmds.push(cmd.insertNode({
    node: nextCell,
    execAt: caretFn(anchorTc),
  }))
  ctx.commandManager.withTransaction(cmds, destCaretRange)
}

const tabToNextCellOrInsertNewColumn = (ctx: Et.EditorContext) => {
  if (!ctx.schema.tableCell.is(ctx.commonEtElement)) {
    return false
  }
  ctx.commandManager.commit()
  const nextCell = ctx.commonEtElement.nextSibling
  if (nextCell) {
    ctx.setSelection(cr.caretInEnd(nextCell))
    return
  }
  insertNewColumn(ctx, ctx.commonEtElement, 'right')
}

const shiftTabToPrevCellOrInsertNewColumn = (ctx: Et.EditorContext) => {
  if (!ctx.schema.tableCell.is(ctx.commonEtElement)) {
    return false
  }
  ctx.commandManager.commit()
  const prevCell = ctx.commonEtElement.previousSibling
  if (prevCell) {
    ctx.setSelection(cr.caretInEnd(prevCell))
    return
  }
  insertNewColumn(ctx, ctx.commonEtElement, 'left')
}

const moveCaretUpInCellOrAbove = (ctx: Et.EditorContext) => {
  if (!ctx.schema.tableCell.is(ctx.commonEtElement)) {
    return false
  }
  if (!ctx.selection.isSelectionAtFirstLineOf(ctx.commonEtElement)) {
    return false
  }
  const prevRow = ctx.commonEtElement.parentNode?.previousSibling
  if (!prevRow) {
    ctx.focusToPrevParagraph()
    return true
  }
  if (!ctx.schema.tableRow.is(prevRow)) {
    return true
  }
  const upCell = prevRow.children[dom.prevSiblingCount(ctx.commonEtElement)]
  if (ctx.schema.tableCell.is(upCell)) {
    ctx.setSelection(cr.caretInEnd(upCell).toTextAffinity())
    return true
  }
}

const moveCaretDownInCellOrBeneath = (ctx: Et.EditorContext) => {
  if (!ctx.schema.tableCell.is(ctx.commonEtElement)) {
    return false
  }
  if (!ctx.selection.isSelectionAtLastLineOf(ctx.commonEtElement)) {
    return false
  }
  const nextRow = ctx.commonEtElement.parentNode?.nextSibling
  if (!nextRow) {
    ctx.focusToNextParagraph()
    return true
  }
  if (!ctx.schema.tableRow.is(nextRow)) {
    return true
  }
  const downCell = nextRow.children[dom.prevSiblingCount(ctx.commonEtElement)]
  if (ctx.schema.tableCell.is(downCell)) {
    ctx.setSelection(cr.caretInStart(downCell).toTextAffinity())
    return true
  }
}

const tryToMoveRowUp = (ctx: Et.EditorContext) => {
  const row = ctx.commonEtElement?.parentNode as EtTableRowElement | undefined
  if (!row) {
    return
  }
  const prevRow = row.previousSibling
  if (!prevRow) {
    return
  }
  // 先移除 prev, 再插入 row 的后边, 因此基于 row 计算的到的插入位置要 -1
  ctx.commonHandler.moveNode(prevRow, cr.caretOutEnd(row).moved(-1))
}

const tryToMoveRowDown = (ctx: Et.EditorContext) => {
  const row = ctx.commonEtElement?.parentNode as EtTableRowElement | undefined
  if (!row) {
    return
  }
  const nextRow = row.nextSibling
  if (!nextRow) {
    return
  }
  ctx.commonHandler.moveNode(nextRow, cr.caretOutStart(row))
}

const tryToMoveColLeft = (ctx: Et.EditorContext) => {
  const cell = ctx.commonEtElement
  if (!cell?.previousSibling) {
    return
  }
  const table = cell?.parentNode?.parentNode as EtTableElement | undefined
  if (!table) {
    return
  }
  const index = dom.prevSiblingCount(cell)
  ctx.commandManager.withTransactionFn(() => {
    for (const row of table.childNodes) {
      const curr = row.childNodes.item(index)
      const prev = curr.previousSibling
      if (!prev) {
        continue
      }
      ctx.commonHandler.moveNode(prev, cr.caretOutEnd(curr).moved(-1))
    }
    return true
  })
}

const tryToMoveColRight = (ctx: Et.EditorContext) => {
  const cell = ctx.commonEtElement
  if (!cell?.nextSibling) {
    return
  }
  const table = cell?.parentNode?.parentNode as EtTableElement | undefined
  if (!table) {
    return
  }
  const index = dom.prevSiblingCount(cell)
  ctx.commandManager.withTransactionFn(() => {
    for (const row of table.childNodes) {
      const curr = row.childNodes.item(index)
      const next = curr.nextSibling
      if (!next) {
        continue
      }
      ctx.commonHandler.moveNode(next, cr.caretOutStart(curr))
    }
    return true
  })
}

// 当且仅当返回 false, 使用默认行为
const tableCellKeyMap: hotkey.ModKeyDownEffectMap = {
  [hotkey.create(hotkey.Key.Enter, hotkey.CtrlCmd)]: 'insertParagraph',
  [hotkey.create(hotkey.Key.Tab, 0)]: tabToNextCellOrInsertNewColumn,
  [hotkey.create(hotkey.Key.Tab, hotkey.Mod.Shift)]: shiftTabToPrevCellOrInsertNewColumn,
  [hotkey.create(hotkey.Key.ArrowUp, 0)]: moveCaretUpInCellOrAbove,
  [hotkey.create(hotkey.Key.ArrowDown, 0)]: moveCaretDownInCellOrBeneath,
  [hotkey.create(hotkey.Key.ArrowUp, hotkey.Mod.AltOpt)]: tryToMoveRowUp,
  [hotkey.create(hotkey.Key.ArrowDown, hotkey.Mod.AltOpt)]: tryToMoveRowDown,
  [hotkey.create(hotkey.Key.ArrowLeft, hotkey.Mod.Ctrl | hotkey.Mod.AltOpt)]: tryToMoveColLeft,
  [hotkey.create(hotkey.Key.ArrowRight, hotkey.Mod.Ctrl | hotkey.Mod.AltOpt)]: tryToMoveColRight,
}

export const ectx = useEffectorContext('$table_ctx', {
  tableCellKeyMap,
  insertNewColumn,
})
