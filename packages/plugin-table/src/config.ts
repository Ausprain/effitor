import type { Et } from '@effitor/core'
import { etcode } from '@effitor/core'

import type { TableActionMap } from './ectx'
import type { EtTableCellElement } from './EtTableCellElement'
import type { EtTableElement } from './EtTableElement'
import type { EtTableRowElement } from './EtTableRowElement'

export const enum TableName {
  Talbe = 'et-table',
  TableRow = 'et-tr',
  TableCell = 'et-tc',
}

declare module '@effitor/core' {
  interface DefinedEtElementMap {
    [TableName.Talbe]: EtTableElement
    [TableName.TableRow]: EtTableRowElement
    [TableName.TableCell]: EtTableCellElement
  }
  interface EditorSchema {
    readonly table: typeof EtTableElement
    readonly tableRow: typeof EtTableRowElement
    readonly tableCell: typeof EtTableCellElement
  }
  interface EditorActions {
    /** table plugin actions */
    table: TableActionMap
  }

  interface EffectHandleDeclaration {
    replaceParagraphWithTable: Et.EffectHandle<{
      /** 第一个单元格的内容, 如果为 null，则将段落内容移入第一个单元格；调用者需确保段落内容允许插入单元格（符合效应规则） */
      data: string | null
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
