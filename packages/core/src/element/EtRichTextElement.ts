import { BuiltinElName, EtTypeEnum } from '../enums'
import { cssStyle2cssText } from '../utils'
import { EffectElement } from './EffectElement'

/**
 * 富文本节点
 */
export abstract class EtRichTextElement extends EffectElement {
  static readonly elName: string = BuiltinElName.ET_RICHTEXT
  static readonly etType = EtTypeEnum.RichText
  static readonly inEtType: number = EtTypeEnum.RichText | EtTypeEnum.PlainText
  static readonly notInEtType: number = EtTypeEnum.Block
    | EtTypeEnum.Paragraph
    | EtTypeEnum.Embedment

  replaceToNativeElement(): void {
    const computedMap = this.computedStyleMap()
    const isBlock = computedMap.get('display') === 'block'
    const cssStyle = {
      color: computedMap.get('color')?.toString() ?? '',
      backgroundColor: computedMap.get('background-color')?.toString() ?? '',
      fontFamily: computedMap.get('font-family')?.toString() ?? '',
      fontWeight: computedMap.get('font-weight')?.toString() ?? '',
    }

    const ele = isBlock ? document.createElement('div') : document.createElement('span')
    ele.append(...this.childNodes)
    ele.setAttribute('style', cssStyle2cssText(cssStyle))
    this.replaceWith(ele)
  }
}
