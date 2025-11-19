import { BuiltinElName, EtTypeEnum } from '@effitor/shared'

import type { Et } from '../@types'
import { cr } from '../selection'
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
    if (!ctx.isCaretIn(this)) {
      return
    }
    let focusNode = ctx.selection.focusNode
    let toStart = true
    if (!focusNode) {
      focusNode = ctx.bodyEl.lastChild
      toStart = false
    }
    if (focusNode && ctx.isEtParagraph(focusNode) && focusNode.isContentEditable) {
      ctx.setCaretToAParagraph(focusNode, toStart)
      return
    }
    // 没找到合适落点，在对应位置插入一个空段落
    const newP = ctx.createPlainParagraph()
    if (focusNode) {
      ctx.commandManager.handleInsertNode(
        newP,
        toStart ? cr.caretOutStart(focusNode) : cr.caretOutEnd(focusNode),
        cr.caretInAuto(newP),
      )
    }
    // 否则，在编辑区末尾插入段落
    else {
      ctx.commandManager.handleInsertNode(
        newP,
        cr.caretInEnd(this),
        cr.caretInAuto(newP),
      )
      ctx.selection.scrollIntoView()
    }
  }

  toNativeElement(_ctx: Et.EditorContext): null | HTMLElement | (() => HTMLElement) {
    return document.createElement('div')
  }

  toMdast(mdastNode: Et.CreateMdastNode): Et.ToMdastResult {
    return mdastNode('root', this.childNodes, {})
  }
}
