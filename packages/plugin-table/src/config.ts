import type { Et } from '@effitor/core'
import { etcode } from '@effitor/core'

import type { EtTableCellElement } from './EtTableCellElement'
import type { EtTableElement } from './EtTableElement'
import type { EtTableRowElement } from './EtTableRowElement'

export const enum TableEnum {
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
    [TableEnum.Talbe]: EtTableElement
    [TableEnum.TableRow]: EtTableRowElement
    [TableEnum.TableCell]: EtTableCellElement
  }
  interface EffectHandleDeclaration {
    replaceParagraphWithTable: Et.EffectHandle<{
      /** 第一个单元格的内容, 默认空字符串 */
      data?: string
      paragraph: Et.EtParagraphElement
    }>
  }
}

export const ET_TABLE_CODE = etcode.get(TableEnum.Talbe)
export const ET_TABLE_ROW_CODE = etcode.get(TableEnum.TableRow)
export const ET_TABLE_CELL_CODE = etcode.get(TableEnum.TableCell)
