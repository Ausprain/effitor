import type { Et } from '@effitor/core'
import { cmd, cr, dom, hotkey, useEffectorContext } from '@effitor/core'

import type { EtTableElement } from './EtTableElement'
import { tryToRemoveNextColumn, tryToRemoveNextRow } from './handler/delete'
import { insertNewColumn, insertNewRow } from './handler/insert'

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
    ctx.setSelection(cr.caretEndAuto(upCell))
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
    ctx.setSelection(cr.caretStartAuto(downCell))
    return true
  }
}

// const tryToMoveRowUp = (ctx: Et.EditorContext) => {
//   const row = ctx.commonEtElement?.parentNode as EtTableRowElement | undefined
//   if (!row) {
//     return
//   }
//   const prevRow = row.previousSibling
//   if (!prevRow) {
//     return
//   }
//   // 先移除 prev, 再插入 row 的后边, 因此基于 row 计算的到的插入位置要 -1
//   ctx.commonHandler.moveNode(prevRow, cr.caretOutEnd(row).moved(-1))
// }

// const tryToMoveRowDown = (ctx: Et.EditorContext) => {
//   const row = ctx.commonEtElement?.parentNode as EtTableRowElement | undefined
//   if (!row) {
//     return
//   }
//   const nextRow = row.nextSibling
//   if (!nextRow) {
//     return
//   }
//   ctx.commonHandler.moveNode(nextRow, cr.caretOutStart(row))
// }

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

const setTableAlign = (ctx: Et.EditorContext, align: 'left' | 'center' | 'right') => {
  if (!ctx.selection.isCollapsed) {
    return
  }
  const table = ctx.commonEtElement?.parentNode?.parentNode as EtTableElement | undefined
  if (!ctx.schema.table.is(table)) {
    return
  }
  if (table.tableAlign === align) {
    return
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

// 当且仅当返回 false, 使用默认行为
const tableCellKeyMap: hotkey.ModKeyDownEffectMap = {
  [hotkey.create(hotkey.Key.Enter, hotkey.CtrlCmd)]: 'insertParagraph',
  [hotkey.create(hotkey.Key.Tab, 0)]: tabToNextCellOrInsertNewColumn,
  [hotkey.create(hotkey.Key.Tab, hotkey.Mod.Shift)]: shiftTabToPrevCellOrInsertNewColumn,
  [hotkey.create(hotkey.Key.ArrowUp, 0)]: moveCaretUpInCellOrAbove,
  [hotkey.create(hotkey.Key.ArrowDown, 0)]: moveCaretDownInCellOrBeneath,
  // [hotkey.create(hotkey.Key.ArrowUp, hotkey.Mod.AltOpt)]: tryToMoveRowUp,
  // [hotkey.create(hotkey.Key.ArrowDown, hotkey.Mod.AltOpt)]: tryToMoveRowDown,
  [hotkey.create(hotkey.Key.ArrowLeft, hotkey.Mod.Ctrl | hotkey.Mod.AltOpt)]: tryToMoveColLeft,
  [hotkey.create(hotkey.Key.ArrowRight, hotkey.Mod.Ctrl | hotkey.Mod.AltOpt)]: tryToMoveColRight,
  [hotkey.create(hotkey.Key.C, hotkey.CtrlCmd)]: ctx => setTableAlign(ctx, 'center'),
  [hotkey.create(hotkey.Key.R, hotkey.CtrlCmd)]: ctx => setTableAlign(ctx, 'right'),
  [hotkey.create(hotkey.Key.L, hotkey.CtrlCmd)]: ctx => setTableAlign(ctx, 'left'),
}

export const ectx = useEffectorContext('$table_ctx', {
  tableCellKeyMap,
  insertNewRow,
  insertNewColumn,
  tryToRemoveTableRow: tryToRemoveNextRow,
  tryToRemoveTableColumn: tryToRemoveNextColumn,
})
