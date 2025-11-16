import type { Et } from '@effitor/core'
import { cr, EtParagraph, EtParagraphElement } from '@effitor/core'
import { EtTypeEnum } from '@effitor/shared'
import type { List, ListItem, Paragraph } from 'mdast'

import { commonMarkdownSupportStyle, LIST_ET_TYPE, LIST_ITEM_ET_TYPE, ListAttr, ListEnum, ListType, styleTypeMapping } from './config'

/**
列表元素层级结构
```
<et-list>
    <et-li></et-li>
    <et-list>
        <et-li></et-li>
        <et-li></et-li>
    </et-list>
    <et-li></et-li>
</et-list>
```

mdast层级结构
```
list {
    listItem {
        paragraph
        list {
            listItem {
                paragraph
            }
            listItem {
                paragraph
            }
        }
    }
    listItem {
        paragraph
    }
}
```
*/
export class EtListElement extends EtParagraph {
  static readonly elName = ListEnum.List
  static readonly etType = LIST_ET_TYPE | EtTypeEnum.Paragraph // list 属于段落
  /** list下只允许list和listItem */
  static readonly inEtType = LIST_ITEM_ET_TYPE | LIST_ET_TYPE

  set ordered(ordered: boolean) {
    if (ordered) {
      this.setAttribute(ListAttr.Ordered, '')
    }
    else {
      this.removeAttribute(ListAttr.Ordered)
    }
  }

  get ordered() {
    return this.hasAttribute(ListAttr.Ordered)
  }

  set styleType(type: ListType['styleType']) {
    this.setAttribute(ListAttr.Style_Type, type)
  }

  get styleType() {
    return this.getAttribute(ListAttr.Style_Type) ?? ''
  }

  /**
   * 创建一个list元素, 默认里边有一个li元素
   */
  static create(listType?: ListType, withLi = true, liWithBr = true) {
    const el = document.createElement(ListEnum.List)
    if (withLi) {
      const li = EtListItemElement.create(liWithBr)
      el.appendChild(li)
    }
    if (!listType) return el
    el.ordered = listType.ordered
    el.styleType = listType.styleType
    return el
  }

  innerStartEditingBoundary(): Et.EtCaret {
    const firstLi = this.firstElementChild as EtListItemElement | null
    if (!firstLi) {
      return cr.caret(this, 0)
    }
    return firstLi.innerStartEditingBoundary()
  }

  innerEndEditingBoundary(): Et.EtCaret {
    const lastLi = this.lastElementChild as EtListItemElement | null
    if (!lastLi) {
      return cr.caretInEnd(this)
    }
    return lastLi.innerEndEditingBoundary()
  }

  createForInsertParagraph(): EtParagraph | null {
    return EtListItemElement.create()
  }

  toNativeElement(_ctx: Et.EditorContext): null | HTMLElement | (() => HTMLElement) {
    const list = document.createElement(this.ordered ? 'ol' : 'ul')
    return list
  }

  static fromNativeElementTransformerMap: Et.HtmlToEtElementTransformerMap = {
    ol: (el) => {
      if (el.firstChild?.nodeName !== 'LI') {
        return null
      }
      return EtListElement.create(
        { ordered: true, styleType: ListEnum.Default_Ordered_Style_Type },
        false,
      )
    },
    ul: (el) => {
      if (el.firstChild?.nodeName !== 'LI') {
        return null
      }
      return EtListElement.create(
        { ordered: false, styleType: ListEnum.Default_Unordered_Style_Type },
        false,
      )
    },
  }

  static fromMarkdownHandlerMap: Et.MdastNodeHandlerMap = {
    list: (node) => {
      const firstLi = node.children[0]
      // todo 暂不支持不是段落 也不是 list 的listItem表项 (如 code, heading, 等)
      firstLi.children = firstLi.children.filter(node => node.type === 'paragraph' || node.type === 'list')
      if (!firstLi.children.length) {
        return null
      }
      let firstData = ''
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let firstChild = firstLi.children[0] as any
      while (firstChild) {
        if (firstChild.value !== void 0) {
          firstData = firstChild.value
          break
        }
        firstChild = firstChild.children?.[0]
      }
      // data非空, firstChild 必为 Literal 节点
      if (firstData === '') {
        if (import.meta.env.DEV) {
          throw Error(`EtListElement.fromMarkdown handle list: no first data`)
        }
        return null
      }

      const marker = node.ordered ? firstData.slice(0, 2) : firstData[0]
      const styleType = styleTypeMapping[marker]
      // 无对应styleType, 使用默认list样式
      if (!styleType) {
        const style = node.ordered
          ? {
              ordered: true,
              styleType: 'decimal',
            }
          : {
              ordered: false,
              styleType: 'disc',
            }
        return EtListElement.create(style, false)
      }
      // 去掉marker字符
      firstChild.value = firstChild.value.slice(marker.length)
      return EtListElement.create({
        ordered: !!node.ordered,
        styleType,
      }, false)
    },

  }

  toMdast(mdastNode: Et.CreateMdastNode): Et.ToMdastResult {
    if (this.childElementCount === 0) {
      return null
    }
    const children: ListItem[] = []
    for (const child of this.childNodes) {
      // 嵌套list, 由上一兄弟listItem解析, 此处直接跳过
      if (child.nodeName === ListEnum.List_U) {
        continue
      }
      if (child.nodeName !== ListEnum.Li_U) {
        if (import.meta.env.DEV) {
          throw Error(`element in List is neither List nor Li, but ${child.nodeName}`)
        }
        continue
      }
      const nod = (child as unknown as EtListItemElement).toMdast(mdastNode)
      if (!nod) continue
      if (Array.isArray(nod)) {
        children.push(...(nod as ListItem[]))
      }
      else {
        children.push(nod as ListItem)
      }
    }
    return mdastNode({
      type: 'list',
      children,
      ordered: this.ordered,
      spread: false,
    })
  }
}

export class EtListItemElement extends EtParagraphElement {
  static readonly elName = ListEnum.Li
  static readonly etType = super.etType | LIST_ITEM_ET_TYPE

  set checked(checked: boolean | null | undefined) {
    if (typeof checked === 'boolean') {
      this.setAttribute(ListAttr.Check, checked ? 'true' : 'false')
      return
    }
    this.removeAttribute(ListAttr.Check)
  }

  get checked() {
    const checked = this.getAttribute(ListAttr.Check)
    if (!checked) {
      return null
    }
    return checked === 'true'
  }

  static create(withBr = true) {
    const li = document.createElement(ListEnum.Li)
    if (withBr) {
      li.appendChild(document.createElement('br'))
    }
    return li
  }

  toNativeElement(_ctx: Et.EditorContext): null | HTMLElement | (() => HTMLElement) {
    return document.createElement('li')
  }

  static fromNativeElementTransformerMap: Et.HtmlToEtElementTransformerMap = {
    li: () => {
      return EtListItemElement.create(false)
    },
  }

  static fromMarkdownHandlerMap: Et.MdastNodeHandlerMap = {
    listItem: () => {
      // listItem无对应html节点, 返回一个片段以收集后代节点
      return document.createDocumentFragment()
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    paragraph: (node, ctx, index, parent) => {
      if (parent.type !== 'listItem') return null
      // 父节点是 listItem 的paragraph
      const li = EtListItemElement.create(false)
      li.checked = parent.checked
      return li
    },
  }

  /**
   * 将列表号插入到第一个列表项的文本开头
   * {@link styleTypeMapping}
   */
  toMdast(mdastNode: Et.CreateMdastNode): Et.ToMdastResult {
    const currList = this.parentElement
    if (!EtListElement.is(currList)) {
      if (import.meta.env.DEV) {
        throw Error(`EtListItemElement.toMdast: 当前listItem无list父节点`)
      }
      return null
    }
    let currLiParagraph: Paragraph
    let marker: string
    const styleType = currList.styleType
    // 无前兄弟(第一个li) 且 不是common mard支持的列表类型, 将marker插入到第一个li的文本开头
    if (!this.previousElementSibling && !commonMarkdownSupportStyle.includes(styleType)
      && (marker = styleTypeMapping[currList.styleType]) !== void 0
    ) {
      currLiParagraph = mdastNode('paragraph', [new Text(marker), ...this.childNodes], {})
    }
    else {
      currLiParagraph = mdastNode('paragraph', this.childNodes, {})
    }
    const children: (Paragraph | List)[] = [currLiParagraph]
    if (EtListElement.is(this.nextElementSibling)) {
      const nod = this.nextElementSibling.toMdast(mdastNode)
      if (nod) children.push(nod as Paragraph | List)
    }
    return mdastNode({
      type: 'listItem',
      checked: this.checked,
      children,
    })
  }
}
