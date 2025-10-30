import { BuiltinElName, EtTypeEnum } from '@effitor/shared'

import type { Et } from '../@types'
import { EffectElement } from './EffectElement'

/**
 * 编辑区, 编辑器主体
 * 默认支持的子元素效应类型有: 段落, 段落组, 标题, 组件; 若插件需扩展类型, 如需要允许编辑区下出现列表,
 * 应额外通过 mountEtHandler 扩展空 handler 来间接扩充其允许的子元素效应类型
 * @example
 * mountEtHandler(EtBodyElement, {}, [ EtListElement ])
 */
export class EtBodyElement extends EffectElement {
  static readonly elName: string = BuiltinElName.ET_BODY
  static readonly etType: number = 0
  /** body子节点允许一切段落 */
  static readonly inEtType: number = EtTypeEnum.Paragraph

  static create() {
    return document.createElement(BuiltinElName.ET_BODY) as EtBodyElement
  }

  connectedCallback(): void {
    this.setAttribute('contenteditable', '')
    this.setAttribute('autocorrect', 'off')
    this.autocapitalize = 'off'
    this.spellcheck = false
  }

  focusinCallback(ctx: Et.EditorContext): void {
    // et-body 获得焦点，判断编辑区是否为空，为空则插入一个段落, 否则聚焦到首段落
    if (!ctx.selection.isCollapsed) {
      return
    }
    if (ctx.bodyEl.childNodes.length > 0 && ctx.isEtParagraph(ctx.bodyEl.firstChild)) {
      ctx.setCaretToAParagraph(ctx.bodyEl.firstChild as Et.Paragraph, true)
      return
    }
    // 编辑区为空，插入一个段落
    ctx.commonHandler.initEditorContents(false)
  }

  toNativeElement() {
    return document.createElement('div')
  }

  toMdast(mdastNode: Et.CreateMdastNode): Et.ToMdastResult {
    return mdastNode('root', this.childNodes, {})
  }
}
