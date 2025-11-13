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

import { ET_TABLE_CELL_CODE, TableEnum } from './config'

export class EtTableCellElement extends EtRichText {
  static readonly elName = TableEnum.TableCell
  static readonly etType = super.etType
    | ET_TABLE_CELL_CODE
    | EtTypeEnum.AllowEmpty /** etcode.Em.AllowEmpty */

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

  onAfterCopy(_ctx: EditorContext): this | null {
    // 禁止单独复制单元格
    return null
  }
}
