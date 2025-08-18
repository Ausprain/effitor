import type { Et } from '~/core/@types'

import { BuiltinElName, EtTypeEnum } from '../enums'
import { EffectElement } from './EffectElement'

/**
 * 编辑区, 编辑器主体
 * 默认支持的子元素效应类型有: 段落, 段落组, 标题, 组件; 若插件需扩展类型, 如需要允许编辑区下出现列表,
 * 应额外通过 extentEtElement 扩展空 handler 来间接扩充其允许的子元素效应类型
 * @example
 * extentEtElement(EtBodyElement, {}, [ EtListElement ])
 */
export class EtBodyElement extends EffectElement {
  static readonly elName: string = BuiltinElName.ET_BODY
  static readonly etType: number = 0
  /** body子节点允许一切段落 */
  static readonly inEtType: number = EtTypeEnum.Paragraph

  static readonly cssStyle = {
    display: 'block !important',
    minHeight: '128px',
    margin: '8px auto',
    outline: 'none',
    border: 'none',
    whiteSpace: 'pre-wrap',
    fontFamily: 'UbuntuVariable, PingFang SC, Lantinghei SC, Microsoft Yahei, Hiragino Sans GB, Microsoft Sans Serif, WenQuanYi Micro Hei, sans-serif',
    fontWeight: '449',
    fontSize: '15px',
  }

  static create() {
    return document.createElement(BuiltinElName.ET_BODY) as EtBodyElement
  }

  connectedCallback(): void {
    this.setAttribute('contenteditable', '')
  }

  replaceToNativeElement(): void {
    const div = document.createElement('div')
    div.append(...this.childNodes)
    this.replaceWith(div)
  }

  toMdast(mdastNode: Et.CreateMdastNode): Et.ToMdastResult {
    return mdastNode('root', this.childNodes, {})
  }
}
