import type {
  CreateMdastNode,
  EditorContext,
  EtCaret,
  HtmlToEtElementTransformerMap,
  MdastNodeHandlerMap,
  ToMdastResult,
} from '@effitor/core'
import { cr, EtParagraph } from '@effitor/core'

import { TABLE_CELL_ET_TYPE, TABLE_ROW_ET_TYPE, TableName } from './config'
import { EtTableCellElement } from './EtTableCellElement'

export class EtTableRowElement extends EtParagraph {
  static readonly elName = TableName.TableRow
  static readonly etType = super.etType | TABLE_ROW_ET_TYPE
  static readonly inEtType = TABLE_CELL_ET_TYPE

  connectedCallback(): void {
    this.setAttribute('contenteditable', '')
  }

  /**
   * 创建表格行元素
   * 如果withCell为true, 则返回结果为
   * ```html
   * <et-tr>
   *   <et-tc></et-tc>
   * </et-tr>
   * ```
   * 否则，返回：`<et-tr></et-tr>`
   * @param withCell 是否自带一个单元格, 默认为false
   */
  static create(withCell = false) {
    const el = document.createElement(this.elName)
    if (withCell) {
      const cell = EtTableCellElement.create()
      el.appendChild(cell)
    }
    return el
  }

  innerStartEditingBoundary(): EtCaret {
    const firstCell = this.firstChild
    if (!firstCell) {
      return cr.caretInStart(this)
    }
    return cr.caretInStart(firstCell)
  }

  innerEndEditingBoundary(): EtCaret {
    const lastCell = this.lastChild
    if (!lastCell) {
      return cr.caretInEnd(this)
    }
    return cr.caretInEnd(lastCell)
  }

  focusinCallback(ctx: EditorContext): void {
    if (!ctx.isCaretIn(this)) {
      return
    }
    const firstCell = this.firstChild
    if (firstCell) {
      ctx.setSelection(cr.caretInStart(firstCell))
      return
    }
    const cell = ctx.schema.tableCell.create()
    ctx.commonHandler.emptyElAndInsert(this, cell, cr.caretInEnd(cell))
  }

  onAfterCopy(ctx: EditorContext): this | null {
    // 禁止单独复制行
    if (!ctx.schema.table.is(this.parentNode)) {
      return null
    }
    return this
  }

  toNativeElement(_ctx: EditorContext): null | HTMLElement | (() => HTMLElement) {
    const tr = document.createElement('tr')
    return tr
  }

  static fromNativeElementTransformerMap: HtmlToEtElementTransformerMap = {
    tr: (_el) => {
      return this.create()
    },
  }

  toMdast(mdastNode: CreateMdastNode): ToMdastResult {
    return mdastNode('tableRow', this.childNodes, {})
  }

  static fromMarkdownHandlerMap: MdastNodeHandlerMap = {
    tableRow: () => {
      return this.create()
    },
  }
}
