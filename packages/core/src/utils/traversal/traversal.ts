import { BuiltinElName } from '@effitor/shared'

import type { Et } from '../../@types'
import { dom } from '../dom'

type TreeWalkNode<T> = T extends 1 ? Et.Element : T extends 4 ? Et.Text : T extends 5 ? Et.Node : never
type TraversalWalk<T> = (node: TreeWalkNode<T>) => TrueOrVoid
interface TraversalOptions<T> {
  whatToShow?: T
  filter?: ((node: TreeWalkNode<T>) => 1 | 2 | 3) | null
}

/**
 * 找到 Range 边缘被部分选择的节点 (partial_node), 该节点必定是 commonAncestorContainer 的子节点\
 * 当startContainer/endContainer 就是 commonAncestorContainer 时, 该边缘 partial_node 为 null\
 * https://dom.spec.whatwg.org/#partially-contained
 * @returns 一个元组, 仅当相应边缘节点不是 commonAncestorContainer 时非 null
 */
const partialSelectedNodeOfRange = (range: Range): [Node | null, Node | null] => {
  const { startContainer, endContainer, commonAncestorContainer } = range
  if (startContainer === endContainer) {
    return [null, null]
  }
  let startPartial = null, endPartial = null
  if (endContainer !== commonAncestorContainer) {
    endPartial = endContainer
    while (endPartial) {
      if (endPartial.parentNode === commonAncestorContainer) {
        break
      }
      endPartial = endPartial.parentNode
    }
  }
  if (startContainer !== commonAncestorContainer) {
    startPartial = startContainer
    while (startPartial) {
      if (startPartial.parentNode === commonAncestorContainer) {
        break
      }
      startPartial = startPartial.parentNode
    }
  }
  return [startPartial, endPartial]
}

/**
 * 遍历Range 选中的节点 (包含被部分选择的节点)
 * * 该遍历不是严格按照文档树顺序的, 有些子节点可能比父节点先遍历 (如startContainer和其父节点)
 * * Range遍历无法提前结束
 * @param walk 遍历回调
 * @param options 遍历选项\
 *      options.whatToShow 显示哪些节点, 1: 元素, 4: #text, 5: 包含两者\
 *      options.filter 过滤回调, 返回 1 时接受节点, 2 时拒绝节点及其子树, 3 时跳过节点, 继续遍历其后代节点;\
 *      filter 的参数 node是经过 whatToShow 过滤后的节点; walk 参数是经过 filter 过滤后的节点
 */
export const traverseRange = <T extends 1 | 4 | 5 = 5>(
  range: Range,
  walk: TraversalWalk<T>,
  {
    whatToShow = 5 as T /** (NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT) */,
    filter = null,
  }: TraversalOptions<T> = {},
) => {
  type Filter = (node: Node) => 1 | 2 | 3

  if (range.collapsed) return
  const fullSelectedNodes = []
  const { startContainer, startOffset, endContainer, endOffset } = range
  const filterAccess = filter
    ? (node: Node) => {
        if (filter(node as TreeWalkNode<T>) === 1) {
          walk(node as TreeWalkNode<T>)
        }
      }
    : (node: Node) => {
        walk(node as TreeWalkNode<T>)
      }
  const showToFilterAccess = (node: Node) => {
    if (dom.isText(node)) {
      if (whatToShow & 4) {
        filterAccess(node)
      }
    }
    else {
      if (whatToShow & 1) {
        filterAccess(node)
      }
    }
  }

  // 获取起止部分选择节点 [`partial_node`](https://dom.spec.whatwg.org/#partially-contained)
  const [startPartial, endPartial] = partialSelectedNodeOfRange(range)
  // 记录被 range完全选择的节点
  // startPartial endPartial 若非空, 必定都是 commonAncestor 的子节点
  // 若为空, 则必定是 commonAncestor
  if (startPartial === null && endPartial === null) { // startContainer === endContainer
    if (dom.isText(startContainer)) {
      if (whatToShow & 4) {
        filterAccess(startContainer)
      }
      return
    }
    else {
      for (let i = startOffset; i < endOffset; i++) {
        fullSelectedNodes.push(startContainer.childNodes.item(i))
      }
    }
  }
  else {
    let nextFullSelected = startPartial ? startPartial.nextSibling : startContainer.childNodes.item(startOffset)
    const stopNode = endPartial ? endPartial : endContainer.childNodes.item(endOffset)
    while (nextFullSelected) {
      if (nextFullSelected === stopNode) break
      fullSelectedNodes.push(nextFullSelected)
      nextFullSelected = nextFullSelected.nextSibling
    }
  }

  // 获取起止节点 及 是否需要访问起止节点
  let startNode, endNode, accessStart = true, accessEnd = false
  if (dom.isText(startContainer)) {
    startNode = startContainer
    accessStart = startNode.length !== startOffset
  }
  else {
    startNode = startContainer.childNodes.item(startOffset)
    if (!startNode) {
      // range 从 startContainer 内结尾开始选, 视为未包含 startContainer
      startNode = startContainer
      accessStart = false
    }
  }
  if (dom.isText(endContainer)) {
    endNode = endContainer
    accessEnd = endNode.length !== 0
  }
  else {
    endNode = endContainer.childNodes.item(endOffset)
    if (!endNode) {
      // range 选到了 endContainer 内结尾, 视为将 endContainer 包含
      endNode = endContainer
      accessEnd = true
    }
  }

  // 遍历开端部分选择节点
  if (startPartial) {
    const walkNode = (node: Node) => {
      if (dom.isText(node)) {
        if (whatToShow & 4) {
          filterAccess(node)
        }
      }
      else if (node.childNodes.length === 0) {
        if (whatToShow & 1) {
          filterAccess(node)
        }
      }
      else {
        const walker = document.createTreeWalker(node, 5, filter as Filter)
        do {
          showToFilterAccess(walker.currentNode)
        } while (walker.nextNode())
      }
    }
    let currNode = startNode as Node | null
    if (accessStart) {
      walkNode(startNode)
    }
    while (currNode && currNode !== startPartial) {
      let nextNode = currNode.nextSibling
      while (nextNode) {
        walkNode(nextNode)
        nextNode = nextNode.nextSibling
      }
      currNode = currNode.parentNode as Node
      if (whatToShow & 1) {
        filterAccess(currNode)
      }
    }
  }
  // 遍历被 Range 完全包含的节点
  for (const node of fullSelectedNodes) {
    const walker = document.createTreeWalker(node, 5, filter as Filter)
    do {
      showToFilterAccess(walker.currentNode)
    } while (walker.nextNode())
  }
  // 遍历末端部分选择节点
  if (endPartial) {
    // 顺序遍历
    const walker = document.createTreeWalker(endPartial, 5, filter as Filter)
    do {
      if (walker.currentNode === endNode) {
        if (accessEnd) {
          showToFilterAccess(walker.currentNode)
        }
        break
      }
      showToFilterAccess(walker.currentNode)
    } while (walker.nextNode())
  }
}

/**
 * 按文档树顺序遍历子树
 * @param node 子树根节点, 遍历不包含此节点
 * @param walk 遍历回调, 返回 true 时停止遍历
 * @param options 遍历选项\
 *    options.whatToShow 显示哪些节点, 1: 元素, 4: #text, 5: 包含两者\
 *    options.filter 过滤回调, 返回 1 时接受节点, 2 时拒绝节点及其子树, 3 时跳过节点, 继续遍历其后代节点;\
 *    filter 的参数 node是经过 whatToShow 过滤后的节点; walk 参数是经过 filter 过滤后的节点
 */
export const traverseNode = <T extends 1 | 4 | 5 = 5>(
  node: Node,
  walk?: TraversalWalk<T> | null,
  {
    whatToShow = 5 as T /** (NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT) */,
    filter = null,
  }: TraversalOptions<T> = {},
) => {
  const treeWalker = document.createTreeWalker(node, whatToShow, filter as (node: Node) => number)
  if (walk) {
    while (treeWalker.nextNode()) {
      if (walk(treeWalker.currentNode as TreeWalkNode<T>)) return
    }
  }
  else if (filter) {
    while (treeWalker.nextNode()) { /** traversal just access filter */ }
  }
}

/* -------------------------------------------------------------------------- */
/*                                search utils                                */
/* -------------------------------------------------------------------------- */

/**
 * 获取文档树顺序下的下一个节点
 */
export const treeNextNode = (node: Et.Node): Et.Node | null => {
  let next = node.firstChild
  if (next) {
    return next
  }
  next = node.nextSibling
  if (next) {
    return next
  }
  let nextParent = node.parentNode
  while (nextParent) {
    next = nextParent.nextSibling
    if (next) {
      return next
    }
    nextParent = nextParent.parentNode
  }
  return null
}
/**
 * 获取文档树顺序下的上一个节点
 */
export const treePrevNode = (node: Et.Node): Et.Node | null => {
  let prev = node.previousSibling
  if (prev) {
    let child = prev.lastChild
    while (child) {
      prev = child
      child = child.lastChild
    }
    return prev
  }
  return node.parentNode
}
/**
 * 获取节点在文档树顺序的下一个兄弟节点 (有亲兄弟返回亲兄弟, 没有亲兄弟返回第一个有后兄弟的祖先的后兄弟)
 */
export const treeNextSibling = (node: Et.Node): Et.Node | null => {
  let next = node.nextSibling
  if (next) {
    return next
  }
  let p = node.parentNode
  while (p) {
    next = p.nextSibling
    if (next) {
      return next
    }
    p = p.parentNode
  }
  return null
}

/* ------------------------------ outer utils ------------------------------ */

/**
 * 当前节点在指定祖先节点下的最外层祖先, 是自己返回自身 否则返回值不会等于stopNode;  \
 * 可用于`Range`找`start/endContainer`在`commonAncestor`下的最外层祖先
 */
export const outermostAncestorUnderTheNode = (
  node: Et.Node, stopNode: Et.HTMLElement): Et.HTMLElement => {
  if (node === stopNode) return node
  let p = node.parentNode
  while (p && p !== stopNode) {
    node = p
    p = p.parentNode
  }
  return node as Et.HTMLElement
}
/**
 * 递归找以当前节点为唯一子节点的祖先, 有兄弟则返回自身
 * @param stopTag 小写元素标签名
 * * **仅当返回节点是传入的`node`时可能匹配`stopTag`**
 */
export const outermostAncestorWithSelfAsOnlyChild = (
  node: Et.Node, stopTag: string = BuiltinElName.ET_BODY): Et.Node => {
  if (node.localName === stopTag) {
    return node
  }
  let p = node.parentNode
  while (p && p.childNodes.length === 1 && p.localName !== stopTag) {
    node = p
    p = p.parentNode
  }
  return node
}
/**
 * 在特定节点下, 递归找以当前节点为唯一子节点的祖先, 有兄弟则返回自身
 * @param node 起始节点
 * @param underWhich 特定节点
 * @param stopTag 小写元素标签名
 * * **仅当返回节点是传入的`node`时可能等于`underWhich`或匹配`stopTag`**
 */
export const outermostAncestorWithSelfAsOnlyChildButUnder = (
  node: Et.Node, underWhich: Et.Element, stopTag: string = BuiltinElName.ET_BODY,
): Et.Node => {
  if (node === underWhich || node.localName === stopTag) {
    return node
  }
  let p = node.parentNode
  while (p && p.childNodes.length === 1 && p !== underWhich && p.localName !== stopTag) {
    node = p
    p = p.parentNode
  }
  return node
}

/**
 * 找最近的可编辑祖先节点, 若不存在则返回自身; 该方法只对在页面上的节点有效,
 * 因为不在页面上的html 元素, 其isContentEditable属性始终为 false
 * @param node 起始节点
 * @param stopTag 小写元素标签名, 默认为`et-body`
 * @returns 可编辑祖先节点, 若不存在则返回自身
 */
export const closestEditableAncestor = (node: Et.Node, stopTag = BuiltinElName.ET_BODY) => {
  if (dom.isHTMLElement(node) && node.isContentEditable) {
    return node
  }
  let p = node.parentElement
  while (p) {
    if (p.isContentEditable || p.localName === stopTag) {
      return p
    }
    p = p.parentElement
  }
  return node
}

/**
 * 找当前节点在编辑区根节点下的所有匹配searchTag的祖先元素节点, 若未提供searchTag,
 * 则返回所有祖先节点;
 * 返回结果始终不包含编辑区根节点(et-body)
 * @param node 起始节点, 若为元素节点, 则从该节点开始搜索(即结果可能包含此节点)
 * @param searchTag 需要查找的元素的小写标签名
 */
export const outerElements = <T extends HTMLElement>(
  node: Et.Node,
  searchTag?: keyof Et.DefinedEtElementMap | keyof HTMLElementTagNameMap,
  stopTag = BuiltinElName.ET_BODY,
): T[] => {
  const elements: Et.HTMLElement[] = []
  let p = node.nodeType === 1 ? node : node.parentElement
  if (searchTag) {
    while (p) {
      if (p.localName === stopTag) {
        break
      }
      if (p.localName === searchTag) {
        elements.push(p as Et.HTMLElement)
      }
      p = p.parentElement
    }
  }
  else {
    while (p) {
      if (p.localName === stopTag) {
        break
      }
      elements.push(p as Et.HTMLElement)
      p = p.parentElement
    }
  }
  return elements as unknown as T[]
}

/* ------------------------------ inner utils ------------------------------ */

export const innermostFirstChild = (node: Et.Node): Et.Node => {
  while (node.hasChildNodes()) {
    node = node.firstChild as Et.Node
  }
  return node
}
export const innermostLastChild = (node: Et.Node): Et.Node => {
  while (node.hasChildNodes()) {
    node = node.lastChild as Et.Node
  }
  return node
}
/**
 * 获取一个节点位置对应的最内层位置; 若 node 不是 HTML 元素或#text节点, 将会向外查找
 */
export const innermostPosition = (node: Et.Node, offset: number): Et.Position => {
  if (dom.isText(node)) {
    return { container: node, offset }
  }
  // 判断 = 0 要先于 = node.childNodes.length; 避免无子节点时将 0 定位到 1
  if (offset === 0) {
    node = innermostFirstChild(node)
    return { container: node, offset: 0 }
  }
  if (offset === node.childNodes.length) {
    node = innermostLastChild(node)
    // 这里若 node 无子节点, 将 offset 标记为 1 以标识位置在该节点之后; 如<br> 等空节点
    return { container: node, offset: dom.isText(node) ? node.length : 1 }
  }
  return { container: innermostFirstChild(node.childNodes.item(offset)), offset: 0 }
}
/**
 * 找可编辑元素的最里层firstChild, 该 firstChild 可能不可编辑, 没有子节点或不可编辑则返回自身
 */
export const innermostEditableFirstChild = (node: Et.Node): Et.Node => {
  let next = node as Et.NodeOrNull
  while (next) {
    if (!dom.isElement(next)) return next
    // 明确声明不可编辑, svg元素不可编辑 isContentEditable 为 undefined
    if ((next as HTMLElement).isContentEditable === void 0
      || next.getAttribute('contenteditable') === 'false'
    ) {
      return next
    }
    // 可编辑 有子节点
    node = next
    next = next.firstChild
  }
  // 无子节点 或是一个Text
  return node
}
/**
 * 找可编辑的最里层lastchild, 没有子节点或`contenteditable=false`则返回自身
 */
export const innermostEditableLastChild = (node: Et.Node): Et.Node => {
  let next = node as Et.NodeOrNull
  while (next) {
    if (!dom.isElement(next)) return next
    if ((next as HTMLElement).isContentEditable === void 0
      || next.getAttribute('contenteditable') === 'false'
    ) {
      return next
    }
    node = next
    next = next.lastChild
  }
  return node
}
