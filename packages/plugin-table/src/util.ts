import type { Et } from '@effitor/core'

import type { TableMeta, TableRowMeta } from './config'

export const parseTableMeta = (lastRow: Et.MdastNode<'tableRow'>): TableMeta | null => {
  if (lastRow?.type !== 'tableRow') {
    return null
  }
  // 最后一行除第一个单元格外非空，不视为 meta 行
  if (lastRow.children.length !== 1) {
    for (let i = 1; i < lastRow.children.length; i++) {
      if (lastRow.children[i]?.children.length) {
        return null
      }
    }
  }
  const metaCell = lastRow.children[0] as Et.MdastNode<'tableCell'>
  if (metaCell.type !== 'tableCell' || metaCell.children.length !== 1) {
    return null
  }
  const metaText = metaCell.children[0] as Et.MdastNode<'text'>
  if (metaText.type !== 'text') {
    return null
  }
  try {
    const meta = JSON.parse(metaText.value) as TableMeta
    return meta
  }
  catch {
    return null
  }
}

export const parseTableRowMeta = (extraCell: Et.MdastNode<'tableCell'>): TableRowMeta | null => {
  if (extraCell.children.length !== 1) {
    return null
  }
  const metaText = extraCell.children[0] as Et.MdastNode<'text'>
  if (metaText.type !== 'text') {
    return null
  }
  try {
    const meta = JSON.parse(metaText.value) as TableRowMeta
    return meta
  }
  catch {
    return null
  }
}
