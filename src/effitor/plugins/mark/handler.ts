/** 处理mark effect
 * @author: Ausprain 
 * @email: ausprain@qq.com 
 * @date: 2024-01-10 10:31:19 
 */

import type { Et } from "@/effitor";
import { dom } from "@/effitor/utils";
import { markState, markerMap, type Marker } from "./config";
import { EtMarkElement, createMarkNode, isMarkElement, nestedMarkMap } from "./element";
import { HtmlChar } from "@/effitor/@types";

type CheckInsertMark = (ctx: Et.EditorContext, marker: Marker) => boolean;
/**
 * 根据后一节点, 判断插入标记节点时是否需要跟随一个zws
 * @returns {boolean} 是否需要尾随zws
 */
const checkNeedFollowingZWS = (node: Text, ctx: Et.EditorContext): boolean => {
    const nextNode = node.nextSibling
    if (nextNode) {
        const nextFirst = dom.innermostEditableStartingNode(nextNode)
        // debugger  // 有无准确着到下一个\u200b
        if (dom.isTextNode(nextFirst)) {
            // 若下一节点的可编辑的最里层第一个节点是#text, 判断是否zws开头, 不是则插入zws
            if (nextFirst.data[0] !== HtmlChar.ZERO_WIDTH_SPACE) {
                const srcCaretRange = dom.staticFromRange(ctx.range)
                ctx.commandHandler.push('Insert_Text', {
                    text: nextFirst,
                    offset: 0,
                    data: HtmlChar.ZERO_WIDTH_SPACE,
                    targetRanges: [srcCaretRange, srcCaretRange],
                })
                return false
            }
        }
    }
    return true
}
/**
 * 根据前一节点, 判断插入标记节点时是否需要先插入一个zws
 * @returns {boolean} 当前一节点最内层lastChild为可编辑#text时返回false（不需要前导zws）
 */
const checkNeedPrecedingZWS = (node: Text, ctx: Et.EditorContext): boolean => {
    const prev = ctx.node!.previousSibling
    if (prev) {
        const prevLast = dom.innermostEditableStartingNode(prev)
        if (dom.isTextNode(prevLast)) return true
    }
    return false
}

/* -------------------------------------------------------------------------- */
/*                                  无#text插入                                  */
/* -------------------------------------------------------------------------- */
/**
 * 光标不在#text上, 直接插入标记节点  
 * ```html
 * &ZWS;<et-mark>&ZWS;</et-mark>&ZWS;
 * ``` 
 */
const insertMarkAtElement: CheckInsertMark = (ctx, marker) => {
    console.error('insert mark at element')
    const [markEl, text] = createMarkNode(marker.type);
    const df = document.createDocumentFragment()
    // &ZWS;<et-mark>&ZWS;</et-mark>&ZWS;
    df.append(dom.zwsText(), markEl, dom.zwsText())
    const insertAt = dom.staticFromRange(ctx.range)
    ctx.commandHandler.push('Insert_Content', {
        fragment: df,
        insertAt,
        setCaret: true,
        targetRanges: [insertAt, dom.caretStaticRangeInNode(text, text.length)]
    })
    return true
}
/* -------------------------------------------------------------------------- */
/*                                 #text末尾插入                               */
/* -------------------------------------------------------------------------- */
/**
 * 检查光标是否位于#text末尾 并插入标记节点  
 * 仅一种情况: `offset == #text.length`
 */
const checkInsertMarkAtTextEnd: CheckInsertMark = (ctx, marker) => {
    if (ctx.node!.length !== ctx.range.startOffset) return false

    const currText = ctx.node!
    const srcCaretRange = dom.staticFromRange(ctx.range)
    const outermost = dom.outermostInlineAncestorAtEdge(currText, 'end', EtMarkElement.elName)
    let insertAt = dom.isTextNode(outermost)
        ? dom.caretStaticRangeOutNode(outermost, 1)
        : dom.caretStaticRangeInNode(outermost, outermost.childNodes.length)
    const [markEl, text] = createMarkNode(marker.type)
    const df = document.createDocumentFragment()

    // check prev node
    if (marker.marker.length > 1 && currText.data.slice(-1) === marker.char) {
        // 双标记符节点, 且已输入一个字符, 则删除
        const removeAt = checkCurrentNodeRemovedAtEnd(currText, ctx, srcCaretRange)
        if (removeAt) insertAt = removeAt
    }
    // check next node
    const followingZwsNeeded = checkNeedFollowingZWS(currText, ctx)

    df.append(markEl)
    followingZwsNeeded && df.append(HtmlChar.ZERO_WIDTH_SPACE)
    ctx.commandHandler.push('Insert_Content', {
        fragment: df,
        insertAt,
        setCaret: true,
        targetRanges: [srcCaretRange, dom.caretStaticRangeInNode(text, text.length)]
    })
    return true
}
/**
 * #text末尾插入双标记符节点时, 根据前一节点 判断当前节点时应当移除，还是替换尾零宽字符，还是仅删除末位字符
 * @returns {StaticRange|undefined} removeAt? 该节点的位置 若删除了该节点, 则应当更新标记节点的插入位置
 */
const checkCurrentNodeRemovedAtEnd = (
    node: Text,
    ctx: Et.EditorContext,
    srcCaretRange: StaticRange,
): StaticRange | null => {
    let removeAt: StaticRange | null = null
    if (node.length === 1) {
        // 若该节点只有一个字符，需找prev节点来判断是删除该节点还是替换成zws
        const prev = node.previousSibling
        const prevLast = prev && dom.innermostEditableEndingNode(prev)
        // prevLast是#text则必定可编辑
        if (!dom.isTextNode(prevLast)) {
            // 前节点不存在`or`不可编辑，替换为zws
            ctx.commandHandler.push('Replace_Text', {
                text: node,
                offset: 0,
                data: HtmlChar.ZERO_WIDTH_SPACE,
                replacedData: node.data,
                targetRanges: [srcCaretRange, srcCaretRange],
            })
        }
        else {
            // 否则直接移除
            removeAt = dom.caretStaticRangeOutNode(node, -1)
            ctx.commandHandler.push('Remove_Node', {
                node: node,
                removeAt,
                targetRanges: [srcCaretRange, srcCaretRange],
            })
        }
    }
    else {
        // 有多个字符，将末尾删除即可
        ctx.commandHandler.push('Delete_Text', {
            data: node.data.slice(-1),
            isBackward: true,
            deleteRange: new StaticRange({
                startContainer: node,
                startOffset: node.length - 1,
                endContainer: node,
                endOffset: node.length
            }),
            targetRanges: [srcCaretRange, srcCaretRange]
        })
    }
    return removeAt
}
/* -------------------------------------------------------------------------- */
/*                                 #text开头插入                               */
/* -------------------------------------------------------------------------- */
/**
 * 检查光标是否位于#text开头, 并插入标记节点  
 * 有4种情况(`I`代指光标, `=`代指双标记符的第一个已输入的字符):   
 * ```
 *  1. Ixxx
 *  2. \u200bIxxx
 *  2. =Ixxx
 *  4. \u200b=Ixxx
 * ```
 */
const checkInsertMarkAtTextStart: CheckInsertMark = (ctx, marker) => {
    const offset = ctx.range.endOffset
    const currText = ctx.node!
    if (marker.marker.length === 1) {
        // check end 已经判断
        // if (currText.data === HtmlChar.ZERO_WIDTH_SPACE) {
        //     // 当前节点为zws, 在后方插入
        // }
        if (offset === 0 || (offset === 1 && currText.data[0] === HtmlChar.ZERO_WIDTH_SPACE)) {
            return insertSingleMarkNodeAtStart(currText, ctx, marker)
        }
    }
    else {
        if ((offset === 1 && currText.data[0] === marker.char) ||
            (offset === 2 && currText.data[0] === HtmlChar.ZERO_WIDTH_SPACE && currText.data[1] === marker.char)
        ) {
            return insertDoubleMarkNodeAtStart(currText, offset, ctx, marker)
        }
    }
    return false
}
const insertSingleMarkNodeAtStart = (currText: Text, ctx: Et.EditorContext, marker: Marker) => {
    const srcCaretRange = dom.staticFromRange(ctx.range)
    const [markEl, text] = createMarkNode(marker.type)
    const df = document.createDocumentFragment()
    if (currText.data[0] !== HtmlChar.ZERO_WIDTH_SPACE) {
        ctx.commandHandler.push('Insert_Text', {
            text: currText,
            offset: 0,
            data: HtmlChar.ZERO_WIDTH_SPACE,
            targetRanges: [srcCaretRange, srcCaretRange]
        })
    }
    checkNeedPrecedingZWS(currText, ctx) && df.append(HtmlChar.ZERO_WIDTH_SPACE)
    df.appendChild(markEl)
    const outermost = dom.outermostInlineAncestorAtEdge(currText, 'start', EtMarkElement.elName)
    ctx.commandHandler.push('Insert_Content', {
        fragment: df,
        insertAt: dom.caretStaticRangeOutNode(outermost, -1),
        setCaret: true,
        targetRanges: [
            srcCaretRange,
            dom.caretStaticRangeInNode(text, text.length)
        ]
    })
    return true
}
const insertDoubleMarkNodeAtStart = (currText: Text, offset: number, ctx: Et.EditorContext, marker: Marker) => {
    const srcCaretRange = dom.staticFromRange(ctx.range)
    if (offset === 1) {
        // 将已输入的第一个标记符替换为zws
        ctx.commandHandler.push('Replace_Text', {
            text: currText,
            data: HtmlChar.ZERO_WIDTH_SPACE,
            offset: 0,
            replacedData: currText.data[0],
            targetRanges: [srcCaretRange, srcCaretRange]
        })
    }
    else {
        // 删除已输入的第一个标记符
        ctx.commandHandler.push('Delete_Text', {
            data: currText.data[1],
            isBackward: true,
            deleteRange: new StaticRange({
                startContainer: currText,
                startOffset: 1,
                endContainer: currText,
                endOffset: 2,
            }),
            targetRanges: [srcCaretRange, srcCaretRange]
        })
    }
    const [markEl, text] = createMarkNode(marker.type)
    const df = document.createDocumentFragment()
    checkNeedPrecedingZWS(currText, ctx) && df.append(HtmlChar.ZERO_WIDTH_SPACE)
    df.append(markEl)

    const insertAt = dom.caretStaticRangeOutNode(currText, -1)
    ctx.commandHandler.push('Insert_Content', {
        fragment: df,
        insertAt,
        setCaret: true,
        targetRanges: [srcCaretRange, dom.caretStaticRangeInNode(text, text.length)]
    })

    return true
}
/* -------------------------------------------------------------------------- */
/*                                 #text中间插入                               */
/* -------------------------------------------------------------------------- */
/**
 * 光标位于中间插入标记节点, 该函数须在checkEnd和checkStart后调用
 */
const insertMarkAtTextMiddle = (ctx: Et.EditorContext, marker: Marker, data = '') => {
    // 已判断光标不在开头也不在末尾, 将当前文本整体移除
    let removeOffset = 0
    if (marker.marker.length > 1) {
        if (ctx.node!.data[ctx.range.startOffset - 1] === marker.char)
            removeOffset = 1
    }
    const currText = ctx.node!
    const srcCaretRange = dom.staticFromRange(ctx.range)
    const removeAt = dom.caretStaticRangeOutNode(currText, -1)
    ctx.commandHandler.push('Remove_Node', {
        node: currText,
        removeAt,
        targetRanges: [srcCaretRange, srcCaretRange]
    })
    const formerPart = currText.data.slice(0, ctx.range.startOffset - removeOffset)   // 若为双标记符则排除刚刚插入的第一个标记字符
    let latterPart = currText.data.slice(ctx.range.endOffset)
    if (latterPart[0] !== HtmlChar.ZERO_WIDTH_SPACE) {
        latterPart = HtmlChar.ZERO_WIDTH_SPACE + latterPart
    }
    const [markEl, text] = createMarkNode(marker.type, data)
    const df = document.createDocumentFragment()
    df.append(formerPart, markEl, latterPart)
    ctx.commandHandler.push('Insert_Content', {
        fragment: df,
        insertAt: removeAt,
        setCaret: true,
        targetRanges: [srcCaretRange, dom.caretStaticRangeInNode(text, text.length)]
    })

    return true
}

/**
 * 这里负责判断光标具体位置 并根据情况插入标记节点
 */
const checkCaretPositionAndInsertMarkNode: CheckInsertMark = (ctx, marker) => {
    if (!ctx.node) {
        // 无#text: 空段落/空换行/前后节点不可编辑; 只会插入单标记符的节点(双标记符时已经有#text了)
        return insertMarkAtElement(ctx, marker)
    }
    return checkInsertMarkAtTextEnd(ctx, marker)
        || checkInsertMarkAtTextStart(ctx, marker)
        || insertMarkAtTextMiddle(ctx, marker)
}

/**
 * 移除标记节点, 并插回文本
 */
const removeMarkNode = (ctx: Et.EditorContext) => {
    // 不是纯文本标记节点, 退出
    if (ctx.effectElement.children.length) {
        return false
    }
    const markEl = ctx.effectElement as EtMarkElement
    const prev = markEl.previousSibling
    const next = markEl.nextSibling
    if (!prev && !next) return false

    let text = markEl.innerText
    let startOffset = ctx.range.startOffset
    let endOffset = ctx.range.endOffset
    if (text[0] === HtmlChar.ZERO_WIDTH_SPACE) {
        text = text.slice(1)
        startOffset = Math.max(startOffset - 1, 0)
        endOffset = Math.max(endOffset - 1, 0)
    }

    let omitPrev = false, omitNext = false, removeAt: StaticRange;
    const df = document.createDocumentFragment()
    const removeR = document.createRange()

    if (dom.isTextNode(prev)) {
        const prevData = prev.data.replace(HtmlChar.ZERO_WIDTH_SPACE, '')
        text = prevData + text
        startOffset += prevData.length
        endOffset += prevData.length
        omitPrev = true
    }
    if (dom.isTextNode(next)) {
        text += next.data.replace(HtmlChar.ZERO_WIDTH_SPACE, '')
        omitNext = true
    }

    if (prev) {
        removeR.setStartBefore(prev)
        removeAt = dom.caretStaticRangeOutNode(prev, -1)
        if (!omitPrev) df.append(prev.cloneNode(true))
    }
    else {
        removeR.setStartBefore(markEl)
        removeAt = dom.caretStaticRangeOutNode(markEl, -1)
    }
    const node = document.createTextNode(text)
    df.append(node)
    if (next) {
        removeR.setEndAfter(next)
        if (!omitNext) df.append(next.cloneNode(true))
    }
    else {
        removeR.setEndAfter(markEl)
    }

    const srcCaretRange = dom.staticFromRange(ctx.range)
    const destCaretRange = new StaticRange({
        startContainer: node,
        startOffset,
        endContainer: node,
        endOffset: endOffset
    })
    ctx.commandHandler.push('Remove_Content', {
        removeRange: dom.staticFromRange(removeR),
        targetRanges: [srcCaretRange, removeAt]
    })
    ctx.commandHandler.push('Insert_Content', {
        fragment: df,
        insertAt: removeAt,
        setCaret: true,
        targetRanges: [srcCaretRange, destCaretRange]
    })

    return ctx.commandHandler.handle()
}

/**
 * 绑到需要支持插入标记节点的Et元素构造器上
 */
export const markHandler: Partial<Et.EffectHandlerDeclaration> = {
    // 上游判断光标为Caret状态
    insertMarkNode(ctx, markType) {
        // 插入临时节点到成为正式节点之间 为一个事务
        ctx.commandHandler.startTransaction()
        const res = checkCaretPositionAndInsertMarkNode(ctx, markerMap[markType]) || (ctx.commandHandler.closeTransaction(), false)
        //! 交由beforeinput执行命令
        // res && dom.dispatchInputEvent(ctx.root, 'beforeinput', {
        //     inputType: 'undefined',
        // })
        // 手动执行，并标注临时节点
        res && Promise.resolve().then(() => {
            ctx.commandHandler.handle()
            markState.startMarking(markType)
        })

        return res
    },
    // 选区状态下添加样式标记
    formatMark(ctx, markType) {
        const selectedString = ctx.range.toString()
        if (!selectedString || selectedString === HtmlChar.ZERO_WIDTH_SPACE) return false
        // 跨节点禁用
        if (!ctx.node || ctx.range.startContainer !== ctx.range.endContainer) return false

        // 在标记节点内
        if (isMarkElement(ctx.effectElement)) {
            const markEl = ctx.effectElement as EtMarkElement
            // 是否同类型
            if (markEl.markType === markType) {
                return removeMarkNode(ctx)
            }
            // 检查是否符合嵌套规则
            if (markEl.markType && nestedMarkMap[markEl.markType]?.includes(markType)) {
                return insertMarkAtTextMiddle(ctx, markerMap[markType], selectedString) && ctx.commandHandler.handle()
            }
        }
        else {
            return insertMarkAtTextMiddle(ctx, markerMap[markType], selectedString) && ctx.commandHandler.handle()
        }
    },

}

/**
 * 绑到et-mark节点构造器上
 */
export const inMarkHandler: Partial<Et.EffectHandlerDeclaration> = {
    regressToMarkChar(ctx, markType) {
        markState.endMarking()
        // 不可直接撤销临时节点, 需手动删除
        const markEl = ctx.effectElement as EtMarkElement
        // 插入标记节点后, 前后都必定存在文本节点
        const prev = markEl.previousSibling as Node
        const next = markEl.nextSibling as Node
        const srcCaretRange = dom.staticFromRange(ctx.range)
        // 一块删除
        const r = document.createRange()
        r.setStartBefore(prev)
        r.setEndAfter(next)
        const removeAt = dom.caretStaticRangeOutNode(prev, -1)
        ctx.commandHandler.push('Remove_Content', {
            removeRange: dom.staticFromRange(r),
            targetRanges: [srcCaretRange, removeAt]
        })
        // 合并前后节点, 插入标记字符
        const markerChars = markerMap[markType].marker
        const clonePrev = prev.cloneNode(true)
        const cloneNext = next.cloneNode(true)
        const prevInnermost = dom.innermostEditableEndingNode(clonePrev)
        const nextInnermost = dom.innermostEditableStartingNode(cloneNext)
        let df: DocumentFragment
        const f1 = document.createDocumentFragment()
        const f2 = document.createDocumentFragment()
        // prevInnermost, nextInnermost 必定存在且为#text节点
        if (dom.isTextNode(nextInnermost)) {
            if (nextInnermost.data[0] === HtmlChar.ZERO_WIDTH_SPACE) {
                nextInnermost.deleteData(0, 1)
            }
        }
        if (dom.isTextNode(prevInnermost)) {
            if (prevInnermost.data[prevInnermost.length - 1] === HtmlChar.ZERO_WIDTH_SPACE) {
                prevInnermost.replaceData(prevInnermost.length - 1, 1, markerChars)
            }
            else {
                prevInnermost.data += markerChars
            }
            const offset = prevInnermost.length
            f1.appendChild(clonePrev)
            f2.appendChild(cloneNext)
            df = dom.mergeFragment(f1, f2)
            ctx.commandHandler.push('Insert_Content', {
                fragment: df,
                insertAt: removeAt,
                setCaret: true,
                targetRanges: [srcCaretRange, dom.caretStaticRangeInNode(prevInnermost, offset)]
            })
            ctx.commandHandler.handle() && ctx.commandHandler.closeTransaction()
            return true
        }
        // console.error('regress fail', markType)
        return false
    },
    tabToNextText(ctx) {
        // console.log('tabToNextText')
        const markEl = ctx.effectElement as EtMarkElement
        const nextNode = markEl.nextSibling
        if (nextNode) {
            const nextFirst = dom.innermostEditableStartingNode(nextNode)
            if (dom.isTextNode(nextFirst)) {
                // 若下一节点的可编辑的最里层第一个节点是#text, 判断是否zws开头, 不是则插入zws
                if (nextFirst.data[0] !== HtmlChar.ZERO_WIDTH_SPACE) {
                    ctx.commandHandler.push('Insert_Text', {
                        text: nextFirst,
                        offset: 0,
                        data: HtmlChar.ZERO_WIDTH_SPACE,
                        setCaret: true,
                        targetRanges: [
                            dom.staticFromRange(ctx.range),
                            dom.caretStaticRangeInNode(nextFirst, 1)
                        ]
                    })
                    ctx.commandHandler.handle() && ctx.commandHandler.closeTransaction()
                    return true
                }
                else {
                    // 是\u200b开头, 直接定位光标至此处
                    dom.collapse(ctx.selection, nextFirst, 1)
                    return true
                }
            }
        }
        // 插入一个zws
        const zws = dom.zwsText()
        ctx.commandHandler.push('Insert_Node', {
            node: zws,
            insertAt: dom.caretStaticRangeOutNode(markEl, 1),
            setCaret: true,
            targetRanges: [
                dom.staticFromRange(ctx.range),
                dom.caretStaticRangeInNode(zws, 1)
            ]
        })
        ctx.commandHandler.handle() && ctx.commandHandler.closeTransaction()
        return true
    },
    // 移除标记节点, 插回文本
    unformatMark(ctx) {
        return removeMarkNode(ctx)
    },
}