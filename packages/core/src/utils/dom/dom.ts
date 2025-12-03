/* eslint-disable @stylistic/max-len */
/**
 * DOM 相关的工具函数, 通过 dom 工具对象统一导出,\
 * 构建时, 通过 babel 插件, 将 dom.isText(el) 等直接转为 el.nodeType === 3
 */
import { BuiltinElName, CssClassEnum, HtmlCharEnum } from '@effitor/shared'

import type { Et } from '../../@types'
import { etcode } from '../../element/etcode'

/* -------------------------------------------------------------------------- */
/*                                  node utils                                */
/* -------------------------------------------------------------------------- */

/** 创建一个只有一个零宽字符的文本节点 */
export const zwsText = () => document.createTextNode(HtmlCharEnum.ZERO_WIDTH_SPACE) as Et.Text
export const createText = (data: string) => document.createTextNode(data) as Et.Text
export const el = <K extends keyof HTMLElementTagNameMap>(tagName: K, className?: string, cssText?: string): HTMLElementTagNameMap[K] & Et.HTMLElement => {
  const el = document.createElement(tagName)
  if (className) {
    el.className = className
  }
  if (cssText) {
    el.style.cssText = cssText
  }
  return el as HTMLElementTagNameMap[K] & Et.HTMLElement
}
/** 创建一个可编辑的 div 元素, 禁用拼写检查、自动修正、自动大写 */
export const pureEditableDiv = (plaintextOnly: boolean) => {
  const div = document.createElement('div')
  div.contentEditable = plaintextOnly ? 'plaintext-only' : 'true'
  div.tabIndex = 0
  div.spellcheck = false
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  div.autocorrect = false
  div.autocapitalize = 'none'
  return div
}
/** 节点长度, 文本节点返回文本长度, 元素节点返回子节点数量 */
export const nodeLength = (nod: Et.Node) => isText(nod) ? nod.length : nod.childNodes.length
/** 获取节点在父节点中的索引; 若节点没有父节点, 返回 -1 */
export const nodeIndex = (node: Node) => {
  if (!node.parentNode) {
    return -1
  }
  return prevSiblingCount(node)
}
/** 获取节点在父节点中的索引; 若节点不在页面上, 返回 -1 */
export const connectedNodeIndex = (node: Node) => {
  if (!node.isConnected) {
    return -1
  }
  return prevSiblingCount(node)
}
/**
 * 计算节点的前兄弟节点个数
 */
export const prevSiblingCount = (node: Node) => {
  let i = 0
  node = node.previousSibling as Node
  while (node) {
    i++
    node = node.previousSibling as Node
  }
  return i
}
/**
 * 克隆一个et元素节点 并去除 id属性 和 状态class类名 (包括后代效应元素)
 * @param el 要克隆的元素节点
 * @param deep 是否深克隆
 * @returns 克隆后的元素节点
 */
export const cloneEtElement = <T extends Et.EtElement>(el: T, deep: boolean): T => {
  const clone = el.cloneNode(deep) as T
  clone.removeAttribute('id')
  const walker = document.createTreeWalker(clone, 1, (el) => {
    if (etcode.check(el)) {
      el.removeAttribute('id')
      removeStatusClassForEl(el)
    }
    return 3
  })
  while (walker.nextNode()) { /** */ }
  return removeStatusClassForEl(clone)
}
/**
 * 浅克隆一个et段落元素, 去除(id, 状态class)
 * * 该方法不仅会克隆指定元素html属性, 还会克隆其js对象的 可枚举属性
 * @param removeCls 额外需要去除的class名
 */
export const cloneEtParagraph = <T extends Et.EtParagraph>(origin: T, removeCls = []): T => {
  // 浅克隆 元素名 + 属性
  const clone = origin.cloneNode(false) as T
  // 去掉特有属性
  clone.removeAttribute('id')
  // 去掉状态class
  return removeStatusClassForEl(clone, removeCls)
}
/**
 * 去除元素上的状态css类, 返回该元素; 默认包含的状态类名有:
 * ```
 * CssClassEnum.Active
 * CssClassEnum.CaretIn
 * CssClassEnum.Selected
 * ```
 */
export const removeStatusClassForEl = <E extends HTMLElement>(el: E, cls = []): E => {
  el.classList.remove(...[...cls, CssClassEnum.Active, CssClassEnum.CaretIn, CssClassEnum.Selected])
  return el
}
/**
 * 向上（包括自身）找第一个`EffectElement`
 * @param stopTag 小写元素标签名
 * 返回的节点可能匹配 `stopTag`,
 */
export const findEffectParent = (node: Et.NodeOrNull, stopTag: string = BuiltinElName.ET_BODY): Et.EtElement | null => {
  while (node) {
    if (node.etCode !== void 0) return node as Et.EtElement
    if (node.localName === stopTag) return null
    node = node.parentNode
  }
  return null
}

/* -------------------------------------------------------------------------- */
/*                                  check utils                               */
/* -------------------------------------------------------------------------- */

export const isText = (node: Node | null): node is Et.Text => node?.nodeType === 3 /** Node.TEXT_NODE */
export const isElement = (node: Node | null): node is Et.Element => node?.nodeType === 1 /** Node.ELEMENT_NODE */
export const isHTMLElement = (node: Node | null): node is Et.HTMLElement => node instanceof HTMLElement
export const isElementOrText = (node: Node): node is Element | Text => node.nodeType === 1 || node.nodeType === 3
export const isFragment = (node: Node): node is Et.Fragment => node.nodeType === 11 /** Node.DOCUMENT_FRAGMENT_NODE */
export const isBrElement = (node: Node): node is HTMLBRElement => (node as Et.Node).localName === 'br'
// /**
//  * 判断一个节点是否为效应元素
//  * * 这不是严格的检验方法, 严格的检验需使用 `etcode.check(node)` 方法
//  */
// export const isEtElement = (node: Node): node is Et.EtElement => (node as Et.EtElement).etCode !== void 0
/** 判断一个节点是否不可编辑 (光标无法落入其中) */
export const isNotEditable = (node: Node): boolean => {
  if (['br', 'svg', 'img', 'audio', 'video'].includes((node as HTMLElement).localName)) {
    return true
  }
  if (isText(node)) {
    if (!node.parentElement) {
      return false
    }
    node = node.parentElement
  }
  if (node.isConnected) {
    return !(node as HTMLElement).isContentEditable
  }
  if (node instanceof HTMLElement) {
    return node.contentEditable === 'false'
  }
  return true
}
export const isRawEditElement = (node: Node | null | undefined): node is Et.HTMLRawEditElement => {
  if (!node) {
    return false
  }
  return (node.nodeName === 'INPUT' && (node as HTMLInputElement).type === 'text')
    || (node.nodeName === 'TEXTAREA')
}
export const isNodeBeforeTheOther = (node: Et.Node, other: Et.Node) => node.compareDocumentPosition(other) & 4 /** Node.DOCUMENT_POSITION_FOLLOWING */
/**
 * 判断节点是否是另一节点的直接/间接firstChild; 若俩参数相等, 会返回false
 */
export const isWithinFirst = (node: Et.Node, ancestor: Et.Node) => {
  let child = ancestor.firstChild
  while (child) {
    if (child === node) {
      return true
    }
    child = child.firstChild
  }
  return false
}
/**
 * 判断节点是否是另一节点的直接/间接lastChild; 若俩参数相等, 会返回false
 */
export const isWithinLast = (node: Et.Node, ancestor: Et.Node) => {
  let child = ancestor.lastChild
  while (child) {
    if (child === node) {
      return true
    }
    child = child.lastChild
  }
  return false
}
/**
 * 判断字符串指定位置之前是否全为零宽度字符, 若 offset <= 0, 返回 false
 */
export const isLeadingZWS = (data: string, offset: number) => {
  if (offset <= 0) {
    return false
  }
  while (offset--) {
    if (data[offset] !== HtmlCharEnum.ZERO_WIDTH_SPACE) {
      return false
    }
  }
  return true
}
/**
 * 判断字符串指定位置之后是否全为零宽度字符, 若 offset >= data.length, 返回 false
 */
export const isTrailingZWS = (data: string, offset: number) => {
  if (offset >= data.length) {
    return false
  }
  while (offset < data.length) {
    if (data[offset] !== HtmlCharEnum.ZERO_WIDTH_SPACE) {
      return false
    }
    offset++
  }
  return true
}
/**
 * 判断节点是否为空内容节点, 其定义为: 节点无文本内容, 或文本内容仅包含零宽度字符
 * @param node 待判断节点
 * @returns 若节点为空返回true, 否则返回false
 */
export const isEmptyContentNode = (node: Et.Node) => {
  const data = node.textContent
  return !data || isTrailingZWS(data, 0)
}

/* -------------------------------------------------------------------------- */
/*                                 equal utils                                */
/* -------------------------------------------------------------------------- */

/**
 * 比较两个节点是否相同, 用于判断俩节点是否可合并; 这不同于 Node.isEqualNode, 该方法不比较节点内容;
 * 比较节点类型, 若都是元素, 则使用 isEqualElement 比较
 */
export const isEqualNode = (one: Node, other: Node) => {
  if (one === other) {
    return true
  }
  if (one.nodeType !== other.nodeType) {
    return false
  }
  if (isText(one)) {
    return true
  }
  if (etcode.check(one)) {
    return one.isEqualTo(other as Et.Element)
  }
  if (isElement(one)) {
    return isEqualElement(one, other as Element)
  }
  return false
}
/**
 * 判断两个元素是否类似, 即 元素名、class、除class和style外的html属性、元素对象上的可枚举属性 均相同, 即认为这两个元素相似; 不判断后代
 * @param statusClasses 状态class列表, 比较时需要去除的与节点比较无实际作用的状态class
 */
export const isEqualElement = (el1: Element, el2: Element, statusClasses: string[] = []) => {
  return el1.localName === el2.localName
    && isEqualClass(el1.className, el2.className, statusClasses)
    && isEqualHtmlAttrs(el1, el2)
    && isEqualProperties(el1, el2)
}
/**
 * 判断两个元素的class属性是否相同, 直接传入 el.className 即可 \
 * 会自动过滤全局状态class, CssClassEnum.Active/Selected \
 * @param statusClasses 状态class列表, 比较时需要去除的与节点比较无实际作用的状态class
 * @returns class列表元素集合相同返回true, 否则false
 */
export const isEqualClass = (class1: string, class2: string, statusClasses: string[] = []) => {
  statusClasses.push('', CssClassEnum.Active, CssClassEnum.Selected, CssClassEnum.CaretIn)
  const cls1Set = new Set(class1.split(' '))
  const cls2Set = new Set(class2.split(' '))
  for (const cls of statusClasses) {
    cls1Set.delete(cls)
    cls2Set.delete(cls)
  }
  if (cls1Set.size !== cls2Set.size || cls1Set.union(cls2Set).size !== cls1Set.size) {
    return false
  }
  return true
}
/**
 * 判断俩元素除class和style属性外, 是否相同
 */
export const isEqualHtmlAttrs = (el1: Element, el2: Element) => {
  el1 = el1.cloneNode() as Element
  el2 = el2.cloneNode() as Element
  el1.removeAttribute('class')
  el1.removeAttribute('style')
  el2.removeAttribute('class')
  el2.removeAttribute('style')
  return el1.isEqualNode(el2)
}
/**
 * 判断俩元素对象上的可枚举属性是否相同, 浅比较
 */
export const isEqualProperties = (el1: Element, el2: Element) => {
  const ppt1 = { ...el1 }, ppt2 = { ...el2 }
  const keys1 = Object.keys(ppt1)
  if (keys1.length !== Object.keys(ppt2).length) {
    return false
  }
  for (const k in keys1) {
    if (ppt1[k as keyof typeof ppt1] !== ppt2[k as keyof typeof ppt2]) {
      return false
    }
  }
  return true
}

/* -------------------------------------------------------------------------- */
/*                                 html utils                                 */
/* -------------------------------------------------------------------------- */

/**
 * 返回一个fragment的HTML文本; 可通过Range.createContextualFragment()重新构建fragment
 */
export const fragmentToHTML = (fragment: DocumentFragment) => {
  let html = ''
  for (const child of fragment.childNodes) {
    html += isElement(child) ? child.outerHTML : child.textContent
  }
  return html
}

/** 提取一个元素的所有子节点到片段中 */
export const extractElementContents = (el: Et.HTMLElement) => {
  const df = document.createDocumentFragment() as Et.Fragment
  let child
  while ((child = el.firstChild)) {
    df.appendChild(child)
  }
  return df
}

/**
 * 判断一个字符串(当前光标所在#text节点的data)是否含markdown引用语法, **不判断最后一个括弧)** 即默认最后一个字符是括弧;
 * 即该方法用于在输入`)`后判断前面的文本是否构成链接节点 \
 * 即含有: ` [abc](url "title")`或`![abc](url "title")`; 不匹配返回 undefined
 *
 * 匹配返回解析后的内容 { text, url, title, leftRemainText, rightRemainText }
 * text即`[ ]`内的文本; left/right分别为`[`左边和`)`右边的无文本则为空字符串 \
 *
 * * 为了加以区分, 第一个字符不是`[`时 linkReference的左边需要有一个空格才匹配, 即` [abc](url "title")`
 * * `(`和`!`会尝试匹配全角符号(中文标点)
 *
 * @param data 待匹配的文本
 * @param offset 当前光标位置, 即从此位置向前匹配, 此位置之后都属于right的内容; 默认为data.length
 */
export const checkParseMarkdownReference = (type: 'link' | 'image', data: string, offset = data.length) => {
  let leftSquareIndex = -1
  if (type === 'link') {
    leftSquareIndex = data.lastIndexOf(' [', offset)
    if (leftSquareIndex < 0) {
      if (data[0] === '[') {
        leftSquareIndex = 0
      }
      else {
        return null
      }
    }
  }
  else {
    leftSquareIndex = data.lastIndexOf('![', offset)
    if (leftSquareIndex < 0) {
      leftSquareIndex = data.lastIndexOf('\uff01[' /** ！[ */, offset)
    }
    if (leftSquareIndex < 0) return null
  }

  const rightSquareIndex = data.lastIndexOf(']', offset)
  if (rightSquareIndex < 0) return null

  let leftBracketIndex = data.lastIndexOf('(', offset)
  if (leftBracketIndex < 0) {
    leftBracketIndex = data.lastIndexOf('\uff08' /** （ */, offset)
  }
  if (leftBracketIndex < 0 || leftBracketIndex !== rightSquareIndex + 1) return null

  const text = data.slice(leftSquareIndex + 2, rightSquareIndex)

  const urlTitleArr = data.slice(leftBracketIndex + 1, offset - 1).split(' ')
  if (urlTitleArr.length > 2) return null
  const url = urlTitleArr[0]
  let title = urlTitleArr[1]
  if (title) {
    if (title.startsWith('“')) title = title.slice(1)
    if (title.endsWith('”')) title = title.slice(0, -1)
  }
  else {
    title = ''
  }

  const leftRemainText = data.slice(0, leftSquareIndex)
  const rightRemainText = data.slice(offset)

  return {
    text,
    url,
    title,
    leftRemainText,
    rightRemainText,
  }
}
