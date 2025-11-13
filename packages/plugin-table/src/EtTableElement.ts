import type {
  CreateMdastNode,
  EditorContext,
  EtCaret,
  HtmlToEtElementTransformerMap,
  MdastNodeHandlerMap,
  ToMdastResult,
} from '@effitor/core'
import { cr, EtComponent } from '@effitor/core'

import { ET_TABLE_CODE, ET_TABLE_ROW_CODE, TableEnum } from './config'
import { EtTableRowElement } from './EtTableRowElement'

// FIXME 现阶段范围删除算法尚未完善，选区不允许跨越表格选择，因此继承组件，使用嵌套可编辑
export class EtTableElement extends EtComponent {
  static readonly elName = TableEnum.Talbe
  static readonly etType = super.etType | ET_TABLE_CODE
  static readonly inEtType = ET_TABLE_ROW_CODE

  // 表格标题, 当设置为 'r'（首行）、'c'（首列）时，会加粗该行/列
  get tableHead() {
    return this.dataset.head as 'r' | 'c' | string
  }

  set tableHead(value: 'r' | 'c' | string) {
    this.dataset.head = value
  }

  get tableEven() {
    return this.dataset.even === '1'
  }

  set tableEven(value: boolean) {
    this.dataset.even = value ? '1' : '0'
  }

  get tableAlign() {
    return this.dataset.align || 'left'
  }

  set tableAlign(value: 'left' | 'right' | 'center' | string) {
    this.dataset.align = value
  }

  /**
   * 创建表格元素
   * 如果withRow为true, 则返回结果为
   * ```html
   * <et-table>
   *   <et-tr>
   *     <et-tc></et-tc>
   *   </et-tr>
   * </et-table>
   * ```
   * 否则，返回：`<et-table></et-table>`
   * @param withRow 是否自带一表格行, 默认为false
   */
  static create(withRow = false) {
    const el = document.createElement(this.elName)
    if (withRow) {
      const row = EtTableRowElement.create(true)
      el.appendChild(row)
    }
    return el
  }

  static fromNativeElementTransformerMap: HtmlToEtElementTransformerMap = {
    table: (el) => {
      const tb = this.create()
      if (el.align) {
        tb.tableAlign = el.align
      }
      else if (el.style.textAlign) {
        tb.tableAlign = el.style.textAlign
      }
      return tb
    },
  }

  toNativeElement(): HTMLDivElement {
    const tb = document.createElement('table')
    tb.align = this.tableAlign
    return tb
  }

  static fromMarkdownHandlerMap: MdastNodeHandlerMap = {
    table: () => {
      return this.create()
    },
  }

  toMdast(mdastNode: CreateMdastNode): ToMdastResult {
    return mdastNode('table', this.childNodes, {
      // TODO 暂不实现对齐，默认左对齐
      // align: [],
    })
  }

  innerStartEditingBoundary(): EtCaret {
    const firstRow = this.firstChild
    if (firstRow instanceof EtTableRowElement) {
      return firstRow.innerStartEditingBoundary()
    }
    return cr.caretInStart(this)
  }

  innerEndEditingBoundary(): EtCaret {
    const lastRow = this.lastChild
    if (lastRow instanceof EtTableRowElement) {
      return lastRow.innerEndEditingBoundary()
    }
    return cr.caretInEnd(this)
  }

  focusToInnerEditable(ctx: EditorContext, toStart: boolean): HTMLElement | null {
    const firstRow = this.firstChild
    if (ctx.schema.tableRow.is(firstRow)) {
      if (toStart) {
        ctx.setSelection(cr.caretInStart(firstRow))
      }
      else {
        ctx.setSelection(cr.caretInEnd(firstRow))
      }
    }
    return null
  }
}
