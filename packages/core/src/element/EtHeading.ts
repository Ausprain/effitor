import { BuiltinElName, EtTypeEnum } from '@effitor/shared'

import type { Et } from '../@types'
import { cr } from '../selection'
import { EtParagraph } from './EtParagraph'

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export abstract class EtHeading extends EtParagraph { // 标题属于段落
  static override readonly elName: string = BuiltinElName.ET_HEADING
  static override readonly etType: number = super.etType | EtTypeEnum.Heading
  // 默认标题下只允许纯文本
  static override readonly inEtType: number = EtTypeEnum.PlainText
  // 默认标题下不允许一切效应元素
  static override readonly notInEtType: number = -1

  abstract get headingLevel(): HeadingLevel
  abstract set headingLevel(val: HeadingLevel)

  innerStartEditingBoundary(): Et.EtCaret {
    const child = this.firstChild
    if (child) {
      return cr.caretStartAuto(child)
    }
    return cr.caretInStart(this)
  }

  innerEndEditingBoundary(): Et.EtCaret {
    const child = this.lastChild
    if (child) {
      return cr.caretEndAuto(child)
    }
    return cr.caretInEnd(this)
  }
}
