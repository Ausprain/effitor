import type { Et } from '@effitor/core'
import { etcode } from '@effitor/core'

import type { TableActionMap } from './ectx'
import type { EtTableCellElement } from './EtTableCellElement'
import type { EtTableElement } from './EtTableElement'
import type { EtTableRowElement } from './EtTableRowElement'

/**
```
|th1|th2|th3|
|---|---|---|   // align
|td1|td2|td3|{meta-row1}
|td1|   |td3|{meta-row2}
|td1|
{meta-table}
```
以上 markdown 解析出来的 ast 关键结构为：
table {
  align: [null, null, null],
  children: [
    tableRow { children: Array(3) },  // th
    tableRow { children: Array(4) },
    tableRow { children: Array(4) },
    tableRow { children: Array(1) },
    tableRow { children: Array(1) },
  ]
}
于是，可以有以下约定：
1. 根据 align 的长度，确定单元格列数；
2. 最后一行若列数为 1，尝试解析 json，若成功，则为表格元数据，并舍弃该行
3. 其他行，小于 align 长度的，填充空单元；
   超过 align 长度的，舍弃多余单元格，并取舍弃的第一项尝试解析 json，若成功，则为行元数据

通过元数据，实现带样式的表格的 markdown 互转

*/

/** 表格元数据 */
export interface TableMeta {
  head?: 'r' | 'c' | 'rc'
  even?: boolean
  align?: 'left' | 'center' | 'right'
}
/** 表格行元数据 */
export interface TableRowMeta {
  // TODO
}

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
