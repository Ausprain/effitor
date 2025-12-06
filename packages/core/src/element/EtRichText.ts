import { BuiltinElName, EtTypeEnum } from '@effitor/shared'

import { EffectElement } from './EffectElement'

/**
 * 富文本节点
 */
export abstract class EtRichText extends EffectElement {
  static override readonly elName: string = BuiltinElName.ET_RICHTEXT
  static override readonly etType: number = EtTypeEnum.RichText
  static override readonly inEtType: number = EtTypeEnum.RichText | EtTypeEnum.PlainText
  static override readonly notInEtType: number = EtTypeEnum.Block
    | EtTypeEnum.Paragraph
    | EtTypeEnum.Embedment
}
