import { BuiltinElType, type Et, HtmlChar } from "../@types";
import { dom } from "../utils";
import { EtParagraphElement } from '../element';

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
 * @param f1 
 * @param f2 
 * @returns 元组 或undefined（f1/f2均空）   
 *  [0]: 合并后的片段
 *  [1]: 合并后中间落点, 如果落点是#text, 则返回一个StaticRange, 否则返回该节点在片段中的treeWalker顺序索引
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
        // else indexOffset = 1    // 定于开始末尾, 相当于下一节点开头, index偏移+1  !由于使用treeWalker, 下一节点可能是anchor子节点而非下一兄弟
    }
    const fragment = dom.mergeFragment(f1, f2)
    if (dom.isTextNode(anchor)) {
        // 光标定位于文本节点
        return [fragment, dom.caretStaticRangeInNode(anchor, offset)]
    }
    else {
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
 * @param startExpandNode `delTargetRange.startContainer`的扩大节点
 * @param endExpandNode `delTargetRange.endContainer`的扩大节点
 * @param cmds 
 * @param delTargetRange 原本要删除内容的区域
 * @param srcCaretRange 原来光标位置
 * @param includes 克隆片段是否包含扩大节点边缘
 * @param insertNode 插入到光标位置或替换选区的节点
 */
export const expandRemoveInsert = (
    ctx: Et.EditorContext,
    startExpandNode: Node,
    endExpandNode: Node,
    delTargetRange: Range | StaticRange,
    srcCaretRange: StaticRange,
    includes: boolean,
    insertNode: Node | null = null
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
    ctx.commandHandler.push('Remove_Content', {
        removeRange,
        setCaret: !out ? true : false,
        targetRanges: [srcCaretRange, removeAt]
    })
    if (!out) return false

    const [fragment, dest] = out
    // 清除状态
    dom.traverseNode(fragment, (el) => {
        if (el.elType === BuiltinElType.PARAGRAPH) dom.removeStatusClassOfEl(el)
    }, { whatToShow: NodeFilter.SHOW_ELEMENT })
    if (typeof dest === 'number') {
        ctx.commandHandler.push('Insert_Content', {
            fragment,
            insertAt: removeAt,
            collapseTo: dest,
            setCaret: true,
            targetRanges: [srcCaretRange, srcCaretRange]
        })
    }
    else {
        ctx.commandHandler.push('Insert_Content', {
            fragment,
            insertAt: removeAt,
            setCaret: true,
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
        ctx.commandHandler.push('Insert_Node', {
            node: node,
            insertAt: srcCaretRange,
            setCaret: true,
            targetRanges: [srcCaretRange, dom.movedStaticRange(srcCaretRange, 1)]
        })
    }
    // 在开头
    else if (srcCaretRange.startOffset === 0 || (
        srcCaretRange.startOffset === 1 && ctx.node.data[0] === HtmlChar.ZERO_WIDTH_SPACE
    )) {
        const outermost = dom.outermostInlineAncestorAtEdge(ctx.node, 'start')
        const insertAt = dom.caretStaticRangeOutNode(outermost, -1)
        ctx.commandHandler.push('Insert_Node', {
            node: node,
            insertAt,
            setCaret: true,
            targetRanges: [srcCaretRange, dom.movedStaticRange(insertAt, 1)]
        })
    }
    // 在结尾
    else if (srcCaretRange.startOffset === ctx.node.length || (
        srcCaretRange.startOffset === ctx.node.length - 1 && ctx.node.data.slice(-1) === HtmlChar.ZERO_WIDTH_SPACE
    )) {
        const outermost = dom.outermostInlineAncestorAtEdge(ctx.node, 'end')
        const insertAt = dom.caretStaticRangeOutNode(outermost, 1)
        ctx.commandHandler.push('Insert_Node', {
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
 * 移除选取让光标collapsed
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