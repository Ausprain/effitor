import { BuiltinElName, EtTypeEnum } from '@effitor/shared'

import type { EditorContext } from '../context'
import { cssStyle2cssText } from '../utils'
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

  toNativeElement(this: EffectElement, _ctx: EditorContext): null | HTMLElement | (() => HTMLElement) {
    const cssValues = getComputedStyle(this)
    const isBlock = cssValues.display === 'block'
    const cssStyle = {
      color: cssValues.color?.toString() ?? '',
      backgroundColor: cssValues.backgroundColor?.toString() ?? '',
      fontFamily: cssValues.fontFamily?.toString() ?? '',
      fontWeight: cssValues.fontWeight?.toString() ?? '',
    }

    const el = isBlock ? document.createElement('div') : document.createElement('span')
    el.setAttribute('style', cssStyle2cssText(cssStyle))
    return el
  }
}
