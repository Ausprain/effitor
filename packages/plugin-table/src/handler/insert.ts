import type { Et } from '@effitor/core'
import { cmd, cr } from '@effitor/core'

import type { EtTableRowElement } from '../EtTableRowElement'

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
  })).handleAndUpdate(cr.caretInStart(firstCell))
}
