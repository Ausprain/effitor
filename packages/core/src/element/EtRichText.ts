import { BuiltinElName, EtTypeEnum } from '@effitor/shared'

import { EffectElement } from './EffectElement'

/**
 * 富文本节点
 */
export abstract class EtRichText extends EffectElement {
  static readonly elName: string = BuiltinElName.ET_RICHTEXT
  static readonly etType = EtTypeEnum.RichText
  static readonly inEtType: number = EtTypeEnum.RichText | EtTypeEnum.PlainText
  static readonly notInEtType: number = EtTypeEnum.Block
    | EtTypeEnum.Paragraph
    | EtTypeEnum.Embedment
}
