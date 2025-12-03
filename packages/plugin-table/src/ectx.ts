import type { Et } from '@effitor/core'
import { cmd, cr, dom, hotkey } from '@effitor/core'
import { HtmlCharEnum } from '@effitor/shared'

import type { EtTableCellElement } from './EtTableCellElement'
import type { EtTableElement } from './EtTableElement'
import { tryToRemoveNextColumn, tryToRemoveNextRow } from './handler/delete'
import { insertNewColumn, insertNewRow } from './handler/insert'

const checkInValidTableCell = (ctx: Et.EditorContext): [EtTableCellElement, EtTableElement] | [null, null] => {
  const cell = ctx.commonEtElement as EtTableCellElement | null
  const table = cell?.parentNode?.parentNode as EtTableElement | null
  if (ctx.schema.tableCell.is(cell)
    && ctx.schema.table.is(table)) {
    return [cell, table]
  }
  return [null, null]
}

const tabToNextCellOrInsertNewColumn = (ctx: Et.EditorContext) => {
  const [cell] = checkInValidTableCell(ctx)
  if (!cell) {
    return false
  }
  ctx.commandManager.commit()
  const nextCell = cell.nextSibling
  if (nextCell) {
    ctx.setSelection(cr.caretInEnd(nextCell))
    return
  }
  insertNewColumn(ctx, cell, 'right')
}

const shiftTabToPrevCellOrInsertNewColumn = (ctx: Et.EditorContext) => {
  const [cell] = checkInValidTableCell(ctx)
  if (!cell) {
    return false
  }
  ctx.commandManager.commit()
  const prevCell = cell.previousSibling
  if (prevCell) {
    ctx.setSelection(cr.caretInEnd(prevCell))
    return
  }
  insertNewColumn(ctx, cell, 'left')
}

const moveCaretUpInCellOrAbove = (ctx: Et.EditorContext) => {
  const [cell] = checkInValidTableCell(ctx)
  if (!cell) {
    return false
  }
  if (!ctx.selection.isSelectionAtFirstLineOf(cell)) {
    return false
  }
  const prevRow = cell.parentNode?.previousSibling
  if (!prevRow) {
    ctx.focusToPrevParagraph()
    return true
  }
  if (!ctx.schema.tableRow.is(prevRow)) {
    return true
  }
  const upCell = prevRow.children[dom.prevSiblingCount(cell)]
  if (ctx.schema.tableCell.is(upCell)) {
    ctx.setSelection(cr.caretEndAuto(upCell))
    return true
  }
}

const moveCaretDownInCellOrBeneath = (ctx: Et.EditorContext) => {
  const [cell] = checkInValidTableCell(ctx)
  if (!cell) {
    return false
  }
  if (!ctx.selection.isSelectionAtLastLineOf(cell)) {
    return false
  }
  const nextRow = cell.parentNode?.nextSibling
  if (!nextRow) {
    ctx.focusToNextParagraph()
    return true
  }
  if (!ctx.schema.tableRow.is(nextRow)) {
    return true
  }
  const downCell = nextRow.children[dom.prevSiblingCount(cell)]
  if (ctx.schema.tableCell.is(downCell)) {
    ctx.setSelection(cr.caretStartAuto(downCell))
    return true
  }
}

const tryToMoveColLeft = (ctx: Et.EditorContext) => {
  const [cell, table] = checkInValidTableCell(ctx)
  if (!cell?.previousSibling) {
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
      ctx.commandManager.handleMoveNode(prev, cr.caretOutEnd(curr).moved(-1))
    }
    return true
  })
}

const tryToMoveColRight = (ctx: Et.EditorContext) => {
  const [cell, table] = checkInValidTableCell(ctx)
  if (!cell?.nextSibling) {
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
      ctx.commandManager.handleMoveNode(next, cr.caretOutStart(curr))
    }
    return true
  })
}

const setTableAlign = (ctx: Et.EditorContext, align: 'left' | 'center' | 'right') => {
  const [cell, table] = checkInValidTableCell(ctx)
  if (!cell) {
    return false
  }
  if (table.tableAlign === align) {
    return false
  }
  ctx.commandManager.commitNextHandle(true)
  ctx.commandManager.push(cmd.functional({
    meta: {
      _align: align as string,
      _table: table,
    },
    execCallback() {
      const prevAlign = this.meta._table.tableAlign
      table.tableAlign = this.meta._align
      this.meta._align = prevAlign
    },
    undoCallback(ctx) {
      this.execCallback(ctx)
    },
  })).handle()
}

const toggleTableEven = (ctx: Et.EditorContext) => {
  const [_, table] = checkInValidTableCell(ctx)
  if (!table) {
    return false
  }
  ctx.commandManager.commitNextHandle(true)
  return ctx.commandManager.push(cmd.functional({
    meta: {
      _table: table,
    },
    execCallback() {
      this.meta._table.tableEven = !this.meta._table.tableEven
    },
    undoCallback(ctx) {
      this.execCallback(ctx)
    },
  })).handle()
}

// 当且仅当返回 false, 使用默认行为
export const tableCellKeyMap: hotkey.ModKeyDownEffectMap = {
  // 覆盖默认的 cmd+enter 快捷键行为 (默认行为只是插入一个当前类型段落, 而表格还需要插入相同数量的单元格)
  [hotkey.create('Enter', hotkey.CtrlCmd)]: 'insertParagraph',
  [hotkey.create('Tab', 0)]: tabToNextCellOrInsertNewColumn,
  [hotkey.create('Tab', hotkey.Mod.Shift)]: shiftTabToPrevCellOrInsertNewColumn,
  [hotkey.create('ArrowUp', 0)]: moveCaretUpInCellOrAbove,
  [hotkey.create('ArrowDown', 0)]: moveCaretDownInCellOrBeneath,
  [hotkey.create('ArrowLeft', hotkey.Mod.Ctrl | hotkey.Mod.AltOpt)]: tryToMoveColLeft,
  [hotkey.create('ArrowRight', hotkey.Mod.Ctrl | hotkey.Mod.AltOpt)]: tryToMoveColRight,
  [hotkey.create('KeyC', hotkey.Mod.AltOpt)]: ctx => setTableAlign(ctx, 'center'),
  [hotkey.create('KeyR', hotkey.Mod.AltOpt)]: ctx => setTableAlign(ctx, 'right'),
  [hotkey.create('KeyL', hotkey.Mod.AltOpt)]: ctx => setTableAlign(ctx, 'left'),
  [hotkey.create('KeyE', hotkey.Mod.AltOpt)]: toggleTableEven,
}

export const tableActions = {
  /**
   * 尝试将当前段落转为表格, 若内容超过 50 个字符, 则转为在当前段落后插入表格
   */
  markTable: (ctx: Et.EditorContext) => {
    const currP = ctx.focusParagraph
    if (!ctx.isPlainParagraph(currP)) {
      return
    }
    const text = currP.textContent
    if (text.length > 50) {
      ctx.effectInvoker.invoke(currP, 'insertTableAfterParagraph', ctx, {
        paragraph: currP,
      })
      return
    }
    ctx.effectInvoker.invoke(currP, 'replaceParagraphWithTable', ctx, {
      data: text.replaceAll(HtmlCharEnum.ZERO_WIDTH_SPACE, ''),
      paragraph: currP,
    })
  },
  tableAlignCenter: (ctx: Et.EditorContext) => setTableAlign(ctx, 'center'),
  tableAlignLeft: (ctx: Et.EditorContext) => setTableAlign(ctx, 'left'),
  tableAlignRight: (ctx: Et.EditorContext) => setTableAlign(ctx, 'right'),
  tryToMoveColLeft,
  tryToMoveColRight,
  insertNewRowTop: (ctx: Et.EditorContext) => {
    if (ctx.schema.tableRow.is(ctx.focusEtElement?.parentNode)) {
      insertNewRow(ctx, ctx.focusEtElement.parentNode, 'top', false)
    }
  },
  insertNewRowBottom: (ctx: Et.EditorContext) => {
    if (ctx.schema.tableRow.is(ctx.focusEtElement?.parentNode)) {
      insertNewRow(ctx, ctx.focusEtElement.parentNode, 'bottom', false)
    }
  },
  insertNewColumnLeft: (ctx: Et.EditorContext) => {
    if (ctx.schema.tableCell.is(ctx.focusEtElement)) {
      insertNewColumn(ctx, ctx.focusEtElement, 'left', false)
    }
  },
  insertNewColumnRight: (ctx: Et.EditorContext) => {
    if (ctx.schema.tableCell.is(ctx.focusEtElement)) {
      insertNewColumn(ctx, ctx.focusEtElement, 'right', false)
    }
  },
  tryToRemoveNextRow: (ctx: Et.EditorContext) => {
    if (ctx.schema.tableRow.is(ctx.focusEtElement?.parentNode)) {
      tryToRemoveNextRow(ctx, ctx.focusEtElement.parentNode)
    }
  },
  tryToRemoveNextColumn: (ctx: Et.EditorContext) => {
    if (ctx.schema.tableCell.is(ctx.focusEtElement)) {
      tryToRemoveNextColumn(ctx, ctx.focusEtElement)
    }
  },
}
export type TableActionMap = typeof tableActions
