import type {
  CreateMdastNode,
  EditorContext,
  EffectElement,
  HtmlToEtElementTransformerMap,
  MdastNodeHandlerMap,
  ToMdastResult,
} from '@effitor/core'
import { EtRichText } from '@effitor/core'
import { EtTypeEnum } from '@effitor/shared'

import { TABLE_CELL_ET_CODE, TableName } from './config'

export class EtTableCellElement extends EtRichText {
  static readonly elName = TableName.TableCell
  static readonly etType = super.etType
    | TABLE_CELL_ET_CODE
    | EtTypeEnum.AllowEmpty /** etcode.Em.AllowEmpty */

  /**
   * 创建一个 tc 元素
   */
  static create() {
    const el = document.createElement(this.elName)
    return el
  }

  static fromNativeElementTransformerMap: HtmlToEtElementTransformerMap = {
    td: (_el) => {
      return this.create()
    },
  }

  toNativeElement(this: EffectElement, _ctx: EditorContext): null | HTMLElement | (() => HTMLElement) {
    return document.createElement('td')
  }

  static fromMarkdownHandlerMap: MdastNodeHandlerMap = {
    tableCell: () => {
      return this.create()
    },
  }

  toMdast(mdastNode: CreateMdastNode): ToMdastResult {
    return mdastNode('tableCell', this.childNodes, {})
  }

  onAfterCopy(ctx: EditorContext): this | null {
    // 禁止单独复制单元格
    if (!ctx.schema.table.is(this.parentNode?.parentNode)) {
      return null
    }
    return this
  }
}
