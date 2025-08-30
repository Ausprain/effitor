import { BuiltinElName, EtTypeEnum } from '../enums'
import { EtParagraph } from './EtParagraph'

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export abstract class EtHeading extends EtParagraph { // 标题属于段落
  static readonly elName: string = BuiltinElName.ET_HEADING
  static readonly etType: number = super.etType | EtTypeEnum.Heading
  // 标题下只允许纯文本
  static readonly inEtType = EtTypeEnum.PlainText
  // 标题下不允许一切效应元素
  static readonly notInEtType: number = -1
  // static cssStyle: Partial<StringCssStyle> = {
  //     display: 'block !important',
  // }

  abstract get headingLevel(): HeadingLevel
  abstract set headingLevel(val: HeadingLevel)
}
