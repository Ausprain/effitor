import type * as Et from "@/effitor/@types"
import type { Abbr } from "./abbr"
import { CmdTypeEnum, HtmlCharEnum } from "@/effitor/@types/constant"
import { createEtAbbrElement, type EtAbbrElement } from "./element"
import { dom } from "@/effitor/utils"

declare module '@/effitor/@types' {
    interface EffectHandlerDeclaration {
        /* ------------------------------- abbrHandler ------------------------------ */
        /**
         * 插入一个缩写符节点, 添加插入命令成功返回元素对象, 返回null时说明不符合插入条件
         */
        insertAbbrNode: (ctx: NotNullContext, abbr: Abbr) => EtAbbrElement | null


        /* ------------------------------ inAbbrHandler ----------------------------- */

    }
}

export type NotNullContext = Et.EditorContext & { node: Text }

/**
 * 触发缩写符效应handler, 绑到段落上
 */
export const abbrHandler: Partial<Et.EffectHandlerDeclaration> = {
    insertAbbrNode(ctx, abbr) {
        // to remove
        // console.error('handler insertAbbrNode')
        let el: EtAbbrElement | null | null
        if (abbr.type & 1) {
            el = insertPrefixNode(ctx, abbr)
        }
        else if (abbr.type & 2) {
            el = insertSuffixNode(ctx, abbr)
        }
        else {
            el = insertBlockNode(ctx, abbr)
        }
        return el
    },
}
const insertPrefixNode = (ctx: NotNullContext, abbr: Abbr): EtAbbrElement | null => {
    const srcCaretRange = dom.staticFromRange(ctx.range)
    // 插入前先删除trigger文本, 获取删除后光标的位置
    const insertAt = checkInsertPrefixAtEnd(ctx, abbr.inputedTriggerString, srcCaretRange)
    if (!insertAt) {
        return insertPrefixAtMiddle(ctx, abbr, srcCaretRange)
    }
    // 节点尾插入`or`节点头插入
    const el = createEtAbbrElement(abbr, HtmlCharEnum.ZERO_WIDTH_SPACE)
    ctx.commandHandler.push(CmdTypeEnum.Insert_Node, {
        node: el,
        insertAt,
        setCaret: true,
        targetRanges: [srcCaretRange, dom.caretStaticRangeInNode(el, Infinity)]
    })
    return el
}
const insertSuffixNode = (ctx: NotNullContext, abbr: Abbr): EtAbbrElement | null => {
    const srcCaretRange = dom.staticFromRange(ctx.range)
    // 截取字符至上一个双空格
    const ret = checkInsertSuffixAtEnd(ctx, abbr.inputedTriggerString, srcCaretRange)
    if (!ret) {
        return insertSuffixAtMiddle(ctx, abbr, srcCaretRange)
    }
    const el = createEtAbbrElement(abbr, ret[0] || HtmlCharEnum.ZERO_WIDTH_SPACE)
    ctx.commandHandler.push(CmdTypeEnum.Insert_Node, {
        node: el,
        insertAt: ret[1],
        setCaret: true,
        targetRanges: [srcCaretRange, dom.caretStaticRangeInNode(el, Infinity)]
    })
    return el
}
const insertBlockNode = (ctx: NotNullContext, abbr: Abbr): EtAbbrElement | null => {
    const srcCaretRange = dom.staticFromRange(ctx.range)
    // 触发块级符, 当前节点必定是段落唯一节点, 直接移除
    const removeAt = dom.caretStaticRangeOutNode(ctx.node!, -1)
    ctx.commandHandler.push(CmdTypeEnum.Remove_Node, {
        node: ctx.node!,
        removeAt,
        targetRanges: [srcCaretRange, srcCaretRange]
    })
    const el = createEtAbbrElement(abbr, HtmlCharEnum.ZERO_WIDTH_SPACE)
    ctx.commandHandler.push(CmdTypeEnum.Insert_Node, {
        node: el,
        insertAt: removeAt,
        setCaret: true,
        targetRanges: [srcCaretRange, dom.caretStaticRangeInNode(el, Infinity)]
    })
    return el
}

/**
 * 判断是否插入前缀符至末尾, 并返回删除触发串后光标位置; 否则返回null  
 */
const checkInsertPrefixAtEnd = (ctx: NotNullContext, triggerString: string, srcCaretRange: StaticRange): StaticRange | null => {
    // 上游已判定光标前为缩写符触发串, 直接删除
    let removeAt: StaticRange | null = null
    if (ctx.node.data === triggerString) {
        // 移除节点
        removeAt = dom.caretStaticRangeOutNode(ctx.node, -1)
        ctx.commandHandler.push(CmdTypeEnum.Remove_Node, {
            node: ctx.node,
            removeAt,
            targetRanges: [srcCaretRange, removeAt]
        })
    }
    else if (ctx.node.length === srcCaretRange.endOffset) {
        // 在Text节点内末尾插入节点, 会导致空#Text
        // removeAt = dom.movedStaticRange(srcCaretRange, -triggerString.length)
        // 返回Text节点外末尾
        removeAt = dom.caretStaticRangeOutNode(ctx.node, 1)
        const delTargetRange = new StaticRange({
            startContainer: srcCaretRange.startContainer,
            startOffset: srcCaretRange.startOffset - triggerString.length,
            endContainer: srcCaretRange.endContainer,
            endOffset: srcCaretRange.endOffset
        })
        ctx.commandHandler.push(CmdTypeEnum.Delete_Text, {
            data: triggerString,
            deleteRange: delTargetRange,
            isBackward: true,
            targetRanges: [srcCaretRange, delTargetRange]
        })
    }
    return removeAt
}
const insertPrefixAtMiddle = (ctx: NotNullContext, abbr: Abbr, srcCaretRange: StaticRange): EtAbbrElement => {
    // 先移除再插入
    const removeAt = dom.caretStaticRangeOutNode(ctx.node, -1)
    ctx.commandHandler.push(CmdTypeEnum.Remove_Node, {
        node: ctx.node,
        removeAt,
        targetRanges: [srcCaretRange, removeAt]
    })
    // 提取文本
    const text = ctx.node.data
    const caretPos = srcCaretRange.endOffset
    const leftText = text.slice(0, caretPos - abbr.inputedTriggerString.length)
    const rightText = text.slice(caretPos)
    // 插入片段
    const el = createEtAbbrElement(abbr, HtmlCharEnum.ZERO_WIDTH_SPACE)
    const destCaretRange = dom.caretStaticRangeInNode(el, Infinity)
    const df = document.createDocumentFragment()
    df.append(leftText, el, rightText)
    ctx.commandHandler.push(CmdTypeEnum.Insert_Content, {
        fragment: df,
        setCaret: true,
        insertAt: removeAt,
        targetRanges: [srcCaretRange, destCaretRange]
    })
    return el
}
/**
 * 判断是否插入后缀符至末尾, 并返回[后缀符初始文本, 插入位置]; 否则返回null
 */
const checkInsertSuffixAtEnd = (ctx: NotNullContext, triggerString: string, srcCaretRange: StaticRange): [string, StaticRange] | null => {
    let removeAt: StaticRange
    const text = ctx.node.data
    if (text === triggerString) {
        // 移除节点
        removeAt = dom.caretStaticRangeOutNode(ctx.node, -1)
        ctx.commandHandler.push(CmdTypeEnum.Remove_Node, {
            node: ctx.node,
            removeAt,
            targetRanges: [srcCaretRange, removeAt]
        })
        return ['', removeAt]
    }
    else if (text.length === srcCaretRange.endOffset) {
        // 向前找双空格
        const [startPos, endPos] = findDoubleSpaceAndRemoveText(text, text.length)

        const deleteStr = text.slice(startPos)
        const suffixStr = text.slice(endPos, text.length - triggerString.length)
        const remainStr = text.slice(0, startPos)

        if (startPos === 0 || remainStr === HtmlCharEnum.ZERO_WIDTH_SPACE) {
            // 删除节点
            removeAt = dom.caretStaticRangeOutNode(ctx.node, -1)
            ctx.commandHandler.push(CmdTypeEnum.Remove_Node, {
                node: ctx.node,
                removeAt,
                targetRanges: [srcCaretRange, removeAt]
            })
        }
        else {
            // 删除文本
            removeAt = dom.caretStaticRangeOutNode(ctx.node, 1)   // 在Text节点外末尾插入缩写符节点
            const delTargetRange = new StaticRange({
                startContainer: srcCaretRange.startContainer,
                startOffset: srcCaretRange.startOffset - deleteStr.length,
                endContainer: srcCaretRange.endContainer,
                endOffset: srcCaretRange.endOffset
            })
            ctx.commandHandler.push(CmdTypeEnum.Delete_Text, {
                data: deleteStr,
                deleteRange: delTargetRange,
                isBackward: true,
                targetRanges: [srcCaretRange, removeAt]
            })
        }
        return [suffixStr, removeAt]
    }
    return null
}
const insertSuffixAtMiddle = (ctx: NotNullContext, abbr: Abbr, srcCaretRange: StaticRange): EtAbbrElement => {
    // 整体移除
    const removeAt = dom.caretStaticRangeOutNode(ctx.node, -1)
    ctx.commandHandler.push(CmdTypeEnum.Remove_Node, {
        node: ctx.node,
        removeAt,
        targetRanges: [srcCaretRange, removeAt]
    })
    // 拆分插入
    const text = ctx.node.data
    const caretPos = srcCaretRange.endOffset
    const [i, j] = findDoubleSpaceAndRemoveText(text, caretPos)

    const leftText = text.slice(0, i),
        suffixText = text.slice(j, caretPos - abbr.inputedTriggerString.length),
        rightText = text.slice(caretPos),
        df = document.createDocumentFragment(),
        el = createEtAbbrElement(abbr, suffixText || HtmlCharEnum.ZERO_WIDTH_SPACE),
        destCaretRange = dom.caretStaticRangeInNode(el, Infinity)
    if (i === 0) {
        df.append(el, rightText)
    }
    else {
        df.append(leftText, el, rightText)
    }
    ctx.commandHandler.push(CmdTypeEnum.Insert_Content, {
        fragment: df,
        setCaret: true,
        insertAt: removeAt,
        targetRanges: [srcCaretRange, destCaretRange]
    })
    return el
}
const findDoubleSpaceAndRemoveText = (text: string, caretPos: number): [number, number] => {
    for (let i = caretPos; i >= 0; i--) {
        if (text[i] === '\x20' && text[i - 1] === '\x20') {
            return [i - 1, i + 1]
        }
    }
    return [0, 0]
}

/**
 * 在缩写符元素内部触发的效应handler, 绑到EtAbbrElement上
 */
export const inAbbrHandler: Partial<Et.EffectHandlerDeclaration> = {

}