// import type * as Et from '@/effitor/@types'

// import { BuiltinElName, CssClassEnum, EtTypeEnum, HtmlCharEnum } from '../@types/constant'
// import cr from '../caretRange'
// import { EffectElement, etcode, EtParagraphElement } from '../element/index'

// /* -------------------------------------------------------------------------- */
// /*                                 check utils                                */
// /* -------------------------------------------------------------------------- */

// export const isTextNode = (node?: Et.NullableNode): node is Text => node?.nodeType === Node.TEXT_NODE
// export const isElementNode = (node?: Et.NullableNode | EventTarget): node is HTMLElement => (node as Node)?.nodeType === Node.ELEMENT_NODE
// export const isBlockElement = (node?: Et.NullableNode): node is HTMLElement => isElementNode(node) && node.computedStyleMap().get('display')?.toString().search('inline') === -1
// export const isBrElement = (node?: Et.NullableNode): node is HTMLBRElement => (node as HTMLElement)?.tagName === 'BR'
// /** 该方法主要用于判断页面中的节点是否可编辑; 若用于判断DocumentFragment或游离节点, 则结果不一定准确 */
// export const isEditableNode = (node: Node) => isElementNode(node) ? node.isContentEditable : node.parentElement?.isContentEditable

// /* -------------------------------------------------------------------------- */
// /*                                 node utils                                 */
// /* -------------------------------------------------------------------------- */

// export const zwsText = () => new Text(HtmlCharEnum.ZERO_WIDTH_SPACE)
// /** 克隆一个et元素节点 并去除状态class */
// export const cloneEtElement = <T extends Et.EtElement>(el: T, deep = false): T => removeStatusClassForEl(el.cloneNode(deep) as any)
// /**
//  * 克隆一个et段落元素, 去除(id, 状态class)
//  * * 该方法不仅会克隆指定元素html属性, 还会克隆其js对象的 可枚举属性
//  */
// export const cloneEtParagraph = <T extends EtParagraphElement>(origin: T): T => {
//   // 浅克隆 元素名 + 属性
//   const clone = origin.cloneNode(false) as T
//   // 去掉特有属性
//   clone.removeAttribute('id')
//   // 去掉状态class
//   return removeStatusClassForEl(clone)
// }

// /* -------------------------------------------------------------------------- */
// /*                                search utils                                */
// /* -------------------------------------------------------------------------- */

// /**
//  * 向上（包括自身）找指定类型父节点
//  * @param pTag 小写标签名
//  * @param stopTag 小写元素标签名
//  */
// export const findParentByTag = (node: Et.NullableNode, pTag: string, stopTag: string = BuiltinElName.ET_BODY): EtParagraphElement | null => {
//   if (!node) return null
//   if (isElementNode(node)) {
//     if (node.localName === stopTag) return null
//     if (node.localName === pTag) return node as EtParagraphElement
//   }
//   return findParentByTag(node.parentElement, pTag, stopTag)
// }
// /**
//  * 从当前节点向上找最近的匹配选择器的祖先元素，包括自身
//  * @param pNode 限定在指定祖先之下查找，null时不限制
//  */
// export const closestUnderTheNode = (node: Et.NullableNode, selectors: string, pNode: Et.NullableNode): Et.NullableElement => {
//   if (!node) return null
//   if (isElementNode(node) && node.matches(selectors)) return node
//   while (node && node !== pNode) {
//     node = node.parentElement
//     if (node !== null && (node as HTMLElement).matches(selectors)) return node as HTMLElement
//   }
//   return null
// }
// /**
//  * 向上统计特定节点，返回这些节点的数组，包括自身
//  */
// export const outerElements = <T extends HTMLElement>(node: Et.NullableNode, pTag: keyof Et.DefinedEtElementMap | keyof HTMLElementTagNameMap, stopTag: string = BuiltinElName.ET_BODY): T[] => {
//   if (!node) return []
//   let el = isElementNode(node) ? node : node.parentElement
//   const arr = []
//   while (el) {
//     if (el.localName === pTag) {
//       arr.push(el)
//     }
//     if (el.localName === stopTag) return arr as T[]
//     el = el.parentElement
//   }
//   return arr as T[]
// }
// /**
//  * 递归查找以当前节点为`lastChild`的最近祖先节点, 若node不是`lastChild`, 则返回自己; \
//  * * 当且仅当node是et-body时返回null
//  * @param node 必须是编辑器区（et-body）内节点
//  * @param stopTag 小写元素标签名
//  */
// export const outermostAncestorAtEndEdge = (node: Node): Node | null => {
//   if ((node as HTMLElement).localName === BuiltinElName.ET_BODY) return null
//   while (node.parentElement) {
//     if (node.parentElement.localName === BuiltinElName.ET_BODY) return node
//     if (node.parentElement.lastChild !== node) break
//     node = node.parentElement
//   }
//   return node
// }
// /**
//  * 同`outermostAncestorAtEndEdge` \
//  * * 当且仅当node是et-body时返回null
//  */
// export const outermostAncestorAtStartEdge = (node: Node): Node | null => {
//   if ((node as HTMLElement).localName === BuiltinElName.ET_BODY) return null
//   while (node.parentElement) {
//     if (node.parentElement.localName === BuiltinElName.ET_BODY) return node
//     if (node.parentElement.firstChild !== node) break
//     node = node.parentElement
//   }
//   return node
// }

// /**
//  * 递归查找以当前节点为`firstChild/lastChild`的最近内联祖先节点, 若node不是`firstChild/lastChild`或不是内联节点, 则返回自身(即可能返回块节点)
//  * 返回的节点可能匹配 `stopTag`,
//  * @param stopTag 小写元素标签名
//  */
// export const outermostInlineAncestorAtEdge = (node: Et.HTMLNode, edge: 'start' | 'end', stopTag: string = BuiltinElName.ET_BODY): Et.HTMLNode => {
//   // todo need refactor
//   const edgeChild = edge === 'start' ? 'firstChild' : 'lastChild'
//   if (isElementNode(node) && (node.localName === stopTag || isBlockElement(node))) return node
//   if (node.parentElement?.[edgeChild] === node) {
//     if (isBlockElement(node.parentElement)) return node
//     return outermostInlineAncestorAtEdge(node.parentElement, edge, stopTag) ?? node.parentElement
//   }
//   return node
// }
// // /**
// //  * 找当前节点在指定选择器祖先节点下的最外层祖先, 如果自身匹配选择器, 则返回自身
// //  */
// // export const outermostAncestorUnderSelector = (node: Node, selector: string, stopSelector: string = BuiltinElName.ET_BODY): Node => {
// //     if (isElementNode(node) && (node.matches(selector) || node.matches(stopSelector))) return node
// //     if (node.parentElement) {
// //         if (node.parentElement.matches(selector) || node.parentElement.matches(stopSelector)) return node
// //         return outermostAncestorUnderSelector(node.parentElement, selector)
// //     }
// //     return node
// // }

// /**
//  * 找最外层不可编辑元素
//  */
// export const outermostUneditableAncestor = (node: Node): Node => {
//   if (!node.parentElement || node.parentElement.isContentEditable) return node
//   return outermostUneditableAncestor(node.parentElement)
// }

// /**
//  * 找最里层firstChild
//  */
// export const innermostStartingNode = (node: Node): Node => {
//   if (node.firstChild) return innermostStartingNode(node.firstChild)
//   return node
// }
// /**
//  * 找最里层lastChild
//  */
// export const innermostEndingNode = (node: Node): Node => {
//   if (node.lastChild) return innermostEndingNode(node.lastChild)
//   return node
// }
// /**
//  * 找最里层最后一个Text节点
//  */
// export const innermostEndingTextNode = (node: Node): Text | null => {
//   let cur: Text | null = null
//   traverseNode(node, (next) => {
//     cur = next
//   }, { whatToShow: NodeFilter.SHOW_TEXT })
//   return cur
// }
// /**
//  * 找文档树的上一个节点（前兄弟或最近一个有前兄弟的祖先的前兄弟的最里层lastChild）
//  */
// export const treePrevNode = (node: Node): Node | null => {
//   if (node.previousSibling) return innermostEndingNode(node.previousSibling)
//   if (node.parentElement) return treePrevNode(node.parentElement)
//   return null
// }
// /**
//  * 找文档树的下一个节点（后兄弟或最近一个有后兄弟的祖先的后兄弟的最里层firstChild）
//  */
// export const treeNextNode = (node: Node): Node | null => {
//   if (node.nextSibling) return innermostStartingNode(node.nextSibling)
//   if (node.parentElement) return treeNextNode(node.parentElement)
//   return null
// }

// /* -------------------------------------------------------------------------- */
// /*                               fragment utils                               */
// /* -------------------------------------------------------------------------- */

// /* -------------------------------------------------------------------------- */
// /*                                    html                                    */
// /* -------------------------------------------------------------------------- */

// /**
//  * 判断当前文本节点是否以零宽字符开头或结尾; 用于当光标位于第一个字符后backspace 或倒数第二个字符前Delete时, 让光标跳过此zws而不是将其删除; 用于提升编辑体验
//  *  * **调用前提`range.collapsed === true`**
//  */
// export const checkAbutZeroWidthSpace = (text: Text, offset: number, isBackward: boolean) => {
//   const data = text.data
//   if (!data.length || offset > data.length) {
//     return false
//   }
//   if (isBackward) {
//     return offset === 1
//       && data[0] === HtmlCharEnum.ZERO_WIDTH_SPACE
//       && data[1] !== HtmlCharEnum.ZERO_WIDTH_SPACE
//   }
//   return offset === text.length - 1
//     && data[offset] === HtmlCharEnum.ZERO_WIDTH_SPACE
//     && data[offset - 1] !== HtmlCharEnum.ZERO_WIDTH_SPACE
// }
// /**
//  * 转义HTML字符
//  * @param str 可能含<>等字符的字符串
//  * @param parseLFToBr 若为true, 则`\n`将被解析为`<br>` ; 默认`false`
//  */
// export const escapeHTML = (str: string, parseLFToBr = false) => {
//   const div = document.createElement('div')
//   if (parseLFToBr) {
//     // 设置innerText时会将'\n'|'\r\n'转为为<br>
//     div.innerText = str
//   }
//   else {
//     div.textContent = str
//   }
//   return div.innerHTML
// }

// /**
//  * 判断一个字符串(当前光标所在#text节点的data)是否含markdown引用语法, **不判断最后一个括弧)** 即默认最后一个字符是括弧 \
//  * 即含有: ` [abc](url "title")`或`![abc](url "title")`; 不匹配返回 undefined \
//  * 匹配返回解析后的内容 { text, url, title, leftRemainText, rightRemainText } text即`[ ]`内的文本; left/right分别为`[`左边和`)`右边的无文本则为空字符串 \
//  * * 为加以区分, linkReference的左边需要有一个空格才匹配, 即` [abc](url "title")`
//  * @param data 待匹配的文本
//  * @param offset 当前光标位置, 即从此位置向前匹配, 此位置之后都属于right的内容; 默认为data.length
//  */
// export const checkParseMarkdownReference = (type: 'link' | 'image', data: string, offset = data.length) => {
//   let leftSquareIndex = -1
//   if (type === 'link') {
//     leftSquareIndex = data.lastIndexOf(' [', offset)
//     if (leftSquareIndex < 0) return
//   }
//   else {
//     leftSquareIndex = data.lastIndexOf('![', offset)
//     if (leftSquareIndex < 0) {
//       leftSquareIndex = data.lastIndexOf('\uff01[' /** ！[ */, offset)
//     }
//     if (leftSquareIndex < 0) return
//   }

//   const rightSquareIndex = data.lastIndexOf(']', offset)
//   if (rightSquareIndex < 0) return

//   let leftBracketIndex = data.lastIndexOf('(', offset)
//   if (leftBracketIndex < 0) {
//     leftBracketIndex = data.lastIndexOf('\uff08' /** （ */, offset)
//   }
//   if (leftBracketIndex < 0 || leftBracketIndex !== rightSquareIndex + 1) return

//   const text = data.slice(leftSquareIndex + 2, rightSquareIndex)

//   const urlTitleArr = data.slice(leftBracketIndex + 1, offset - 1).split(' ')
//   if (urlTitleArr.length > 2) return
//   const url = urlTitleArr[0]
//   let title = urlTitleArr[1]
//   if (title) {
//     if (title.startsWith('“')) title = title.slice(1)
//     if (title.endsWith('”')) title = title.slice(0, -1)
//   }
//   else {
//     title = ''
//   }

//   const leftRemainText = data.slice(0, leftSquareIndex)
//   const rightRemainText = data.slice(offset)

//   return {
//     text,
//     url,
//     title,
//     leftRemainText,
//     rightRemainText,
//   }
// }

// // /**
// //  * 替换html里的标签名为指定标签(必须是成对标签); 并插入指定属性（可选）
// //  */
// // export const replaceTagNameOfHTML = (html: string, srcTag: string, destTag: string, attrs?: string) => {
// //     // 贪心匹配
// //     const pattern = RegExp(`<${srcTag}.*>(.*)</${srcTag}>`, `g`)
// //     let replaced = true
// //     // 遍历替换嵌套标签
// //     while (replaced) {
// //         replaced = false
// //         html = html.replace(pattern, ($0, $1) => {
// //             replaced = true
// //             return `<${destTag} ${attrs ?? ''}>${$1}</${destTag}>`
// //         })
// //     }
// //     return html
// // }
