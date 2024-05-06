import type * as Et from '../@types'
import type { EtParagraphElement } from '../element';
import { BuiltinElType, HtmlCharEnum, CmdTypeEnum } from "../@types/constant";
import { dom } from "../utils";

/* -------------------------------------------------------------------------- */
/*                            handler utils                                   */
/* -------------------------------------------------------------------------- */

/**
 * 获取段落内Range边缘端点的段落内最外层祖先节点; range必须在同一个段落（pNode）内; 否则返回的节点可能为空
 * @param range 范围在pNode内的选区对象
 * @param pNode 
 */
export const getRangeOutermostContainerUnderTheParagraph = (
    range: Range | StaticRange,
    pNode: EtParagraphElement,
) => {
    const startNode = range.startContainer, endNode = range.endContainer
    const startOutermost = startNode === pNode ? pNode.childNodes[range.startOffset] : dom.outermostAncestorUnderTheNode(startNode, pNode)
    const endOutermost = endNode === pNode ? pNode.childNodes[range.endOffset] : dom.outermostAncestorUnderTheNode(endNode, pNode)
    return [startOutermost, endOutermost]
}
/**
 * Selection为Range时, 判断目标选区的位置: 同一#text内, 同段落内, 不同段落
 * @param ctx 
 * @param targetRange 目标选区
 * @param inTheSameTextFn 同#text回调
 * @param inTheSameParagraphFn 同段落回调
 * @param inDifferentParagraphFn 不同段落回调
 */
export const checkTargetRangePosition = (
    ctx: Et.EditorContext,
    targetRange: StaticRange | Range,
    inTheSameTextFn: (currP: EtParagraphElement, node: Text) => boolean,
    inTheSameParagraphFn: (currP: EtParagraphElement) => boolean,
    inDifferentParagraphFn: (startP: EtParagraphElement, endP: EtParagraphElement) => boolean,
) => {
    // 选区位于同一个#text节点内
    if (targetRange.startContainer === targetRange.endContainer && dom.isTextNode(targetRange.endContainer)) {
        const currP = dom.findParagraphParent(targetRange.startContainer, ctx.schema.paragraph.elName)
        if (!currP) throw Error('当前段落不存在')
        return inTheSameTextFn(currP, targetRange.endContainer)
    }

    const p1 = dom.findParagraphParent(targetRange.startContainer, ctx.schema.paragraph.elName)
    const p2 = dom.findParagraphParent(targetRange.endContainer, ctx.schema.paragraph.elName)
    if (!p1 || !p2) throw Error('选区所属段落不存在')

    // 段落内跨节点
    if (p1 === p2) {
        return inTheSameParagraphFn(p1)
    }
    // 跨段落
    else {
        return inDifferentParagraphFn(p1, p2)
    }
}
/**
 * 获取当前选区在扩大节点内的未选区内容的克隆片段
 * @param currRange 当前选区
 * @param startExpandContainer 选区起始节点的扩大节点
 * @param endExpandContainer 选区终止节点的扩大节点
 * @param includeExpandContainer 克隆是否包含扩大节点边缘, 否则只克隆最大节点内
 * @param clean 是否去除空节点
 */
export const getUnselectedCloneFragment = (
    currRange: Range | StaticRange,
    startExpandContainer: Node,
    endExpandContainer: Node,
    includeExpandContainer: boolean,
    clean = true
): [DocumentFragment, DocumentFragment] => {
    const r1 = dom.rangeFromStatic(currRange)
    const r2 = dom.rangeFromStatic(currRange)
    r1.setEnd(currRange.startContainer, currRange.startOffset)
    r2.setStart(currRange.endContainer, currRange.endOffset)
    if (includeExpandContainer) {
        r1.setStartBefore(startExpandContainer)
        r2.setEndAfter(endExpandContainer)
    }
    else {
        r1.setStart(startExpandContainer, 0)
        r2.setEnd(endExpandContainer, endExpandContainer.childNodes.length)
    }
    const f1 = r1.cloneContents()
    const f2 = r2.cloneContents()
    if (clean) {
        dom.cleanFragment(f1)
        dom.cleanFragment(f2)
    }
    return [f1, f2]
}
/**
 * 合并两个片段, 并在中间插入文本
 * @param f1 
 * @param f2 
 * @param text 
 * @returns [合并的片段, 插入后光标位置]
 */
export const mergeFragmentsWithText = (
    f1: DocumentFragment,
    f2: DocumentFragment,
    text: string,
): [DocumentFragment, StaticRange] => {
    // if (f1.textContent === '') f1 = document.createDocumentFragment()
    // if (f2.textContent === '') f2 = document.createDocumentFragment()
    // dom.cleanFragment(f1)
    // dom.cleanFragment(f2)

    let startLastNode = dom.innermostEndingNode(f1) as Text | Element
    if (dom.isTextNode(startLastNode)) {
        startLastNode.data += text
    }
    else if (!startLastNode) {
        startLastNode = document.createTextNode(text)
        f1.appendChild(startLastNode)
    }
    else {
        const node = document.createTextNode(text)
        f1.appendChild(node)
        startLastNode = node
    }
    const destCaretRange = dom.caretStaticRangeInNode(startLastNode, startLastNode.length)
    const fragment = dom.mergeFragment(f1, f2)
    return [fragment, destCaretRange]
}
/**
 * 合并两个片段, 返回合并后片段及其中间位置
 * @returns 元组 或`undefined`（`f1/f2`均为空时）   
 *  `[0]:` 合并后的片段  
 *  `[1]:` 合并后中间落点, 如果落点是`#text`, 则返回一个`StaticRange`, 否则返回该节点在片段中的`treeWalker`顺序索引
 */
export const mergeFragments = (
    f1: DocumentFragment,
    f2: DocumentFragment,
): [DocumentFragment, StaticRange] | [DocumentFragment, number] | undefined => {
    // if (f1.textContent === '') f1 = document.createDocumentFragment()
    // if (f2.textContent === '') f2 = document.createDocumentFragment()
    // dom.cleanFragment(f1)
    // dom.cleanFragment(f2)

    let anchor: Node
    let offset = -1
    // let indexOffset = 0
    if (f1.childNodes.length === 0) {
        if (f2.childNodes.length === 0) return
        // anchor = dom.innermostStartingNode(f2)
        anchor = dom.innermostEditableStartingNode(f2)
        if (dom.isTextNode(anchor)) offset = 0
    }
    else {
        // anchor = dom.innermostEndingNode(f1)
        anchor = dom.innermostEditableEndingNode(f1)
        if (dom.isTextNode(anchor)) offset = anchor.length
        // else indexOffset = 1    // 定于开始末尾, 相当于下一节点开头, index偏移+1  !!!由于使用treeWalker, 下一节点可能是anchor子节点而非下一兄弟
    }
    const fragment = dom.mergeFragment(f1, f2)
    if (dom.isTextNode(anchor)) {
        // 光标定位于文本节点
        return [fragment, dom.caretStaticRangeInNode(anchor, offset)]
    }
    else if (anchor) {
        // 光标定位于非文本节点
        let i = 0
        dom.traverseNode(fragment, (node: Node) => {
            if (anchor === node) return true
            i++
        })
        return [fragment, i]
    }
}
/**
 * 扩大选区整体删除, 并将未选取的前半和后半部分内容克隆, 合并插入删除位置（可选在该位置插入节点）
 * @param startExpandNode `delTargetRange.startContainer`的扩大节点（要一并移除的最前节点）
 * @param endExpandNode `delTargetRange.endContainer`的扩大节点（要一并删除的最后节点）
 * @param delTargetRange 原本要删除内容的区域
 * @param srcCaretRange 原来光标位置
 * @param includes 克隆片段是否包含扩大节点边缘（true: 插入内容将包含边缘节点`<tag>`, false: 插入的内容不会出现边缘节点`<tag>`）
 * @param insertNode 插入到光标位置或替换选区的节点
 * @param setCaret 是否设置光标位置, 默认true
 */
export const expandRemoveInsert = (
    ctx: Et.EditorContext,
    startExpandNode: Node,
    endExpandNode: Node,
    delTargetRange: Range | StaticRange,
    srcCaretRange: StaticRange,
    includes: boolean,
    insertNode: Node | null = null,
    setCaret = true,
) => {
    const r = document.createRange()
    r.setStartBefore(startExpandNode)
    r.setEndAfter(endExpandNode)
    const removeRange = dom.staticFromRange(r)
    const removeAt = dom.caretStaticRangeInNode(removeRange.startContainer, removeRange.startOffset)

    const [f1, f2] = getUnselectedCloneFragment(delTargetRange, startExpandNode, endExpandNode, includes)
    if (insertNode) {
        if (insertNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            dom.mergeFragment(f1, insertNode as DocumentFragment)
        }
        else {
            const df = document.createDocumentFragment()
            df.append(insertNode)
            dom.mergeFragment(f1, df)
        }
    }
    const out = mergeFragments(f1, f2)
    // 合并片段为空, 无需插入直接返回，光标置于删除后的位置
    ctx.commandHandler.push(CmdTypeEnum.Remove_Content, {
        removeRange,
        setCaret: !out ? setCaret : false,
        targetRanges: [srcCaretRange, removeAt]
    })
    if (!out) return false

    const [fragment, dest] = out
    // 清除状态
    dom.traverseNode(fragment, (el) => {
        if (el.elType === BuiltinElType.PARAGRAPH) dom.removeStatusClassOfEl(el)
    }, { whatToShow: NodeFilter.SHOW_ELEMENT })
    if (typeof dest === 'number') {
        ctx.commandHandler.push(CmdTypeEnum.Insert_Content, {
            fragment,
            insertAt: removeAt,
            collapseTo: dest,
            setCaret,
            targetRanges: [srcCaretRange, srcCaretRange]
        })
    }
    else {
        ctx.commandHandler.push(CmdTypeEnum.Insert_Content, {
            fragment,
            insertAt: removeAt,
            setCaret,
            targetRanges: [srcCaretRange, dest]
        })
    }
    return true
}
/**
 * 在光标位置插入一个节点,
 * @param srcCaretRange 必须是collapsed的
 */
export const insertNodeAtCaret = (
    ctx: Et.EditorContext,
    node: Et.HTMLNode,
    srcCaretRange: StaticRange
) => {
    if (!ctx.node) {
        ctx.commandHandler.push(CmdTypeEnum.Insert_Node, {
            node: node,
            insertAt: srcCaretRange,
            setCaret: true,
            targetRanges: [srcCaretRange, dom.movedStaticRange(srcCaretRange, 1)]
        })
    }
    // 在开头
    else if (srcCaretRange.startOffset === 0 || (
        srcCaretRange.startOffset === 1 && ctx.node.data[0] === HtmlCharEnum.ZERO_WIDTH_SPACE
    )) {
        const outermost = dom.outermostInlineAncestorAtEdge(ctx.node, 'start')
        const insertAt = dom.caretStaticRangeOutNode(outermost, -1)
        ctx.commandHandler.push(CmdTypeEnum.Insert_Node, {
            node: node,
            insertAt,
            setCaret: true,
            targetRanges: [srcCaretRange, dom.movedStaticRange(insertAt, 1)]
        })
    }
    // 在结尾
    else if (srcCaretRange.startOffset === ctx.node.length || (
        srcCaretRange.startOffset === ctx.node.length - 1 && ctx.node.data.slice(-1) === HtmlCharEnum.ZERO_WIDTH_SPACE
    )) {
        const outermost = dom.outermostInlineAncestorAtEdge(ctx.node, 'end')
        const insertAt = dom.caretStaticRangeOutNode(outermost, 1)
        ctx.commandHandler.push(CmdTypeEnum.Insert_Node, {
            node: node,
            insertAt,
            setCaret: true,
            targetRanges: [srcCaretRange, dom.movedStaticRange(insertAt, 1)]
        })
    }
    // 在中间
    else {
        const outermost = dom.outermostAncestorWithSelfAsOnlyChild(ctx.node, ctx.schema.paragraph.elName)
        expandRemoveInsert(ctx, outermost, outermost, srcCaretRange, srcCaretRange, true, node)
    }
}
/**
 * 移除一个节点，并合并前后可合并节点
 * @param node 要移除的节点
 * @param setCaret 是否设置光标位置, 默认true
 */
export const removeNodeAndMerge = (
    ctx: Et.EditorContext,
    node: Et.HTMLNode,
    srcCaretRange?: StaticRange,
    setCaret = true,
) => {
    const srcTr = srcCaretRange || dom.staticFromRange(ctx.range),
        prev = node.previousSibling,
        next = node.nextSibling
    // 没有前/后节点 或 前后节点不同类, 直接删除, 不用考虑合并
    if (!prev || !next || prev.nodeName !== next.nodeName) {
        const removeAt = dom.caretStaticRangeOutNode(node, -1)
        ctx.commandHandler.push(CmdTypeEnum.Remove_Node, {
            node,
            removeAt,
            setCaret: true,
            targetRanges: [srcTr, removeAt]
        })
        return true
    }
    if (!setCaret && checkRemoveNodeAndMergeTextNode(ctx, node, prev, next, srcTr)) return true
    const delTr = dom.caretStaticRangeOutNode(node, 0)
    return expandRemoveInsert(ctx, prev, next, delTr, srcTr, true, null, setCaret)
}
/**
 * 移除节点并合并前后文本节点, 保持原有光标位置
 */
const checkRemoveNodeAndMergeTextNode = (ctx: Et.EditorContext, removeNode: Et.HTMLNode, prev: Node, next: Node, srcTr: StaticRange) => {
    if (!dom.isTextNode(prev) || !dom.isTextNode(next)) return false
    // 光标在前节点, 删除后节点, 补充前节点
    if (ctx.range.startContainer === prev) {
        const delTr = document.createRange()
        delTr.setStartBefore(removeNode)
        delTr.setEndAfter(next)
        ctx.commandHandler.push(CmdTypeEnum.Remove_Content, {
            removeRange: delTr,
            targetRanges: [srcTr, srcTr]
        })
        const data = next.data.replace(HtmlCharEnum.ZERO_WIDTH_SPACE, '')
        ctx.commandHandler.push(CmdTypeEnum.Insert_Text, {
            data,
            text: prev,
            offset: prev.length,
            targetRanges: [srcTr, srcTr]
        })
    }
    // 光标在后节点, 删除前节点, 补充后节点
    else if (ctx.range.startContainer === next) {
        const delTr = document.createRange()
        delTr.setStartBefore(prev)
        delTr.setEndAfter(removeNode)
        ctx.commandHandler.push(CmdTypeEnum.Remove_Content, {
            removeRange: delTr,
            targetRanges: [srcTr, srcTr]
        })
        const data = (prev.data[0] === HtmlCharEnum.ZERO_WIDTH_SPACE ? HtmlCharEnum.ZERO_WIDTH_SPACE : '') + prev.data.replace(HtmlCharEnum.ZERO_WIDTH_SPACE, '')
        ctx.commandHandler.push(CmdTypeEnum.Insert_Text, {
            data,
            text: next,
            offset: 0,
            targetRanges: [srcTr, srcTr]
        })
    }
    // 一起删除
    else {
        const delTr = document.createRange()
        delTr.setStartBefore(prev)
        delTr.setEndAfter(next)
        ctx.commandHandler.push(CmdTypeEnum.Remove_Content, {
            removeRange: delTr,
            targetRanges: [srcTr, srcTr]
        })
        const data = (prev.data[0] === HtmlCharEnum.ZERO_WIDTH_SPACE ? HtmlCharEnum.ZERO_WIDTH_SPACE : '') + prev.data.replace(HtmlCharEnum.ZERO_WIDTH_SPACE, '') + next.data.replace(HtmlCharEnum.ZERO_WIDTH_SPACE, '')
        const text = document.createTextNode(data)
        ctx.commandHandler.push(CmdTypeEnum.Insert_Node, {
            node: text,
            insertAt: dom.caretStaticRangeOutNode(prev, -1),
            targetRanges: [srcTr, srcTr]
        })
    }
    return true
}
/**
 * 使用片段替换当前节点, 并合并入前/后节点
 * @param currNode 被替换的节点
 * @param fragment 插入的片段
 * @param srcCaretRange 初始光标位置
 * @param setCaret 是否设置光标位置
 * @param caretToStart 光标设置到fragment开始位置
 */
export const replaceNodeAndMerge = (
    ctx: Et.EditorContext,
    currNode: Et.HTMLNode,
    fragment: DocumentFragment,
    srcCaretRange?: StaticRange,
    setCaret = true,
    caretToStart = true
) => {
    srcCaretRange = srcCaretRange || dom.staticFromRange(ctx.range)
    if (fragment.childNodes.length === 0) return removeNodeAndMerge(ctx, currNode, srcCaretRange, setCaret)

    const getDestCaretRange = (out: Exclude<ReturnType<typeof mergeFragments>, undefined>): StaticRange => {
        let sr = srcCaretRange
        if (typeof out[1] === 'number') {
            let i = 0
            dom.traverseNode(out[0], (node: Node) => {
                if (i++ === out[1]) {
                    sr = dom.caretStaticRangeInNode(node, caretToStart ? 0 : node.childNodes.length)
                    return true
                }
            })
        }
        else {
            return out[1]
        }
        return sr
    }

    const r = document.createRange(),
        prev = currNode.previousSibling,
        next = currNode.nextSibling
    let removeAt = dom.caretStaticRangeOutNode(currNode, -1),
        delTr: StaticRange,
        fg: DocumentFragment = fragment,
        lastChild: Node,
        destCaretRange: StaticRange | null = null

    // 无前后节点, 直接删除, 替换
    if (!prev && !next) {
        r.selectNode(currNode)
        delTr = dom.staticFromRange(r)
        lastChild = fg.lastChild!
    }
    // 前后均有
    else if (prev && next) {
        r.selectNode(prev)
        const f1 = r.cloneContents()
        r.selectNode(next)
        const f2 = r.cloneContents()
        r.setStartBefore(prev)
        delTr = dom.staticFromRange(r)
        removeAt = dom.caretStaticRangeOutNode(prev, -1)
        let out = mergeFragments(f1, fragment)!
        if (setCaret && caretToStart) {
            destCaretRange = getDestCaretRange(out)
        }
        out = mergeFragments(out[0], f2)!
        if (setCaret && !caretToStart) {
            destCaretRange = getDestCaretRange(out)
        }
        fg = out[0]
        lastChild = fg.lastChild!
    }
    // 只有前
    else if (prev) {
        r.selectNode(prev)
        const f1 = r.cloneContents()
        r.setEndAfter(currNode)
        delTr = dom.staticFromRange(r)
        removeAt = dom.caretStaticRangeOutNode(prev, -1)
        const out = mergeFragments(f1, fragment)!
        if (setCaret && caretToStart) {
            destCaretRange = getDestCaretRange(out)
        }
        fg = out[0]
        lastChild = fg.lastChild!
    }
    // 只有后
    else {
        r.selectNode(next!)
        const f1 = r.cloneContents()
        r.setStartBefore(currNode)
        delTr = dom.staticFromRange(r)
        removeAt = dom.caretStaticRangeOutNode(next!, -1)
        const out = mergeFragments(fragment, f1)!
        if (setCaret && !caretToStart) {
            destCaretRange = getDestCaretRange(out)
        }
        fg = out[0]
        lastChild = fg.lastChild!
    }

    // 整体删除
    ctx.commandHandler.push(CmdTypeEnum.Remove_Content, {
        removeRange: delTr,
        targetRanges: [srcCaretRange, srcCaretRange]
    })
    if (!destCaretRange) {
        if (!setCaret) {
            destCaretRange = srcCaretRange
        }
        else if (caretToStart) {
            destCaretRange = dom.caretStaticRangeInNode(fg.firstChild!, 0)
        }
        else {
            destCaretRange = dom.caretStaticRangeInNode(lastChild, dom.isTextNode(lastChild) ? lastChild.length : lastChild.childNodes.length)
        }
    }
    // 整体插入
    ctx.commandHandler.push(CmdTypeEnum.Insert_Content, {
        fragment: fg,
        insertAt: removeAt,
        setCaret,
        targetRanges: [srcCaretRange, destCaretRange]
    })
    return true
}
/**
 * 删除选区内容并让光标collapsed
 */
export const checkRemoveSelectionToCollapsed = (ctx: Et.EditorContext) => {
    if (!ctx.range.collapsed) {
        dom.dispatchInputEvent(ctx.root, 'beforeinput', {
            inputType: 'deleteContentBackward',
            targetRanges: [dom.staticFromRange(ctx.range)]
        })
        ctx.forceUpdate()
    }
}