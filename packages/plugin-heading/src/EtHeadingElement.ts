import type { Et } from '@effitor/core'
import { EtHeading } from '@effitor/core'
import { HtmlCharEnum } from '@effitor/shared'
import type { Nodes } from 'mdast'

import { HeadingEnum } from './config'

const levelClass = (hl: Et.HeadingLevel) => `h${hl}`

export class EtHeadingElement extends EtHeading {
  static readonly elName = HeadingEnum.ElName

  static create(level: Et.HeadingLevel = 1, content: string | HTMLBRElement | Text = HtmlCharEnum.ZERO_WIDTH_SPACE) {
    const el = document.createElement(HeadingEnum.ElName)
    el.changeLevel(level)
    if (typeof content === 'string') {
      el.textContent = content
    }
    else {
      el.appendChild(content)
    }
    return el
  }

  set headingLevel(v: Et.HeadingLevel) {
    v = Math.max(1, Math.min(Math.floor(v), 6)) as Et.HeadingLevel
    this.dataset.level = v.toString()
    this.addCssClass(levelClass(v))
  }

  get headingLevel() {
    return parseInt(this.dataset.level ?? '-1') as Et.HeadingLevel
  }

  changeLevel(hl: Et.HeadingLevel) {
    const curr = this.headingLevel
    if (hl === curr) return
    if (!~curr) {
      // 不是初始化-1，移除之前的class
      this.removeCssClass(levelClass(curr))
    }
    this.headingLevel = hl
  }

  fromPlainParagraph(plainParagraph: Et.EtParagraph): Et.EtParagraph {
    const heading = EtHeadingElement.create(this.headingLevel)
    heading.textContent = plainParagraph.textContent
    return heading
  }

  toNativeElement(_ctx: Et.EditorContext): null | HTMLElement | (() => HTMLElement) {
    let level = this.headingLevel
    if (level < 1 || level > 6) {
      level = 1
    }
    const tag = `h${Math.floor(level)}`
    return document.createElement(tag)
  }

  static fromNativeElementTransformerMap: Et.HtmlToEtElementTransformerMap = {
    // 返回函数, 标题不处理后代
    h1: el => () => EtHeadingElement.create(1, el.textContent.trim()),
    h2: el => () => EtHeadingElement.create(2, el.textContent.trim()),
    h3: el => () => EtHeadingElement.create(3, el.textContent.trim()),
    h4: el => () => EtHeadingElement.create(4, el.textContent.trim()),
    h5: el => () => EtHeadingElement.create(5, el.textContent.trim()),
    h6: el => () => EtHeadingElement.create(6, el.textContent.trim()),
  }

  toMdast(mdastNode: Et.CreateMdastNode): Nodes | Nodes[] | null {
    return mdastNode('heading', this.childNodes, {
      depth: this.headingLevel,
    })
  }

  static fromMarkdownHandlerMap: Et.MdastNodeHandlerMap = {
    heading: (node) => {
      return EtHeadingElement.create(node.depth)
    },
  }
}
