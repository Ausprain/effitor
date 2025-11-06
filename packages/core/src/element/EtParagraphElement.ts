import { BuiltinElName, EtTypeEnum, HtmlCharEnum } from '@effitor/shared'

import type { Et } from '../@types'
import { cr } from '../selection'
import { EtParagraph } from './EtParagraph'

/**
 * 段落
 * 有`regressToParagraphElement`方法，未重写时，会将当前节点的内容提取为纯文本插入到一个新的段落节点中
 * 调用该方法只返回一个包含内容的段落节点，不会改变dom树
 */
export class EtParagraphElement extends EtParagraph {
  static readonly elName: string = BuiltinElName.ET_PARAGRAPH
  static readonly etType = super.etType
  static readonly inEtType: number = EtTypeEnum.PlainText | EtTypeEnum.RichText
  // 普通段落元素下不允许一切段落
  static readonly notInEtType: number = EtTypeEnum.Paragraph
  /**
   * ctx.createParagraph会调用该方法创建一个段落
   */
  static create() {
    return document.createElement(BuiltinElName.ET_PARAGRAPH) as EtParagraphElement
  }

  isEqualTo(el: Et.Element) {
    return this.localName === el.localName
  }

  innerStartEditingBoundary(): Et.EtCaret {
    const firstChild = this.firstChild
    if (firstChild) {
      return cr.caretStartAuto(firstChild)
    }
    return cr.caretInStart(this)
  }

  innerEndEditingBoundary(): Et.EtCaret {
    const last = this.lastChild
    if (last) {
      if (last.localName === 'br') {
        // return cr.caret(last, 0)
        return cr.caretOutStart(last)
      }
      return cr.caretEndAuto(last)
    }
    return cr.caretInEnd(this)
  }

  static readonly fromNativeElementTransformerMap: Et.HtmlToEtElementTransformerMap = {
    p: () => {
      return this.create()
    },
  }

  toNativeElement() {
    return document.createElement('p')
  }

  toMdast(mdastNode: Et.CreateMdastNode): Et.ToMdastResult {
    if (this.textContent === '') {
      // 空内容段落使用 零宽字符 占位, 防止空段落被忽略
      // 插入的 零宽字符 会在 `mdProcessor.fromMarkdown` 中调用 `DocumentFragment.normalizeAndCleanZWS` 去除
      return mdastNode({
        type: 'paragraph',
        children: [mdastNode({
          type: 'text',
          value: HtmlCharEnum.ZERO_WIDTH_SPACE,
        })],
      })
    }
    return mdastNode('paragraph', this.childNodes, {})
  }

  static readonly fromMarkdownHandlerMap: Et.MdastNodeHandlerMap = {
    paragraph: () => {
      const p = EtParagraphElement.create()
      return p
    },
  }
}

export type EtParagraphCtor = typeof EtParagraphElement
