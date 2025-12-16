import type {
  CreateMdastNode,
  EditorContext,
  Et,
  EtCaret,
  HtmlToEtElementTransformerMap,
  MdastNodeHandlerMap,
  ToMdastResult,
} from '@effitor/core'
import { cr, EtComponent } from '@effitor/core'

import { TABLE_ET_TYPE, TABLE_ROW_ET_TYPE, TableName } from './config'
import { EtTableRowElement } from './EtTableRowElement'
import { parseTableMeta } from './util'

// FIXME 现阶段范围删除算法尚未完善，选区不允许跨越表格选择，因此继承组件，使用嵌套可编辑
export class EtTableElement extends EtComponent {
  protected override nativeTag?: keyof HTMLElementTagNameMap | undefined = 'table'

  static override readonly elName: string = TableName.Talbe
  static override readonly etType: number = super.etType | TABLE_ET_TYPE
  static override readonly inEtType: number = TABLE_ROW_ET_TYPE

  // 表格标题, 当设置为 'r'（首行）、'c'（首列）时，会加粗该行/列
  get tableHead(): 'r' | 'c' | 'rc' | '' {
    const head = this.dataset.head
    if (head === 'r' || head === 'c' || head === 'rc') {
      return head
    }
    return ''
  }

  set tableHead(value: string) {
    if (value === 'r' || value === 'c' || value === 'rc') {
      this.dataset.head = value
    }
    else {
      this.removeAttribute('data-head')
    }
  }

  /** 表格是否等宽 */
  get tableEven() {
    return this.dataset.even !== void 0
  }

  set tableEven(value: boolean) {
    if (value) {
      this.dataset.even = ''
    }
    else {
      this.removeAttribute('data-even')
    }
  }

  /** 表格对齐方式 */
  get tableAlign(): 'left' | 'right' | 'center' | '' {
    const align = this.dataset.align
    if (align === 'left' || align === 'right' || align === 'center') {
      return align
    }
    return ''
  }

  set tableAlign(value: string) {
    if (value === 'left' || value === 'right' || value === 'center') {
      this.dataset.align = value
    }
    else {
      this.removeAttribute('data-align')
    }
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
  static override create(withRow = false) {
    const el = document.createElement(this.elName) as EtTableElement
    if (withRow) {
      const row = EtTableRowElement.create(true)
      el.appendChild(row)
    }
    return el
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

  static override readonly fromNativeElementTransformerMap: HtmlToEtElementTransformerMap = {
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

  toMdast(mdastNode: CreateMdastNode): ToMdastResult {
    const col = this.firstElementChild?.children.length || 0
    if (!col) {
      return null
    }
    const align = this.tableAlign === '' ? null : this.tableAlign
    const table = mdastNode('table', this.childNodes, {
      align: new Array(col).fill(align),
    })
    const meta = JSON.stringify(this.dataset)
    if (meta !== '{}') {
      table.children.push(mdastNode({
        type: 'tableRow',
        children: [
          mdastNode({
            type: 'tableCell',
            children: [
              mdastNode({
                type: 'text',
                value: meta,
              }),
            ],
          }),
        ],
      }))
    }
    return table
  }

  static override readonly fromMarkdownHandlerMap: MdastNodeHandlerMap = {
    table: (node, _c, _i, _p, manager) => {
      const col = node.align?.length
      if (!col || !node.children.length) {
        return null
      }
      // 提取表格元数据
      const align = node.align?.find(Boolean) ?? ''
      const meta = parseTableMeta(node.children.at(-1) as Et.MdastNode<'tableRow'>)
      // 规范表格ast结构
      for (const row of node.children) {
        if (row.type !== 'tableRow') {
          row.type = 'tableRow'
          row.children = new Array(col).fill(manager.newNode({
            type: 'tableCell',
            children: [],
          }))
          continue
        }
      }
      // 返回表格元素
      const el = this.create()
      if (align) {
        el.tableAlign = align
      }
      if (!meta) {
        return el
      }
      // 弹出meta行
      node.children.pop()
      Object.assign(el.dataset, meta)
      return el
    },
  }
}
