import type { CreateMdastNode, EditorContext, HtmlToEtElementTransformerMap, MdastNodeHandlerMap, MdastNodeTransformerMap, ToMdastResult, ToNativeHTMLPrefers } from '@effitor/core'
import { dom, EtRichText, trimAndCleanZWS } from '@effitor/core'
import { CssClassEnum, EtTypeEnum, HtmlAttrEnum } from '@effitor/shared'

import { LINK_ET_TYPE, LinkEnum } from './config'

/**

[测试链接](www.sample.com "!Abbr.rel")

{
  "type": "link",
  "title": "!Abbr.rel",
  "url": "www.sample.com",
  "children": [{
      "type": "text",
      "value": "测试链接",
  }],
}

*/
export class EtLinkElement extends EtRichText {
  static override readonly elName: string = LinkEnum.ElName
  static override readonly etType: number = super.etType | LINK_ET_TYPE
  static override readonly inEtType: number = EtTypeEnum.PlainText

  /**
   * 构建一个et-list节点
   * @param showText 决定et-list的内容: 传入空串时, 有一个子节点, 内容为url; 否则无子节点
   * @returns
   */
  static override create(url?: string, title?: string | null, showText?: string): EtLinkElement {
    const link = document.createElement(LinkEnum.ElName)
    if (!url) url = 'null'
    link.linkUrl = url
    link.linkTitle = title ?? ''
    if (showText !== void 0) {
      link.textContent = showText ? showText : url
    }

    link.setAttribute(HtmlAttrEnum.Popup_Key, LinkEnum.Popup_Key)

    return link
  }

  set linkUrl(url: string) {
    this.setAttribute('link-url', url)
  }

  get linkUrl() {
    return this.getAttribute('link-url') ?? ''
  }

  set linkTitle(title: string) {
    this.setAttribute('link-title', title)
  }

  get linkTitle() {
    return this.getAttribute('link-title') ?? ''
  }

  openUrl(target = '_blank', windowFeatures = 'noopener,noreferrer') {
    // todo pop dialog
    let url = this.linkUrl
    if (url.search('://') < 0) {
      url = 'https://' + url
    }
    window.open(url, target, windowFeatures)
  }

  override connectedCallback(): void {
    this.classList.add(CssClassEnum.TransitionColorScheme)
  }

  override toNativeElement(
    _ctx: EditorContext,
    prefers: ToNativeHTMLPrefers): null | HTMLElement | (() => HTMLElement
  ) {
    const el = prefers === 'class'
      ? dom.elementAsEtEl('a', this, ['link-url', 'link-title'])
      : document.createElement('a')
    el.href = this.linkUrl
    el.title = this.linkTitle
    return el
  }

  static override readonly fromNativeElementTransformerMap: HtmlToEtElementTransformerMap = {
    a: (el) => {
      // 去除空文本链接
      if (!trimAndCleanZWS(el.textContent)) {
        return null
      }
      return EtLinkElement.create(el.href, el.title)
    },
  }

  static override readonly fromMarkdownHandlerMap: MdastNodeHandlerMap = {
    link: (node, ctx) => {
      if (!node.url || !node.children.length) {
        return null
      }
      const url = ctx.pctx.$linkPx.mdUrlMapping.fromMarkdown?.(node.url) ?? node.url
      const link = EtLinkElement.create(url, node.title)
      return link
    },
  }

  static override readonly toMarkdownTransformerMap: MdastNodeTransformerMap = {
    link: (node, ctx) => {
      node.url = ctx.pctx.$linkPx.mdUrlMapping.toMarkdown?.(node.url) ?? node.url
    },
  }

  toMdast(mdastNode: CreateMdastNode): ToMdastResult {
    const url = this.linkUrl
    if (!url) return null
    return mdastNode('link', this.childNodes, {
      url,
      title: this.linkTitle,
    })
  }
}
