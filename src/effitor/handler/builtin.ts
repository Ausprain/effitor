import type * as Et from '../@types'
import type { EtParagraphElement } from '../element';
import { BuiltinElType, CmdTypeEnum, HtmlCharEnum } from "../@types/constant";
import { dom } from "../utils";
import {
    checkRemoveSelectionToCollapsed,
    checkTargetRangePosition,
    expandRemoveInsert,
    getRangeOutermostContainerUnderTheParagraph,
    getUnselectedCloneFragment,
    mergeFragments,
    mergeFragmentsWithText,
    removeNodeAndMerge
} from "./utils";


/* -------------------------------------------------------------------------- */
/*                                   insert                                   */
/* -------------------------------------------------------------------------- */

const insertTextAtCaret = (
    data: string,
    ctx: Et.EditorContext,
    srcCaretRange: StaticRange
) => {
    let destCaretRange: StaticRange
    // 光标在#text节点, 直接插入文本
    if (ctx.node) {
        destCaretRange = dom.movedStaticRange(srcCaretRange, data.length)
        ctx.commandHandler.push(CmdTypeEnum.Insert_Text, {
            text: ctx.node,
            offset: srcCaretRange.startOffset,
            data: data,
            setCaret: true,
            targetRanges: [srcCaretRange, destCaretRange]
        })
    }
    // 无#text节点, 插入新节点
    else {
        const node = document.createTextNode(data)
        destCaretRange = dom.caretStaticRangeInNode(node, node.length)
        ctx.commandHandler.push(CmdTypeEnum.Insert_Node, {
            node,
            insertAt: srcCaretRange,
            setCaret: true,
            targetRanges: [srcCaretRange, destCaretRange]
        })
    }
}
const insertTextAtRange = (
    data: string,
    ctx: Et.EditorContext,
    srcCaretRange: StaticRange
) => {
    if (ctx.range.toString() === '' || data === '') {
        // fixme #1 编辑过程中用鼠标划选文本，可能会没有更新上下文，从而导致ctx.range还停留在之前的光标位置
        // ps. 编辑过程中快速用shift+方向键选择时，也会导致该问题，通过减小更新ctx的间隔解决
        console.log('没有选中文本或没有插入文本, data=', data, 'range=', dom.staticFromRange(ctx.range))
        // 没有选中文本或没有插入文本, 不执行;  如果只选中<br>或者选中多个空段落, 将会被这里拒绝
        return false
    }
    return checkTargetRangePosition(ctx, srcCaretRange,
        insertTextAtRangeInTheSameTextNode(data, ctx, srcCaretRange),
        insertTextAtRangeInTheSameParagraph(data, ctx, srcCaretRange),
        insertTextAtRangeInDifferentParagraph(data, ctx, srcCaretRange),
    )
}
const insertTextAtRangeInTheSameTextNode = (
    data: string,
    ctx: Et.EditorContext,
    delTargetRange: StaticRange,
) => {
    return (currP: EtParagraphElement, node: Text) => {
        const deleteAt = dom.caretStaticRangeInNode(node, delTargetRange.startOffset)
        ctx.commandHandler.push(CmdTypeEnum.Delete_Text, {
            data: node.data.slice(delTargetRange.startOffset, delTargetRange.endOffset),
            isBackward: true,
            deleteRange: delTargetRange,
            targetRanges: [delTargetRange, deleteAt]
        })
        ctx.commandHandler.push(CmdTypeEnum.Insert_Text, {
            text: node,
            offset: deleteAt.startOffset,
            data: data,
            setCaret: true,
            targetRanges: [deleteAt, dom.movedStaticRange(deleteAt, data.length)]
        })
        return true
    }
}
const insertTextAtRangeInTheSameParagraph = (
    data: string,
    ctx: Et.EditorContext,
    delTargetRange: StaticRange
) => {
    return (currP: EtParagraphElement) => {
        // 移除整个段落
        const currRemoveAt = dom.caretStaticRangeOutNode(currP, -1)
        ctx.commandHandler.push(CmdTypeEnum.Remove_Node, {
            node: currP,
            removeAt: currRemoveAt,
            targetRanges: [delTargetRange, currRemoveAt]
        })
        // 获取未选取片段
        const [fragment1, fragment2] = getUnselectedCloneFragment(delTargetRange, currP, currP, false)
        // 合并片段
        const [fragment, destCaretRange] = mergeFragmentsWithText(fragment1, fragment2, data)
        // 克隆一个新段落
        const newP = dom.cloneParagraph(currP)
        newP.appendChild(fragment)

        ctx.commandHandler.push(CmdTypeEnum.Insert_Node, {
            node: newP,
            insertAt: currRemoveAt,
            setCaret: true,
            targetRanges: [currRemoveAt, destCaretRange],
        })
        return true
    }
}
const insertTextAtRangeInDifferentParagraph = (
    data: string,
    ctx: Et.EditorContext,
    delTargetRange: StaticRange
) => {
    return (startP: EtParagraphElement, endP: EtParagraphElement) => {
        // 两个段落及其中间段落整体移除
        const r = document.createRange()
        r.setStartBefore(startP)
        r.setEndAfter(endP)
        const removeRange = dom.staticFromRange(r)
        const removeAt = dom.caretStaticRangeOutNode(startP, -1)
        ctx.commandHandler.push(CmdTypeEnum.Remove_Content, {
            removeRange,
            targetRanges: [delTargetRange, removeAt]
        })
        // 合并片段并插入
        const [fragment1, fragment2] = getUnselectedCloneFragment(delTargetRange, startP, endP, false)
        const [fragment, destCaretRange] = mergeFragmentsWithText(fragment1, fragment2, data)
        // const newP = document.createElement(ctx.schema.pName)
        // 克隆startP作为新段落
        const newP = dom.cloneParagraph(startP)
        newP.appendChild(fragment)

        ctx.commandHandler.push(CmdTypeEnum.Insert_Node, {
            node: newP,
            insertAt: removeAt,
            setCaret: true,
            targetRanges: [removeAt, destCaretRange],
        })
        return true
    }
}

const insertLineBreakAtCaret = (
    ctx: Et.EditorContext,
    srcCaretRange: StaticRange,
) => {
    const br = document.createElement('br')
    if (!ctx.node) {
        // 直接插入<br>
        ctx.commandHandler.push(CmdTypeEnum.Insert_Node, {
            node: br,
            insertAt: srcCaretRange,
            setCaret: true,
            targetRanges: [srcCaretRange, dom.movedStaticRange(srcCaretRange, 1)]
        })
    }
    else {
        // #text节点内
        if (srcCaretRange.startOffset === 0) {
            // 开头插入
            const outermost = dom.outermostInlineAncestorAtEdge(ctx.node, 'start')
            const insertAt = dom.caretStaticRangeOutNode(outermost, -1)
            ctx.commandHandler.push(CmdTypeEnum.Insert_Node, {
                node: br,
                insertAt,
                setCaret: true,
                targetRanges: [srcCaretRange, srcCaretRange]
            })
        }
        else if (srcCaretRange.startOffset === ctx.node.length) {
            // 末尾插入
            const outermost = dom.outermostInlineAncestorAtEdge(ctx.node, 'end')
            const insertAt = dom.caretStaticRangeOutNode(outermost, 1)
            const destCaretRange = dom.movedStaticRange(insertAt, 1)
            ctx.commandHandler.push(CmdTypeEnum.Insert_Node, {
                node: br,
                insertAt,
                setCaret: true,
                targetRanges: [srcCaretRange, destCaretRange]
            })
            if (ctx.paragraphEl.lastChild === outermost) {
                // 段落末尾插入两个<br>
                const br2 = document.createElement('br')
                const destCaretRange2 = dom.movedStaticRange(destCaretRange, 1)
                ctx.commandHandler.push(CmdTypeEnum.Insert_Node, {
                    node: br2,
                    insertAt: destCaretRange,
                    setCaret: true,
                    targetRanges: [destCaretRange, destCaretRange2]
                })
            }
        }
        else {
            // 中间插入, 段落整体移除
            insertBrToParagraph(ctx, ctx.paragraphEl, srcCaretRange, br)
        }
    }
}
const insertLineBreakAtRange = (
    ctx: Et.EditorContext,
    srcCaretRange: StaticRange,
) => {
    return checkTargetRangePosition(ctx, srcCaretRange,
        (currP) => {
            return insertBrToParagraph(ctx, currP, srcCaretRange)
        },
        (currP) => {
            return insertBrToParagraph(ctx, currP, srcCaretRange)
        },
        () => {
            console.error('跨段落禁止插入软换行')
            return false
        }
    )
}
/**
 * 在段落内插入软换行<br>
 */
const insertBrToParagraph = (
    ctx: Et.EditorContext,
    currP: EtParagraphElement,
    srcCaretRange: StaticRange,
    br = document.createElement('br')
) => {
    const [startOutermost, endOutermost] = getRangeOutermostContainerUnderTheParagraph(srcCaretRange, currP)
    return expandRemoveInsert(ctx, startOutermost, endOutermost, srcCaretRange, srcCaretRange, true, br)
}

/**
 * 在当前段落前方插入空段落
 */
const prependParagraph = (ctx: Et.EditorContext, currP: EtParagraphElement, srcCaretRange: StaticRange) => {
    const newP = document.createElement(ctx.schema.paragraph.elName)
    ctx.commandHandler.push(CmdTypeEnum.Insert_Node, {
        node: newP,
        insertAt: dom.caretStaticRangeOutNode(currP, -1),
        setCaret: true,
        targetRanges: [srcCaretRange, dom.caretStaticRangeInNode(newP, 0)]
    })
}
const insertParagraphAtCaret = (
    ctx: Et.EditorContext,
    srcCaretRange: StaticRange,
) => {
    const currP: EtParagraphElement = ctx.paragraphEl
    // 插入位置, -1:前插, 0:中间, 1:后插
    let insertPos: -1 | 0 | 1 = 0

    if (ctx.node) {
        // 有文本节点
        if (srcCaretRange.endOffset === 0) {
            const outermost = dom.outermostAncestorAtEdge(ctx.node, 'start', currP.localName)
            if (outermost === currP || outermost === currP.firstChild) insertPos = -1
        }
        // 光标在文本节点末尾 && 文本节点或以其为lastChild的最外层元素 是段落最后一个可视节点
        else if (srcCaretRange.endOffset === ctx.node.length) {
            const outermost = dom.outermostAncestorAtEdge(ctx.node, 'end', currP.localName)
            if (
                outermost === currP ||
                outermost === currP.lastChild ||
                (outermost === currP.lastChild?.previousSibling && currP.lastChild.nodeName === 'BR')
            ) insertPos = 1
        }
    }
    else if (currP === srcCaretRange.startContainer) {
        // 无文本节点
        // 空段落 || 光标选中段落最后一个节点
        const len = currP.childNodes.length
        if (
            (len === 1 && currP.innerText === '\n')  // 仅有一个<br>时, innerText === '\n'
            ||
            (srcCaretRange.startOffset >= len)
            ||
            (srcCaretRange.startOffset === len - 1 && currP.childNodes[srcCaretRange.startOffset]?.nodeName === 'BR')
        ) insertPos = 1
    }

    if (insertPos === -1) {
        prependParagraph(ctx, currP, srcCaretRange)
    }
    // 段落末尾插入新段落
    else if (insertPos === 1) {
        const newP = document.createElement(ctx.schema.paragraph.elName)
        newP.append(document.createElement('br'))
        ctx.commandHandler.push(CmdTypeEnum.Insert_Node, {
            node: newP,
            insertAt: dom.caretStaticRangeOutNode(currP, 1),
            setCaret: true,
            targetRanges: [srcCaretRange, dom.caretStaticRangeInNode(newP, 0)]
        })
    }
    // 在中间, 当前段落一并移除; 这里也可用removeInsertParagraphs函数代替
    else {
        const removeAt = dom.caretStaticRangeOutNode(currP, -1)
        ctx.commandHandler.push(CmdTypeEnum.Remove_Node, {
            node: currP,
            removeAt,
            targetRanges: [srcCaretRange, removeAt]
        })

        const p1 = dom.cloneParagraph(currP)
        const p2 = document.createElement(ctx.schema.paragraph.elName)
        const [f1, f2] = getUnselectedCloneFragment(srcCaretRange, currP, currP, false)
        p1.append(f1)
        p2.append(f2)
        // f1已经清空, 重复利用
        f1.append(p1, p2)
        const destCaretRange = dom.caretStaticRangeInNode(p2, 0)
        ctx.commandHandler.push(CmdTypeEnum.Insert_Content, {
            fragment: f1,
            insertAt: removeAt,
            setCaret: true,
            targetRanges: [srcCaretRange, destCaretRange]
        })
    }
    return true
}
const insertParagraphAtRange = (
    ctx: Et.EditorContext,
    srcCaretRange: StaticRange,
) => {
    return checkTargetRangePosition(ctx, srcCaretRange,
        (currP) => {
            return removeInsertParagraphs(currP, currP, ctx, srcCaretRange)
        },
        (currP) => {
            return removeInsertParagraphs(currP, currP, ctx, srcCaretRange)
        },
        (p1, p2) => {
            return removeInsertParagraphs(p1, p2, ctx, srcCaretRange)
        }
    )
}
/**
 * 删除段落p1/p2及其中间段落, 并将前半未选内容插入段落1, 后半插入段落2, 再插回页面  
 * 该函数最终会插入2个段落; 主要用于跨段落`Enter`,   
 * rel. removeParagraphsToOne
 * @param p1 
 * @param p2 
 * @param ctx 
 * @param cmds 
 * @param srcCaretRange 
 */
const removeInsertParagraphs = (
    p1: EtParagraphElement,
    p2: EtParagraphElement,
    ctx: Et.EditorContext,
    srcCaretRange: StaticRange,
) => {
    // 整体移除
    const r = document.createRange()
    r.setStartBefore(p1)
    r.setEndAfter(p2)
    const removeRange = dom.staticFromRange(r)
    const removeAt = dom.caretStaticRangeOutNode(p1, -1)
    ctx.commandHandler.push(CmdTypeEnum.Remove_Content, {
        removeRange,
        targetRanges: [srcCaretRange, removeAt]
    })

    const [f1, f2] = getUnselectedCloneFragment(srcCaretRange, p1, p2, false)
    p2 = (p1 === p2 ? document.createElement(ctx.schema.paragraph.elName) : dom.cloneParagraph(p2)) as typeof p2
    p1 = dom.cloneParagraph(p1)

    p1.append(f1)
    p2.append(f2)
    f1.append(p1, p2)

    ctx.commandHandler.push(CmdTypeEnum.Insert_Content, {
        fragment: f1,
        insertAt: removeAt,
        setCaret: true,
        targetRanges: [srcCaretRange, dom.caretStaticRangeInNode(p2, 0)]
    })
    return true
}

/**
 * 插入粘贴的html片段
 * @param fragment 
 * @param noParagraph 片段是否无段落 
 */
const insertFromPasteAtCaret = (
    fragment: DocumentFragment,
    noParagraph: boolean,
    ctx: Et.EditorContext,
    srcCaretRange: StaticRange,
) => {
    if (fragment.childElementCount === 0) {
        return insertTextAtCaret(fragment.textContent!, ctx, srcCaretRange)
    }
    const currNode = ctx.node || srcCaretRange.startContainer.childNodes[srcCaretRange.startOffset] || srcCaretRange.startContainer
    const currP = ctx.paragraphEl
    // 插入到段落内
    if (noParagraph) {
        const outermost = dom.outermostAncestorUnderTheNode(currNode, currP)
        expandRemoveInsert(ctx, outermost, outermost, srcCaretRange, srcCaretRange, true, fragment)
    }
    // 插入片段包含段落: 第一个段落合并入当前段落, 最后段落合并入新段落
    // 若只有一个段落, 最终将只一个段落（效果同上）
    else {
        //! 这里断言了fragment的子节点全为段落节点
        expandRemoveInsert(ctx, currP, currP, srcCaretRange, srcCaretRange, true, fragment)
    }
}
// const insertFromPasteAtRange = (
//     fragment: DocumentFragment,
//     noParagraph: boolean,
//     ctx: Et.EditorContext,
//     srcCaretRange: StaticRange,
// ) => {
// }

/* -------------------------------------------------------------------------- */
/*                                   delete                                   */
/* -------------------------------------------------------------------------- */

/**
 * 在同一#text节点内删除文本
 * @param delTargetRange 
 */
const deleteTextAtTextNodeByTargetRange = (
    isBackward: boolean,
    ctx: Et.EditorContext,
    textNode: Text,
    delTargetRange: StaticRange,
    srcCaretRange: StaticRange,
) => {
    const deleteLength = delTargetRange.endOffset - delTargetRange.startOffset
    if (deleteLength === textNode.length) {
        // 删除节点, 连带删除空父节点
        const removeNode = dom.outermostAncestorWithSelfAsOnlyChild(textNode, ctx.schema.paragraph.elName)
        const removeAt = dom.caretStaticRangeOutNode(removeNode, -1)
        ctx.commandHandler.push(CmdTypeEnum.Remove_Node, {
            node: removeNode,
            removeAt,
            setCaret: true,
            targetRanges: [srcCaretRange, removeAt]
        })
        // 如果是段落末尾节点, 且上一个节点是<br>, 则插入一个<br>  
        // <br>aI  ->  <br><br>, 否则该行会坍缩
        if (removeNode === ctx.paragraphEl.lastChild && removeNode.previousSibling?.nodeName === 'BR') {
            const insertAt = dom.caretStaticRangeOutNode(removeNode, -1)
            ctx.commandHandler.push(CmdTypeEnum.Insert_Node, {
                node: document.createElement('br'),
                insertAt,
                setCaret: true,
                targetRanges: [srcCaretRange, insertAt]
            })
        }
    }
    else {
        // 删除文本
        ctx.commandHandler.push(CmdTypeEnum.Delete_Text, {
            data: textNode.substringData(delTargetRange.startOffset, deleteLength),
            isBackward,
            deleteRange: delTargetRange,
            setCaret: true,
            targetRanges: [srcCaretRange, dom.caretStaticRangeInNode(textNode, delTargetRange.startOffset)]
        })
    }
    return true
}
/**
 * 判断删除文本并连带删除空父元素节点
 */
const checkDeleteTextAtCaret = (
    isBackward: boolean,
    ctx: Et.EditorContext,
    startNode: Node,
    endNode: Node,
    delTargetRange: StaticRange,
    srcCaretRange: StaticRange,
): boolean => {
    if (startNode === endNode && dom.isTextNode(startNode)) {
        deleteTextAtTextNodeByTargetRange(isBackward, ctx, startNode, delTargetRange, srcCaretRange)
        return true
    }
    return false
}
/**
 * 判断删除元素节点
 * * **调用前提: 已判断startNode和endNode至少一个不是#text节点**
 */
const checkDeleteElemAtCaret = (
    isBackward: boolean,
    ctx: Et.EditorContext,
    startNode: Node,
    endNode: Node,
    delTargetRange: StaticRange,
    srcCaretRange: StaticRange,
): boolean => {
    // 上游已判断startNode不是#text
    if (startNode === endNode && delTargetRange.startOffset + 1 === delTargetRange.endOffset) {
        // 删除一个元素
        let currNode = startNode.childNodes[delTargetRange.startOffset] as Et.HTMLNode
        if (!currNode) throw Error('checkDeleteElemAtCaret: 节点不存在')
        const currP = ctx.paragraphEl
        // 要删除的是段落唯一个节点 且为`<br>`, 连同段落删除
        if (dom.isBrElement(currNode) && currP.childNodes.length === 1 && currP.firstChild === currNode) {
            const nextP = (isBackward ? currP.previousSibling : currP.nextSibling) as EtParagraphElement | null
            // 没有下一段落, 不执行任何命令, 直接结束
            if (!nextP) {
                // todo remove
                console.log('段落末尾Delete')
                return true
            }
            ctx.commandHandler.push(CmdTypeEnum.Remove_Node, {
                node: currP,
                removeAt: dom.caretStaticRangeOutNode(currP, -1),
                setCaret: true,
                targetRanges: [srcCaretRange, dom.caretStaticRangeInNode(nextP, isBackward ? nextP.childNodes.length : 0)]
            })
            return true
        }
        // 删除节点并合并前后可合并节点
        return removeNodeAndMerge(ctx, currNode, srcCaretRange)
    }
    return false
}
/**
 * 判断同段落内删除内容
 */
const checkDeleteInSameParagraph = (
    ctx: Et.EditorContext,
    startNode: Node,
    endNode: Node,
    delTargetRange: StaticRange,
    srcCaretRange: StaticRange
): boolean => {
    const p1 = dom.findParagraphParent(startNode, ctx.schema.paragraph.elName)
    const p2 = dom.findParagraphParent(endNode, ctx.schema.paragraph.elName)
    if (p1 && p1 === p2) {
        // const startOutermost = startNode === p1 ? p1.childNodes[delTargetRange.startOffset] : dom.outermostAncestorUnderTheNode(startNode, p1)
        // const endOutermost = endNode === p1 ? p1.childNodes[delTargetRange.endOffset] : dom.outermostAncestorUnderTheNode(endNode, p1)
        const [startOutermost, endOutermost] = getRangeOutermostContainerUnderTheParagraph(delTargetRange, p1)
        expandRemoveInsert(ctx, startOutermost, endOutermost, delTargetRange, srcCaretRange, true)
        return true
    }
    return false
}
/**
 * 判断段落开头Backspace, 删除当前段落, 将剩余内容插入上一段落
 */
const checkDeleteParagraphBackward = (
    ctx: Et.EditorContext,
    srcCaretRange: StaticRange
): boolean => {
    // 段落开头backspace时, del选区末端在当前段落开头, 起端在上一段落末尾
    // fix. issues.5 delTargetRange有时不准
    // 用ctx.range判断当前光标位置
    if (ctx.range.endOffset !== 0) return false
    const currP = dom.outermostAncestorAtEdge(ctx.range.endContainer, 'start', ctx.schema.paragraph.elName)
    if (!dom.isEtParagraph(currP)) return false
    const prevP = currP.previousElementSibling as EtParagraphElement | null
    // 上游已经判断currP不可能是第一个段落
    if (!prevP) throw Error('上一段落不存在')

    // 段落无内容, 直接删除
    if (['', HtmlCharEnum.ZERO_WIDTH_SPACE].includes(currP.textContent!)) {
        const removeAt = dom.caretStaticRangeOutNode(currP, -1)
        ctx.commandHandler.push(CmdTypeEnum.Remove_Node, {
            node: currP,
            removeAt,
            setCaret: true,
            targetRanges: [srcCaretRange, dom.caretStaticRangeInNode(prevP, prevP.childNodes.length)]
        })
        return true
    }

    // 上一段落不可编辑, 直接移除, 光标不动
    if (!prevP.isContentEditable) {
        const removeAt = dom.caretStaticRangeOutNode(prevP, -1)
        ctx.commandHandler.push(CmdTypeEnum.Remove_Node, {
            node: prevP,
            removeAt,
            targetRanges: [srcCaretRange, srcCaretRange]
        })
    }
    // 连同上一段落一起删除, 剩余内容合并入一个段落（使用上一段落id，即相当于将当前段落内容并入上一段落末尾）
    else {
        const delTargetRange = new StaticRange({
            startContainer: prevP,
            startOffset: dom.isBrElement(prevP.lastChild) ? prevP.childNodes.length - 1 : prevP.childNodes.length,
            endContainer: currP,
            endOffset: 0,
        })
        removeParagraphsToOne(prevP, currP, ctx, delTargetRange, srcCaretRange)
    }

    return true
}
/**
 * 判断段落末尾Delete删除
 */
const checkDeleteParagraphForward = (
    ctx: Et.EditorContext,
    srcCaretRange: StaticRange
): boolean => {
    const r = ctx.range.cloneRange()
    const currP = ctx.paragraphEl
    r.setEnd(currP, currP.childNodes.length)
    if (r.toString() !== '') return false
    // 光标至段落末尾无文本, 即段落末尾Delete
    const nextP = currP.nextSibling as EtParagraphElement | null
    if (!nextP) return false
    // 空段落, 直接删除, 光标置于下一段落开头
    if (['', HtmlCharEnum.ZERO_WIDTH_SPACE].includes(currP.textContent!)) {
        ctx.commandHandler.push(CmdTypeEnum.Remove_Node, {
            node: currP,
            removeAt: dom.caretStaticRangeOutNode(currP, -1),
            setCaret: true,
            targetRanges: [srcCaretRange, dom.caretStaticRangeInNode(nextP, 0)]
        })
        return true
    }
    // 非空段落, 连同下一段落一起删除, 剩余内容合并入下一段落
    else {
        const delTr = new StaticRange({
            startContainer: r.startContainer,
            startOffset: r.startOffset,
            endContainer: nextP,
            endOffset: 0
        })
        return removeParagraphsToOne(currP, nextP, ctx, delTr, srcCaretRange)
    }
}
/**
 * 删除p1/p2及其中间段落, 将剩余内容合并入新段落插回原来位置  
 * 该函数最终会插入1个段落; 主要用于跨段落`Backspace/Delete`   
 * rel. removeInsertParagraphs
 */
const removeParagraphsToOne = (
    p1: EtParagraphElement,
    p2: EtParagraphElement,
    ctx: Et.EditorContext,
    delTargetRange: StaticRange,
    srcCaretRange: StaticRange
) => {
    const r = document.createRange()
    r.setStartBefore(p1)
    r.setEndAfter(p2)
    const removeRange = dom.staticFromRange(r)
    const removeAt = dom.caretStaticRangeOutNode(p1, -1)
    ctx.commandHandler.push(CmdTypeEnum.Remove_Content, {
        removeRange,
        targetRanges: [srcCaretRange, removeAt]
    })

    const [f1, f2] = getUnselectedCloneFragment(delTargetRange, p1, p2, false)
    const out = mergeFragments(f1, f2)
    const newP = dom.cloneParagraph(p1)
    if (!out) {
        // 内容全选删除, 插入空段落
        ctx.commandHandler.push(CmdTypeEnum.Insert_Node, {
            node: newP,
            insertAt: removeAt,
            setCaret: true,
            targetRanges: [srcCaretRange, dom.caretStaticRangeInNode(newP, 0)]
        })
        return true
    }
    let [fragment, dest] = out
    newP.append(fragment)

    // 返回索引, 遍历段落获取光标落点
    if (typeof dest === 'number') {
        let anchor: Node | null = null
        let i = 0
        dom.traverseNode(newP, (cur) => {
            if (i === dest) {
                anchor = cur
                return true
            }
            i++
        })
        dest = anchor === null
            ? dom.caretStaticRangeInNode(newP, newP.childNodes.length)
            : dom.caretStaticRangeOutNode(anchor, -1)
    }
    ctx.commandHandler.push(CmdTypeEnum.Insert_Node, {
        node: newP,
        insertAt: removeAt,
        setCaret: true,
        targetRanges: [srcCaretRange, dest]
    })
    return true
}

const deleteBackwardAtCaret = (
    ctx: Et.EditorContext,
    startNode: Node,
    endNode: Node,
    delTargetRange: StaticRange,
    srcCaretRange: StaticRange,
) => {
    // fix. issues.5 段落首Backspace时, delTarget有时判定为删除上一段落末尾文本, 遂需先check删除段落
    // 段落开头backspace ? 删除当前段落
    return checkDeleteParagraphBackward(ctx, srcCaretRange)
        // 删除文本?
        || checkDeleteTextAtCaret(true, ctx, startNode, endNode, delTargetRange, srcCaretRange)
        // 删除元素（<br>）? 
        || checkDeleteElemAtCaret(true, ctx, startNode, endNode, delTargetRange, srcCaretRange)
        // 同段落内删除
        || checkDeleteInSameParagraph(ctx, startNode, endNode, delTargetRange, srcCaretRange)
}
const deleteForwardAtCaret = (
    ctx: Et.EditorContext,
    startNode: Node,
    endNode: Node,
    delTargetRange: StaticRange,
    srcCaretRange: StaticRange,
) => {
    // 删除文本? 
    return checkDeleteTextAtCaret(false, ctx, startNode, endNode, delTargetRange, srcCaretRange)
        // 删除元素（<br>）? 
        || checkDeleteElemAtCaret(false, ctx, startNode, endNode, delTargetRange, srcCaretRange)
        // 同段落内删除
        || checkDeleteInSameParagraph(ctx, startNode, endNode, delTargetRange, srcCaretRange)
        // 段落末尾Delete, 合并段落
        || checkDeleteParagraphForward(ctx, srcCaretRange)
}
const deleteBackwardAtRange = (
    ctx: Et.EditorContext,
    delTargetRange: StaticRange,
    srcCaretRange: StaticRange,
) => {
    return checkTargetRangePosition(ctx, delTargetRange,
        (currP, node) => {
            return deleteTextAtTextNodeByTargetRange(true, ctx, node, delTargetRange, srcCaretRange)
        },
        (currP) => {
            return removeParagraphsToOne(currP, currP, ctx, delTargetRange, srcCaretRange)
        },
        (startP, endP) => {
            return removeParagraphsToOne(startP, endP, ctx, delTargetRange, srcCaretRange)
        }
    )
}
const deleteForwardAtRange = (
    ctx: Et.EditorContext,
    delTargetRange: StaticRange,
    srcCaretRange: StaticRange,
) => {
    return checkTargetRangePosition(ctx, delTargetRange,
        (currP, node) => {
            return deleteTextAtTextNodeByTargetRange(false, ctx, node, delTargetRange, srcCaretRange)
        },
        (currP) => {
            return removeParagraphsToOne(currP, currP, ctx, delTargetRange, srcCaretRange)
        },
        (startP, endP) => {
            return removeParagraphsToOne(startP, endP, ctx, delTargetRange, srcCaretRange)
        }
    )
}

/* -------------------------------------------------------------------------- */
/*                                    paste                                   */
/* -------------------------------------------------------------------------- */
const pasteData = (ctx: Et.EditorContext, data: string, srcCaretRange: StaticRange): boolean => {
    const fragment = ctx.range.createContextualFragment(data)
    dom.cleanFragment(fragment)
    // 跨段落复制必定以段落节点为fragment子节点
    let noParagraph = true
    for (const child of fragment.children) {
        if ((child as HTMLElement).elType === BuiltinElType.PARAGRAPH) noParagraph = false
    }
    insertFromPasteAtCaret(fragment, noParagraph, ctx, srcCaretRange)
    return true
}


/* -------------------------------------------------------------------------- */
/*                                   indent                                   */
/* -------------------------------------------------------------------------- */
const handleIndent = (ctx: Et.EditorContext, idSet: Set<string>, outdent = false) => {
    const srcCaretRange = dom.staticFromRange(ctx.range)
    const val = outdent ? -1 : 1
    ctx.commandHandler.push(CmdTypeEnum.Functional, {
        targetRanges: [srcCaretRange, srcCaretRange],
        redoCallback: (ctx) => {
            idSet.forEach(id => {
                const p = ctx.root.getElementById(id)
                if (!dom.isEtParagraph(p)) return

                const newIndext = p.indent + val
                if (newIndext > ctx.config.MAX_INDENT) {
                    console.error('max: ', p.indent, newIndext, outdent, val)
                    return
                }

                p.indent = newIndext
                Object.assign(p.style, {
                    marginLeft: `${newIndext * ctx.config.INDENT_PIXEL}px`
                } as CSSStyleDeclaration)
            })
        },
        undoCallback: (ctx) => {
            idSet.forEach(id => {
                const p = ctx.root.getElementById(id)
                if (!dom.isEtParagraph(p)) return
                // 逆操作时段落已经缩进, 因此不会出现==0的情况
                // const newIndext = p.indent === 0 ? 0 : p.indent - val
                const newIndext = p.indent - val
                p.indent = newIndext
                Object.assign(p.style, {
                    marginLeft: newIndext === 0 ? '-3px' : `${newIndext * ctx.config.INDENT_PIXEL}px`
                } as CSSStyleDeclaration)
            })
        },
    })
    return true
}



const handleInsert = (
    ev: Et.InputEvent,
    ctx: Et.EditorContext,
    caretFn: (targetRange: StaticRange) => void,
    rangeFn: (targetRange: StaticRange) => void
) => {
    // 插入内容时, 无论光标是caret还是range, targetRange与当前range范围都是一样的
    const targetRange = ev.getTargetRanges()[0] ?? dom.staticFromRange(ctx.range)
    if (ctx.range.collapsed) {
        return caretFn(targetRange)
    }
    else {
        return rangeFn(targetRange)
    }
}
const handleDelete = (
    isBackward: boolean,
    ev: Et.InputEvent,
    ctx: Et.EditorContext
) => {
    // fixme 使用beforeinput 事件的targetRange可能造成意外效果, 如将 et-body外边的内容给删除了
    let delTargetRange = ev.getTargetRanges()[0]
    // sol. 若浏览器判断删除内容为#Fragment, 则替换掉
    if (delTargetRange.startContainer.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        // * ctx.range若非选区状态，将不删除任何内容
        delTargetRange = dom.staticFromRange(ctx.range)
    }
    if (!delTargetRange) {
        throw Error('delete 的 targetRange不存在0')
    }
    // if (dom.rangeFromStatic(delTargetRange).toString() === '') {
    //     // todo remove
    //     console.error(`${isBackward ? 'Backspace' : 'Delete'} will remove nothing`)
    //     return ev.preventDefault()
    // }
    // 第一个段落开头Backspace`or`最后段落末尾Delete, 不处理
    if (delTargetRange.startContainer === delTargetRange.endContainer && delTargetRange.startOffset === delTargetRange.endOffset) {
        console.log('首段落开头back, 终末尾delete')
        ev.preventDefault()
        return
    }
    // todo remove
    let checkout = false
    if (isBackward) {
        if (ctx.range.collapsed) {
            checkout = deleteBackwardAtCaret(ctx, delTargetRange.startContainer, delTargetRange.endContainer, delTargetRange, dom.staticFromRange(ctx.range))
        }
        else {
            checkout = deleteBackwardAtRange(ctx, delTargetRange, delTargetRange)
        }
    }
    else {
        if (ctx.range.collapsed) {
            checkout = deleteForwardAtCaret(ctx, delTargetRange.startContainer, delTargetRange.endContainer, delTargetRange, dom.staticFromRange(ctx.range))
        }
        else {
            checkout = deleteForwardAtRange(ctx, delTargetRange, delTargetRange)
        }
    }
    if (checkout) {
        ev.preventDefault()
    }
    else {
        console.error(`未穷尽${isBackward ? 'Backspace' : 'Delete'}的情况`)
    }
}

export const builtinHandler: Partial<Et.EffectHandlerDeclaration> = {
    EinsertText: (ctx, ev) => {
        const d = ev.data
        if (d === null || d === '') {
            return
        }
        return handleInsert(ev, ctx, (tr) => {
            insertTextAtCaret(d, ctx, tr)
        }, (tr) => {
            insertTextAtRange(d, ctx, tr)
        })
    },
    EinsertCompositionText: (ctx, ev) => {
        // console.log('comp: ', ev.data, ev.getTargetRanges()[0], ctx.root.getSelection?.())
        const srcCaretRange = ev.getTargetRanges()[0] || dom.staticFromRange(ctx.range)

        // 输入法会话刚开始时, 若光标为Range, 则先删除;
        // 由于输入法输入过程会自动selection, 即compositionupdate过程中, 光标是Range状态的
        if (ctx.compositionupdateCount === 1 && !ctx.range.collapsed) {
            console.log('insert composition text at Range delete -----------------------------', ctx.compositionupdateCount)
            deleteBackwardAtRange(ctx, srcCaretRange, srcCaretRange)
        }
        ctx.commandHandler.push(CmdTypeEnum.Insert_Composition_Text, {
            data: ev.data!,
            targetRanges: [srcCaretRange,]
        })
    },
    EinsertLineBreak: (ctx, ev) => {
        return handleInsert(ev, ctx, (tr) => {
            insertLineBreakAtCaret(ctx, tr)
        }, (tr) => {
            insertLineBreakAtRange(ctx, tr)
        })
    },
    EinsertParagraph: (ctx, ev) => {
        return handleInsert(ev, ctx, (tr) => {
            insertParagraphAtCaret(ctx, tr)
        }, (tr) => {
            insertParagraphAtRange(ctx, tr)
        })
    },

    EdeleteContentBackward: (ctx, ev) => {
        /**
         * fix. issues. # 在换行后输入法输入第2个字母时, 会触发一个deleteContentBackward删掉第一个字母, 还是随机触发的, 很诡异, 而且之后会重新触发一次compositionstart;   
         *  因此在输入法会话中, 跳过deleteContentBackward的处理
         */
        if (ctx.inCompositionSession) return
        return handleDelete(true, ev, ctx)
    },
    EdeleteContentForward: (ctx, ev) => {
        handleDelete(false, ev, ctx)
    },
    EdeleteWordBackward: (ctx, ev) => {
        handleDelete(true, ev, ctx)
    },
    EdeleteWordForward: (ctx, ev) => {
        handleDelete(false, ev, ctx)
    },

    EdeleteByCut: (ctx, ev) => {
        console.log('delete by cut')
        handleDelete(true, ev, ctx)
    },
    EinsertFromPaste: (ctx, ev) => {
        // console.error('paste data: ', ev.data)
        // 由paste事件处理数据，使用data粘贴数据
        if (ev.data == null) return
        // 选区状态, 先删除
        checkRemoveSelectionToCollapsed(ctx)
        // 若删除选区，必须重新获取 StaticRange
        const srcTargetRange = /**ev.getTargetRanges()[0] || */ dom.staticFromRange(ctx.range)
        return pasteData(ctx, ev.data, srcTargetRange)
    },

    EformatIndent: (ctx, ev) => {
        // 由上游判断 ctx.effectElement 是段落
        const idSet = new Set<string>()
        if (ctx.range.collapsed) {
            // 光标
            const currP = ctx.paragraphEl
            const prevP = currP.previousElementSibling as EtParagraphElement
            if (!prevP || currP.indent > prevP.indent) {
                // 首段落 || 缩进比上级大  不可缩进
                return ev.preventDefault()
            }
            if (currP.textContent === '' || ctx.range.endOffset === 0) {
                // 空段落 || 段落开头
                idSet.add(currP.id)
                // 后代跟随缩进
                let nextP = currP.nextElementSibling as EtParagraphElement | null
                while (nextP) {
                    const nextIndent = nextP.indent
                    // 达到最大缩进 禁止
                    if (nextIndent >= ctx.config.MAX_INDENT) return ev.preventDefault()
                    if (nextIndent > currP.indent) {
                        idSet.add(nextP.id)
                    }
                    nextP = nextP.nextElementSibling as EtParagraphElement | null
                }
            }
        }
        else {
            // 选区
            const p1 = dom.findParagraphParent(ctx.range.startContainer, ctx.schema.paragraph.elName)
            const p2 = dom.findParagraphParent(ctx.range.endContainer, ctx.schema.paragraph.elName)
            if (!p1 || !p2) throw Error('选区所属段落不存在')
            if (p1 === p2) {
                // 同一段落内
                idSet.add(p1.id)
            }
            else if (!p1.previousElementSibling) {
                // p1 是首段落
                return ev.preventDefault()
            }
            else {
                let p = p1
                while (p && p !== p2) {
                    idSet.add(p.id)
                    p = p.nextElementSibling as EtParagraphElement
                }
                idSet.add(p2.id)
                // 最后一个段落的后代跟随缩进
                let nextP = p2.nextElementSibling as EtParagraphElement | null
                while (nextP) {
                    const nextIndent = nextP.indent
                    if (nextIndent >= ctx.config.MAX_INDENT) return ev.preventDefault()
                    if (nextIndent > p2.indent) {
                        idSet.add(nextP.id)
                    }
                    nextP = nextP.nextElementSibling as EtParagraphElement | null
                }
            }
        }
        return handleIndent(ctx, idSet)
    },
    EformatOutdent: (ctx, ev) => {
        const idSet = new Set<string>()
        if (ctx.range.collapsed) {
            // 光标
            const currP = ctx.paragraphEl
            const currIndent = currP.indent
            if (!currIndent) {
                // 顶层 || 上一节点同缩进
                return ev.preventDefault()
            }
            // 检查后续段落, 有同级段落, 禁止减缩进; 否则后代跟随减缩进
            let nextP = ctx.paragraphEl.nextElementSibling as EtParagraphElement | null
            while (nextP) {
                if (nextP.indent === currIndent) return ev.preventDefault()
                if (nextP.indent > currIndent) {
                    idSet.add(nextP.id)
                }
                else break
                nextP = nextP.nextElementSibling as EtParagraphElement | null
            }
            // 任意位置shift tab都能减缩进
            idSet.add(currP.id)
        }
        else {
            // 选区
            const p1 = dom.findParagraphParent(ctx.range.startContainer, ctx.schema.paragraph.elName)
            const p2 = dom.findParagraphParent(ctx.range.endContainer, ctx.schema.paragraph.elName)
            if (!p1 || !p2) throw Error('选区所属段落不存在')
            if (!p1.indent) {
                // 选区第一个段落缩进为0, 禁止减缩进
                return ev.preventDefault()
            }
            else if (p1 === p2) {
                // 同一段落内
                idSet.add(p1.id)
            }
            else {
                let p = p1
                while (p && p !== p2) {
                    idSet.add(p.id)
                    p = p.nextElementSibling as EtParagraphElement
                }
                idSet.add(p2.id)
            }

            // 最后一个段落的后代跟随减缩进
            let nextP = p2.nextElementSibling as EtParagraphElement | null
            while (nextP) {
                if (nextP.indent > p2.indent) {
                    idSet.add(nextP.id)
                }
                nextP = nextP.nextElementSibling as EtParagraphElement | null
            }
        }
        return handleIndent(ctx, idSet, true)
    }
}
