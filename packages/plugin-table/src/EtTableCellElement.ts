import type {
  CreateMdastNode,
  EditorContext,
  HtmlToEtElementTransformerMap,
  MdastNodeHandlerMap,
  ToMdastResult,
} from '@effitor/core'
import { EffectElement } from '@effitor/core'
import { EtTypeEnum } from '@effitor/shared'

import { TABLE_CELL_ET_TYPE, TableName } from './config'

export class EtTableCellElement extends EffectElement {
  protected override nativeTag?: keyof HTMLElementTagNameMap | undefined = 'td'

  static override readonly elName: string = TableName.TableCell
  static override readonly etType: number = super.etType
    | TABLE_CELL_ET_TYPE
    | EtTypeEnum.AllowEmpty /** etcode.Em.AllowEmpty */

  static override readonly fromNativeElementTransformerMap: HtmlToEtElementTransformerMap = {
    td: (_el) => {
      return this.create()
    },
  }

  static override readonly fromMarkdownHandlerMap: MdastNodeHandlerMap = {
    tableCell: () => {
      return this.create()
    },
  }

  toMdast(mdastNode: CreateMdastNode): ToMdastResult {
    return mdastNode('tableCell', this.childNodes, {})
  }

  override onAfterCopy(ctx: EditorContext): this | null {
    // 禁止单独复制单元格
    if (!ctx.schema.table.is(this.parentNode?.parentNode)) {
      return null
    }
    return this
  }
}
