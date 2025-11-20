import type { Et } from '@effitor/core'
import { etcode } from '@effitor/core'

import type { EtTableCellElement } from './EtTableCellElement'
import type { EtTableElement } from './EtTableElement'
import type { EtTableRowElement } from './EtTableRowElement'

export const enum TableName {
  Talbe = 'et-table',
  TableRow = 'et-tr',
  TableCell = 'et-tc',
}

declare module '@effitor/core' {
  interface EditorSchema {
    readonly table: typeof EtTableElement
    readonly tableRow: typeof EtTableRowElement
    readonly tableCell: typeof EtTableCellElement
  }
  interface DefinedEtElementMap {
    [TableName.Talbe]: EtTableElement
    [TableName.TableRow]: EtTableRowElement
    [TableName.TableCell]: EtTableCellElement
  }
  interface EffectHandleDeclaration {
    replaceParagraphWithTable: Et.EffectHandle<{
      /** 第一个单元格的内容, 默认空字符串 */
      data?: string
      paragraph: Et.EtParagraphElement
    }>
    insertTableAfterParagraph: Et.EffectHandle<{
      paragraph: Et.EtParagraphElement
    }>
  }
}

export const TABLE_ET_TYPE = etcode.get(TableName.Talbe)
export const TABLE_ROW_ET_TYPE = etcode.get(TableName.TableRow)
export const TABLE_CELL_ET_TYPE = etcode.get(TableName.TableCell)
