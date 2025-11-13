import type { Et } from '@effitor/core'
import { cmd, cr } from '@effitor/core'

import type { EtTableCellElement } from '../EtTableCellElement'
import type { EtTableElement } from '../EtTableElement'

export const replaceTableWithPlainParagraph = (ctx: Et.EditorContext, table: EtTableElement) => {
  const p = ctx.createPlainParagraph()
  return ctx.commonHandler.replaceNode(table, p, cr.caretInNewParagraph(p))
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
