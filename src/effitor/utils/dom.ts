import type * as Et from "@/effitor/@types";
import { BuiltinElName, BuiltinElType, CssClassEnum, HtmlCharEnum } from '../@types/constant';
import { EffectElement, EtParagraphElement } from '../element/index';

export const isTextNode = (node?: Et.NullableNode): node is Text => node?.nodeType === Node.TEXT_NODE
export const isElementNode = (node?: Et.NullableNode): node is HTMLElement => node?.nodeType === Node.ELEMENT_NODE
export const isBlockElement = (node?: Et.NullableNode): node is HTMLElement => isElementNode(node) && node.computedStyleMap().get('display')?.toString() === 'block'
export const isBrElement = (node?: Et.NullableNode): node is HTMLBRElement => (node as HTMLElement)?.tagName === 'BR'

export const isEtElement = (node?: Et.NullableNode): node is EffectElement => (node as HTMLElement)?.elType !== undefined
export const isEtParagraph = (node?: Et.NullableNode | EventTarget): node is EtParagraphElement => node instanceof HTMLElement && node.elType === BuiltinElType.PARAGRAPH

export const isEditableNode = (node: Node) => isElementNode(node) ? node.isContentEditable : node.parentElement?.isContentEditable

export const cloneParagraph = (p: EtParagraphElement, deep = false): EtParagraphElement => removeStatusClassOfEl(p.cloneNode(deep) as EtParagraphElement)
export const removeStatusClassOfEl = <E extends HTMLElement>(el: E): E => (el.classList.remove(CssClassEnum.Active, CssClassEnum.Selected), el)


export const zwsText = () => new Text(HtmlCharEnum.ZERO_WIDTH_SPACE)

/**
 * 让target发送一个InputEvent, 可冒泡/可取消
 */
export const dispatchInputEvent = (target: EventTarget, type: 'beforeinput' | 'input', init: InputEventInit & { inputType: `${Et.InputType}` }) => {
    return target.dispatchEvent(new InputEvent(type, {
        bubbles: true,
        cancelable: true,
        ...init,
    }));
}
/**
 * 向上（包括自身）找第一个`EffectElement`
 * @param stopTag 小写元素标签名
 * 返回的节点可能匹配 `stopTag`, 
 */
export const findEffectParent = (node: Et.NullableNode, stopTag: string = BuiltinElName.ET_BODY): EffectElement | null => {
    if (!node) return null
    if (isEtElement(node)) return node
    if (isElementNode(node) && node.localName === stopTag) return null
    return findEffectParent(node.parentElement, stopTag)
}
/**
 * 向上（包括自身）找段落父节点
 * @param pTag 段落小写标签名
 * @param stopTag 小写元素标签名
 */
export const findParagraphParent = (node: Et.NullableNode, pTag: string, stopTag: string = BuiltinElName.ET_BODY): EtParagraphElement | null => {
    if (!node) return null
    if (isElementNode(node)) {
        if (node.localName === stopTag) return null
        if (node.localName === pTag) return node as EtParagraphElement
    }
    return findParagraphParent(node.parentElement, pTag, stopTag)
}
/**
 * 从当前节点向上找最近的匹配选择器的祖先元素，包括自身  
 * @param pNode 限定在指定祖先之下查找，null时不限制
 */
export const closestUnderTheNode = (node: Et.NullableNode, selectors: string, pNode: Et.NullableNode): Et.NullableElement => {
    if (!node) return null
    if (isElementNode(node) && node.matches(selectors)) return node
    while (node && node !== pNode) {
        node = node.parentElement
        if (node !== null && (node as HTMLElement).matches(selectors)) return node as HTMLElement
    }
    return null
}
/**
 * 递归查找以当前节点为`firstChild/lastChild`的最近祖先节点, 若node不是`firstChild/lastChild`, 则返回自己;   
 * 返回的节点可能匹配 `stopTag`, 
 * @param stopTag 小写元素标签名
 */
export const outermostAncestorAtEdge = (node: Node, edge: 'start' | 'end', stopTag: string = BuiltinElName.ET_BODY): Node => {
    return edge === 'end' ? outermostAncestorAtEndEdge(node, stopTag) : outermostAncestorAtStartEdge(node, stopTag)
}
const outermostAncestorAtEndEdge = (node: Node, stopTag: string = BuiltinElName.ET_BODY): Node => {
    if ((node as HTMLElement).localName === stopTag) return node
    if (node.parentElement?.lastChild === node) {
        return outermostAncestorAtEndEdge(node.parentElement, stopTag)
    }
    return node
}
const outermostAncestorAtStartEdge = (node: Node, stopTag: string = BuiltinElName.ET_BODY): Node => {
    if ((node as HTMLElement).localName === stopTag) return node
    if (node.parentElement?.firstChild === node) {
        return outermostAncestorAtStartEdge(node.parentElement, stopTag)
    }
    return node
}

/**
 * 递归查找以当前节点为`firstChild/lastChild`的最近内联祖先节点, 若node不是`firstChild/lastChild`或不是内联节点, 则返回自身(即可能返回块节点)  
 * 返回的节点可能匹配 `stopTag`,  
 * @param stopTag 小写元素标签名
 */
export const outermostInlineAncestorAtEdge = (node: Node, edge: 'start' | 'end', stopTag: string = BuiltinElName.ET_BODY): Node => {
    // todo need refactor
    const edgeChild = edge === 'start' ? 'firstChild' : 'lastChild'
    if (isElementNode(node) && (node.localName === stopTag || isBlockElement(node))) return node
    if (node.parentElement?.[edgeChild] === node) {
        if (isBlockElement(node.parentElement)) return node
        return outermostInlineAncestorAtEdge(node.parentElement, edge, stopTag) ?? node.parentElement
    }
    return node
}
/**
 * 找当前节点在指定选择器祖先节点下的最外层祖先, 如果自身匹配选择器, 则返回自身
 */
export const outermostAncestorUnderSelector = (node: Node, selector: string, stopSelector: string = BuiltinElName.ET_BODY): Node => {
    if (isElementNode(node) && (node.matches(selector) || node.matches(stopSelector))) return node
    if (node.parentElement) {
        if (node.parentElement.matches(selector) || node.parentElement.matches(stopSelector)) return node
        return outermostAncestorUnderSelector(node.parentElement, selector)
    }
    return node
}
/**
 * 当前节点在指定祖先节点下的最外层祖先, 是自己返回自身  
 * 用于`Range`找`start/endContainer`在`commonAncestor`下的最外层祖先
 */
export const outermostAncestorUnderTheNode = (node: Node, stopNode: Node): Node => {
    if (node === stopNode) return node
    // if (node.parentElement) {
    //     if (node.parentElement === stopNode) return node
    //     return outermostAncestorUnderTheNode(node.parentElement, stopNode)
    // }
    let p = node.parentElement
    while (p) {
        if (p.parentElement === stopNode) return p
        p = p.parentElement
    }
    return node
}
/**
 * 递归找以当前节点为唯一子节点的祖先, 有兄弟则返回自身  
 * @param stopTag 小写元素标签名
 * * **仅当返回节点是`node`时可能匹配`stopTag`**
 */
export const outermostAncestorWithSelfAsOnlyChild = (node: Et.HTMLNode, stopTag: string = BuiltinElName.ET_BODY): Et.HTMLNode => {
    if ((node as HTMLElement).localName === stopTag) return node
    if (node.parentElement
        && node.parentElement.childNodes.length === 1
        && node.parentElement.localName !== stopTag
    )
        return outermostAncestorWithSelfAsOnlyChild(node.parentElement)
    return node
}
/**
 * 找最外层不可编辑元素
 */
export const outermostUneditableAncestor = (node: Node): Node => {
    if (!node.parentElement || node.parentElement.isContentEditable) return node
    return outermostUneditableAncestor(node.parentElement)
}
/**
 * 找可编辑的最里层firstChild, 没有子节点或不可编辑则返回自身
 */
export const innermostEditableStartingNode = (node: Node): Node => {
    if (isElementNode(node) && !node.isContentEditable) return node
    if (node.firstChild) return innermostEditableEndingNode(node.firstChild)
    return node
}
/**
 * 找可编辑的最里层lastchild, 没有子节点或不可编辑则返回自身
 */
export const innermostEditableEndingNode = (node: Node): Node => {
    if (isElementNode(node) && !node.isContentEditable) return node
    if (node.lastChild) return innermostEditableEndingNode(node.lastChild)
    return node
}
/**
 * 找最里层firstChild
 */
export const innermostStartingNode = (node: Node): Node => {
    if (node.firstChild) return innermostStartingNode(node.firstChild)
    return node
}
/**
 * 找最里层lastChild
 */
export const innermostEndingNode = (node: Node): Node => {
    if (node.lastChild) return innermostEndingNode(node.lastChild)
    return node
}
/**
 * 找最里层最后一个Text节点
 */
export const innermostEndingTextNode = (node: Node): Text | null => {
    let cur: Text | null = null
    traverseNode(node, (next) => {
        cur = next as Text
    }, { whatToShow: NodeFilter.SHOW_TEXT })
    return cur
}
/**
 * 找文档树的上一个节点（前兄弟或最近一个有前兄弟的祖先的前兄弟的最里层lastChild）
 */
export const treePrevNode = (node: Node): Node | null => {
    if (node.previousSibling) return innermostEndingNode(node.previousSibling)
    if (node.parentElement) return treePrevNode(node.parentElement)
    return null
}
/**
 * 找文档树的下一个节点（后兄弟或最近一个有后兄弟的祖先的后兄弟的最里层firstChild）
 */
export const treeNextNode = (node: Node): Node | null => {
    if (node.nextSibling) return innermostStartingNode(node.nextSibling)
    if (node.parentElement) return treeNextNode(node.parentElement)
    return null
}
/**
 * 清洗片段, 去掉空节点（保留<br>）
 */
export const cleanFragment = (f: DocumentFragment) => {
    // <br>的outerHTML=='\n'
    const arr: ChildNode[] = []
    traverseNode(f, (node) => {
        if (
            // isElementNode(node) && node.elType === undefined && node.innerText === '' && !['BR', 'IMG'].includes(node.nodeName)  // node.nodeName !== 'BR' / 'IMG'
            isElementNode(node) && node.childNodes.length === 0 && !['BR', 'IMG'].includes(node.nodeName)  // node.nodeName !== 'BR' / 'IMG'
            || isTextNode(node) && node.length === 0
        ) arr.push(node)
    })
    arr.forEach(node => {
        let p = node.parentElement
        node.remove()
        while (p && p.childNodes.length === 0) {
            let t = p
            p.remove()
            p = t.parentElement
        }
    })
    // f.normalize()
    f.normalizeAndCleanZWS()
}
/**
 * 合并两个DocumentFragment, 以start的节点为主
 * @param clone 是否克隆副本进行合并, 否则返回合并了`end`的`start`, 默认`false`
 */
export const mergeFragment = (start: DocumentFragment, end: DocumentFragment, clone = false): DocumentFragment => {
    // console.log('mergeFragment: ', start, end)
    if (clone) {
        start = start.cloneNode(true) as DocumentFragment
        end = end.cloneNode(true) as DocumentFragment
    }
    const startLast = start.lastChild
    const endFirst = end.firstChild

    if (isElementNode(startLast) && isElementNode(endFirst)) {
        // merge element
        const node = mergeElement(startLast, endFirst)
        if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            // 返回片段, 说明未合并, 提取到了DocumentFragment中, 需手动插回start
            start.appendChild(node)
        }
    }
    // 直接合并
    start.appendChild(end)
    // start.normalize()
    start.normalizeAndCleanZWS()
    return start
}
/**
 * 合并两个元素节点(会改变原来节点), 若两个元素不同名, 则返回包含两个元素的`DocuemntFragment`;   
 * 特别的, et组件元素（`elType=='component'`）永不合并, 即使同名
 */
export const mergeElement = (start: Element, end: Element): Node => {
    // et组件不可合并, 即使同名
    if (start.tagName !== end.tagName || isEtElement(start) && start.elType === BuiltinElType.COMPONENT) {
        const frag = document.createDocumentFragment()
        frag.append(start, end)
        return frag
    }
    // 元素名相同, 递归合并
    if (isElementNode(start.lastChild) && isElementNode(end.firstChild)) {
        const node = mergeElement(start.lastChild, end.firstChild)
        if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            // 返回了DocumentFragment, 说明前后两个节点提取到frag里了, 需要手动插回start
            start.appendChild(node)
        }
    }
    start.append(...end.childNodes)
    end.remove()
    return start
}



/* -------------------------------------------------------------------------- */
/*                          selction/range api                                */
/* -------------------------------------------------------------------------- */

/**
 * 定位光标
 * @param offset 非负整数, Infinity则定位到末尾
 */
export const collapse = (sel: Selection, node: Et.NullableNode, offset: number) => {
    const r = sel.rangeCount && sel.getRangeAt(0)
    if (!node || !r) return
    if (isTextNode(node)) {
        offset = Math.max(0, Math.min(offset, node.length))
        sel.collapse(node, offset)
        return
    }
    if (offset <= 0) {
        r.selectNodeContents(node)
        r.collapse(true)
    }
    else if (offset > node.childNodes.length) {
        r.selectNodeContents(node)
        r.collapse(false)
    }
    else {
        sel.collapse(node, offset)
    }
}
/**
 * 聚焦并移动光标至开头`or`末尾
 */
export const focus = (el: Et.NullableElement, sel: Selection, toEnd = true) => {
    if (!el) return
    sel.selectAllChildren(el)
    if (toEnd) sel.collapseToEnd()
    else sel.collapseToStart()
}

/**
 * 获取始末节点都是同一#text节点的StaticRange
 */
export const textStaticRange = (text: Text, startOffset: number, endOffset: number): Et.TextStaticRange => {
    return new StaticRange({
        startContainer: text,
        startOffset: startOffset,
        endContainer: text,
        endOffset: endOffset,
    }) as Et.TextStaticRange
}
/**
 * 获取Range对应的StaticRange
 */
export const staticFromRange = (range: Range | StaticRange): StaticRange => {
    return new StaticRange({
        startContainer: range.startContainer,
        startOffset: range.startOffset,
        endContainer: range.endContainer,
        endOffset: range.endOffset,
    })
}
/**
 * 获取StaticRange对应的Range
 */
export const rangeFromStatic = (staticRange: StaticRange): Range => {
    const r = document.createRange()
    r.setStart(staticRange.startContainer, staticRange.startOffset)
    r.setEnd(staticRange.endContainer, staticRange.endOffset)
    return r
}
/**
 * 移动StaticRange对应光标位置
 * @param staticRange 必须是collapsed==true
 * @param offset 负数向左移动, 正数右移动
 */
export const movedStaticRange = (staticRange: StaticRange, offset: number): StaticRange => {
    const anchor = staticRange.startContainer
    // if (isTextNode(anchor)) {
    //     offset = Math.max(0, Math.min(anchor.length, staticRange.startOffset + offset))
    // }
    // else {
    //     offset = Math.max(0, Math.min(anchor.childNodes.length, staticRange.startOffset + offset))
    // }
    offset = staticRange.startOffset + offset
    return new StaticRange({
        startContainer: anchor,
        startOffset: offset,
        endContainer: anchor,
        endOffset: offset,
    })
}
/**
 * 获取collapsed到某个节点内部的StaticRange
 */
export const caretStaticRangeInNode = (node: Node, offset = 0): StaticRange => {
    if (offset === Infinity) {
        offset = isTextNode(node) ? node.length : node.childNodes.length
    }
    return new StaticRange({
        startContainer: node,
        startOffset: offset,
        endContainer: node,
        endOffset: offset,
    })
}
/**
 * 获取定位到某个节点边缘的StaticRange
 * @param focusTo  
 * ```
 *  -1: collapsed to start
 *  1: collapsed to end
 *  0: no collapse 就包含这个节点
 * ```
 */
export const caretStaticRangeOutNode = (node: Node, focusTo: -1 | 0 | 1): StaticRange => {
    const r = document.createRange()
    if (focusTo === 1) {
        r.setStartAfter(node)
        // r.setEndAfter(node)
    }
    else if (focusTo === -1) {
        r.setStartBefore(node)
        // r.setEndBefore(node)
    }
    else {
        r.setStartBefore(node)
        r.setEndAfter(node)
    }
    return staticFromRange(r)
}
/**
 * Selection定位到StaticRange位置  
 * * 请try cache
 */
export const selectRange = (sel: Selection, range: StaticRange | Range) => {
    sel.empty()
    sel.addRange(rangeFromStatic(range))
    return true
}

/**
 * 遍历Range 选中的节点
 * @param fn 回调, 返回true时终止遍历
 * @param options  
 * ```
 *      whatToShow {NodeFilter} default to 5 (SHOW_ELEMENT and SHOW_TEXT)
 * ``` 
 */
export const traverseRange = (range: Range, fn: (node: Node) => void | true, { whatToShow = 5 } = {}) => {
    if (range.collapsed || range.startContainer === range.endContainer) return
    let currNode: Node | null = range.startContainer
    while (currNode) {
        const next = currNode.nextSibling
        if (next === range.endContainer) return
        if (!next) {
            currNode = currNode.parentNode
            if (currNode === range.commonAncestorContainer) return
            continue
        }
        const treeWalker = document.createTreeWalker(next, whatToShow)
        if (fn(treeWalker.currentNode)) return
        while (treeWalker.nextNode()) {
            if (treeWalker.currentNode === range.endContainer) return
            if (fn(treeWalker.currentNode)) return
        }
        currNode = next
    }
}
/**
 * 遍历节点
 * @param fn 回调, 返回true时终止遍历
 * @param options
 * ```ts
 *      whatToShow {NodeFilter} default to 5 (SHOW_ELEMENT and SHOW_TEXT)
 * ``` 
 */
export const traverseNode = <T extends number>(
    node: Node,
    fn: (node: ElTextNode<T>) => void | true,
    {
        whatToShow = (NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT) as T
    }: { whatToShow?: T } = {}
) => {
    const treeWalker = document.createTreeWalker(node, whatToShow)
    while (treeWalker.nextNode()) {
        if (fn(treeWalker.currentNode as ElTextNode<T>)) return
    }
}
type ElTextNode<T> = T extends 1 ? HTMLElement : T extends 4 ? Text : Node


/* -------------------------------------------------------------------------- */
/*                                    html                                    */
/* -------------------------------------------------------------------------- */

/**
 * 判断光标前/后方是否为零宽字符
 *  * **调用前提`range.collapsed === true`**
 */
export const checkAbutZeroWidthSpace = (range: Range, isBackward: boolean) => {
    const node = range.startContainer
    if (!isTextNode(node)) return false
    const offset = range.endOffset
    if (isBackward) {
        return offset > 0 && node.data[offset - 1] === HtmlCharEnum.ZERO_WIDTH_SPACE ? true : false
    }
    return offset < node.length && node.data[offset] === HtmlCharEnum.ZERO_WIDTH_SPACE ? true : false
}


/**
 * 转义HTML字符
 * @param str 可能含<>等字符的字符串
 * @param parseLFToBr 若为true, 则`\n`将被解析为`<br>` ; 默认`false`
 */
export const escapeHTML = (str: string, parseLFToBr = false) => {
    const div = document.createElement('div')
    if (parseLFToBr) {
        // 设置innerText时会将'\n'|'\r\n'转为为<br>
        div.innerText = str
    }
    else {
        div.textContent = str
    }
    return div.innerHTML
}

/**
 * 返回一个fragment的HTML文本; 可通过Range.createContextualFragment()重新构建fragment
 */
export const fragmentHTML = (fragment: DocumentFragment) => {
    let html = ''
    for (const child of fragment.childNodes) {
        html += isElementNode(child) ? child.outerHTML : (child.textContent ?? '')
    }
    return html
}

// /**
//  * 替换html里的标签名为指定标签(必须是成对标签); 并插入指定属性（可选）
//  */
// export const replaceTagNameOfHTML = (html: string, srcTag: string, destTag: string, attrs?: string) => {
//     // 贪心匹配
//     const pattern = RegExp(`<${srcTag}.*>(.*)</${srcTag}>`, `g`)
//     let replaced = true
//     // 遍历替换嵌套标签
//     while (replaced) {
//         replaced = false
//         html = html.replace(pattern, ($0, $1) => {
//             replaced = true
//             return `<${destTag} ${attrs ?? ''}>${$1}</${destTag}>`
//         })
//     }
//     return html
// }

