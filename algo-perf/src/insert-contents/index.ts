/**
 * 测试在编辑器中任意位置插入内容时, 使用片段方式计算合并插入内容, 与使用字符串方式计算合并插入内容, 的性能对比\
 * 此处暂不考虑插入后的光标位置问题, 仅做初步的性能对比
 */

type Position = Readonly<[Node, number]>
type Contents = DocumentFragment | HTMLElement

// ===================================================================================
// ----------------------------------- by fragment ------------------------------------
// ===================================================================================

const enum UniChar {
  Null = '\u0000',
  ZeroWidthSpace = '\u200B',
}
const isText = (node: Node): node is Text => node.nodeType === 3
const isElement = (node: Node): node is HTMLElement => node.nodeType === 1
const innermostFirstChild = (node: Node) => {
  let child = node.firstChild
  while (child) {
    node = child
    child = node.firstChild
  }
  return node
}
const innermostLastChild = (node: Node) => {
  let child = node.lastChild
  while (child) {
    node = child
    child = node.lastChild
  }
  return node
}

/**
 * 清理片段, 移除空节点, 并规范化
 */
const cleanFragment = (
  df: DocumentFragment,
  skipTags: string[] = ['svg', 'BR', 'IMG', 'MATH'],
  skipSubTree?: (node: Node) => boolean,
) => {
  const removeNodes = [] as ChildNode[]
  const tagSet = new Set(skipTags)
  const walker = document.createTreeWalker(df, 5, (node: Text | HTMLElement) => {
    if (skipSubTree && skipSubTree(node)) {
      return NodeFilter.FILTER_REJECT
    }
    if (tagSet.has(node.nodeName)) {
      return NodeFilter.FILTER_REJECT
    }
    if (isElement(node) && !node.textContent) {
      removeNodes.push(node)
    }
    return NodeFilter.FILTER_SKIP
  })
  while (walker.nextNode()) { /** 遍历所有节点 */ }
  for (const node of removeNodes) {
    node.remove()
  }
  df.normalize()
}

const mergeNode = (node1: Node, node2: Node) => {
  // merge two #text
  if (isText(node1) && isText(node2)) {
    node1.data += node2.data
    node2.remove()
    return
  }
  // merge two elements
  if (isElement(node1) && isElement(node2)) {
    mergeElement(node1, node2)
    return
  }
  // // merge #text and element
  // // 1. find *inner #text* in the start or end edge of the element
  // // 2. if found, merge #text into *inner #text*
  // // 3. if not found, don't merge
  // if (isText(node1) && isElement(node2)) {
  //   const inner = innermostFirstChild(node2)
  //   if (isText(inner)) {
  //     inner.data = node1.data + inner.data
  //     node1.remove()
  //   }
  //   return
  // }
  // if (isElement(node1) && isText(node2)) {
  //   const inner = innermostLastChild(node1)
  //   if (isText(inner)) {
  //     inner.data += node2.data
  //     node2.remove()
  //   }
  //   return
  // }
}
const mergeElement = (el1: HTMLElement, el2: HTMLElement) => {
  if (el1.localName !== el2.localName) {
    return
  }
  const formerEnd = el1.lastChild
  let latterStart = el2.firstChild
  if (formerEnd && latterStart) {
    mergeNode(formerEnd, latterStart)
    latterStart = el2.firstChild
    while (latterStart) {
      el1.appendChild(latterStart)
      latterStart = el2.firstChild
    }
    el2.remove()
  }
}
const mergeFragment = (df1: DocumentFragment, df2: DocumentFragment) => {
  const formerEnd = df1.lastChild
  let latterStart = df2.firstChild
  if (!latterStart) {
    return df1
  }
  if (!formerEnd) {
    return df2
  }
  mergeNode(formerEnd, latterStart)
  latterStart = df2.firstChild
  while (latterStart) {
    df1.appendChild(latterStart)
    latterStart = df2.firstChild
  }
  cleanFragment(df1)
  return df1
}
/**
 * 使用片段合并算法 在 el 内指定位置插入内容并合并前后内容, 返回插入合并后片段;
 * @param include 克隆时是否包含 el 本身, true: 返回片段可能有多个子节点;  false: 返回片段只有一个子节点, 即 el包含合并内容的克隆
 */
const insertContentsAtCaretAndMergeAdjacentByFragment = (
  el: HTMLElement,
  position: Position,
  contents: Contents,
  include: boolean,
) => {
  const [node, offset] = position
  let df = document.createDocumentFragment()
  if (include && !el.parentNode) {
    // 为了让 range 能选择到 el 的外开头/外结尾
    df.appendChild(el)
  }
  const r = document.createRange()
  if (include) {
    r.setStartBefore(el)
  }
  else {
    r.setStart(el, 0)
  }
  r.setEnd(node, offset)
  const df1 = r.cloneContents()
  r.setStart(node, offset)
  if (include) {
    r.setEndAfter(el)
  }
  else {
    r.setEnd(el, el.childNodes.length)
  }
  const df2 = r.cloneContents()
  if (contents.nodeType === 11 /** DOCUMENT_FRAGMENT_NODE */) {
    df = contents as DocumentFragment
  }
  else {
    df.textContent = ''
    df.appendChild(contents)
  }
  df = mergeFragment(df1, df as DocumentFragment)
  df = mergeFragment(df, df2)
  return df
}

// ===================================================================================
// ----------------------------------- by string ------------------------------------
// ===================================================================================

const contentsToHtml = (contents: Contents) => {
  if (contents.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    let html = ''
    for (const node of contents.childNodes) {
      html += (node.nodeType === 3) ? (node as Text).data : (node as HTMLElement).outerHTML
    }
    return html
  }
  if (contents instanceof HTMLElement) {
    return contents.outerHTML
  }
  return ''
}
const mergeFragmentString = (html1: string, html2: string) => {
  html1 = html1.trim()
  html2 = html2.trim()
  if (!html1.endsWith('>') || !html2.startsWith('<')) {
    return html1 + html2
  }
  let i = html1.lastIndexOf('</'), j = html1.length, k = 0, preEnd = html1.length
  while (i > 0) {
    // let tag be <div instead of </div>, for that may has attribute
    const tag = '<' + html1.slice(i + 2, j - 1)
    if (tag !== html2.slice(k, tag.length + k)) {
      break
    }
    k = html2.indexOf('>', k) + 1
    j = i
    preEnd = i
    if (html1[i - 1] !== '>') {
      break
    }
    i = html1.lastIndexOf('</', i - 1)
  }
  return html1.slice(0, preEnd) + html2.slice(k)
}

/**
 * 在节点指定位置插入内容, 要求插入的内容允许插入该位置, 此方法不考虑合并问题; 用于在段落中插入不含段落的片段
 */
const insertContentsAtCaretAndByString = (
  el: HTMLElement,
  position: Position,
  contents: Contents,
) => {
  const [node, offset] = position
  let restore: () => void
  if (isText(node)) {
    node.data = node.data.slice(0, offset) + UniChar.Null + node.data.slice(offset)
    restore = () => {
      node.data = node.data.slice(0, offset) + node.data.slice(offset + 1)
    }
  }
  else {
    const child = node.childNodes.item(offset)
    const text = document.createTextNode(UniChar.Null)
    node.insertBefore(text, child)
    restore = () => {
      text.remove()
    }
  }
  let html = el.innerHTML
  const [h1, h2] = html.split(UniChar.Null)
  html = contentsToHtml(contents)
  html = h1 + html + h2
  restore()
  return document.createRange().createContextualFragment(html)
}
/**
 * 使用字符串合并算法 在 el 内指定位置插入内容并合并前后内容, 返回插入合并后片段; 用于在段落中插入含有段落的片段
 */
const insertContentsAtCaretAndMergeAdjacentByString = (
  el: HTMLElement,
  position: Position,
  contents: Contents,
) => {
  const [node, offset] = position
  let restore: () => void
  let html = '', formerTailing = '', latterLeading = '', p: Element
  if (isText(node)) {
    p = node.parentElement
    node.data = node.data.slice(0, offset) + UniChar.Null + node.data.slice(offset)
    restore = () => {
      node.data = node.data.slice(0, offset) + node.data.slice(offset + 1)
    }
  }
  else {
    p = node as Element
    const child = node.childNodes.item(offset)
    const text = document.createTextNode(UniChar.Null)
    node.insertBefore(text, child)
    restore = () => {
      text.remove()
    }
  }
  const cloneParents = [] as Element[]
  while (p && p !== el) {
    cloneParents.push(p.cloneNode(false) as Element)
    p = p.parentElement
  }
  const cloneP = el.cloneNode(false) as Element
  if (cloneP) {
    let curr = cloneP
    while ((p = cloneParents.pop() as Element)) {
      curr.appendChild(p)
      curr = p
    }
    html = cloneP.outerHTML
    const i = html.indexOf('></') // 应该不会将哪个 html 属性值设置为含有 '></' 吧 ??
    if (i > 0) {
      latterLeading = html.slice(0, i + 1)
      formerTailing = html.slice(i + 1)
    }
    else {
      throw Error('a unexpected html')
    }
  }
  html = el.outerHTML
  let [h1, h2] = html.split(UniChar.Null)
  h1 += formerTailing
  h2 = latterLeading + h2
  html = contentsToHtml(contents)
  html = mergeFragmentString(h1, html)
  html = mergeFragmentString(html, h2)
  restore()
  const df = document.createRange().createContextualFragment(html)
  cleanFragment(df)
  return df
}

export {
  contentsToHtml,
  insertContentsAtCaretAndByString,
  insertContentsAtCaretAndMergeAdjacentByFragment,
  insertContentsAtCaretAndMergeAdjacentByString,
  mergeFragment,
  mergeFragmentString,
}
