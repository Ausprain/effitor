import type {
  CreateMdastNode,
  EditorContext,
  Et,
  EtCaret,
  HtmlToEtElementTransformerMap,
  MdastNodeHandlerMap,
  ToMdastResult,
} from '@effitor/core'
import { cr, EtParagraph } from '@effitor/core'

import { TABLE_CELL_ET_TYPE, TABLE_ROW_ET_TYPE, TableName } from './config'
import { EtTableCellElement } from './EtTableCellElement'
import { parseTableRowMeta } from './util'

export class EtTableRowElement extends EtParagraph {
  protected override nativeTag?: keyof HTMLElementTagNameMap | undefined = 'tr'

  static override readonly elName: string = TableName.TableRow
  static override readonly etType: number = super.etType | TABLE_ROW_ET_TYPE
  static override readonly inEtType: number = TABLE_CELL_ET_TYPE

  override connectedCallback(): void {
    this.setAttribute('contenteditable', 'true')
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
  static override create(withCell = false) {
    const el = document.createElement(this.elName) as EtTableRowElement
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

  override focusinCallback(ctx: EditorContext): void {
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

  override onAfterCopy(ctx: EditorContext): this | null {
    // 禁止单独复制行
    if (!ctx.schema.table.is(this.parentNode)) {
      return null
    }
    return this
  }

  static override readonly fromNativeElementTransformerMap: HtmlToEtElementTransformerMap = {
    tr: (_el) => {
      // TODO 若后续有rowMeta, 则需要额外处理
      return this.create()
    },
  }

  toMdast(mdastNode: CreateMdastNode): ToMdastResult {
    return mdastNode('tableRow', this.childNodes, {})
  }

  static override readonly fromMarkdownHandlerMap: MdastNodeHandlerMap = {
    tableRow: (node, _c, _i, parent) => {
      const col = (parent as Et.MdastNode<'table'>).align?.length
      if (!col || !node.children.length) {
        return null
      }
      let metaCell
      if (node.children.length > col) {
        metaCell = node.children[col]
        node.children.length = col
      }
      for (const cell of node.children) {
        if (cell.type !== 'tableCell') {
          cell.type = 'tableCell'
          cell.children = []
        }
      }
      // TODO 若后续有rowMeta, 则需要解析
      if (import.meta.env.DEV) {
        if (metaCell) {
          parseTableRowMeta(metaCell)
        }
      }
      return this.create()
    },
  }
}
