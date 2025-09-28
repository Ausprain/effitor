import type { Et } from '@effitor/core'
import { EtHeading } from '@effitor/core'
import { HtmlCharEnum } from '@effitor/shared'
import type { Nodes } from 'mdast'

import { HeadingEnum } from './config'

const enum E {
  // eslint-disable-next-line @typescript-eslint/prefer-literal-enum-member
  n = HeadingEnum.ElName,
  h1 = 'ET_cls_h1',
  h2 = 'ET_cls_h2',
  h3 = 'ET_cls_h3',
  h4 = 'ET_cls_h4',
  h5 = 'ET_cls_h5',
  h6 = 'ET_cls_h6',
}

const levelClass = (hl: Et.HeadingLevel) => `h${hl}`

export class EtHeadingElement extends EtHeading {
  static readonly elName = E.n

  static create(level: Et.HeadingLevel = 1, data: string = HtmlCharEnum.ZERO_WIDTH_SPACE) {
    const el = document.createElement(HeadingEnum.ElName)
    el.changeLevel(level)
    el.textContent = data
    // el.appendChild(document.createElement('br'))
    return el
  }

  set headingLevel(v: Et.HeadingLevel) {
    v = Math.max(1, Math.min(Math.floor(v), 6)) as Et.HeadingLevel
    this.dataset.headLevel = v.toString()
    this.addCssClass(levelClass(v))
  }

  get headingLevel() {
    return parseInt(this.dataset.headLevel ?? '-1') as Et.HeadingLevel
  }

  changeLevel(hl: Et.HeadingLevel) {
    const curr = this.headingLevel
    if (hl === curr) return
    if (!~curr) {
      // 不是初始化-1，移除之前的class
      this.removeCssClass(levelClass(curr))
    }
    this.headingLevel = hl
    this.addCssClass(levelClass(hl))
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
