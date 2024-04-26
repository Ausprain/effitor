import type { Effitor } from "@/effitor/@types";
import { MarkType } from "../@type.mark";
import { isTempMarkElement, isMarkElement, nestedMarkMap } from "../element";
import { markState, markerMap } from "../config";
import { BuiltinElType, HtmlCharEnum } from "@/effitor/@types";

/* -------------------------------------------------------------------------- */
/*                                   插入标记节点                                   */
/* -------------------------------------------------------------------------- */
/**
 * 检查是否允许富文本
 */
const checkAllowed = (ctx: Effitor.Editor.Context) => {
    if (!ctx.effectElement) return false
    if (ctx.effectElement.elType === BuiltinElType.PLAINTEXT) return false
    return true
}
/**
 * 检查是否临时节点 或是否允许嵌套
 */
const checkNesting = (ctx: Effitor.Editor.Context, markType: MarkType) => {
    const markEl = ctx.effectElement
    if (!isMarkElement(markEl)) return true
    if (markEl.markType && nestedMarkMap[markEl.markType]?.includes(markType)) return true
    return false
}
/**
 * 判断光标并插入标记节点
 */
const checkInsertMark = (ctx: Effitor.Editor.Context, markType: MarkType) => {
    return ctx.effectInvoker.invoke('insertMarkNode', ctx, markType)
}
/**
 * 是否插入标记节点
 */
const checkMarking = (ev: KeyboardEvent, ctx: Effitor.Editor.Context, markType: MarkType) => {
    return ctx.range.collapsed 
        && checkAllowed(ctx)
        && checkNesting(ctx, markType)
        && checkInsertMark(ctx, markType)
        && (ev.preventDefault(), ctx.skipDefault = true)
}


/* -------------------------------------------------------------------------- */
/*                                 给选区添加/移除mark标记                                */
/* -------------------------------------------------------------------------- */
/**
 * 判断选区，并将划选内容标记样式
 */
const checkSurroundMark = (ctx: Effitor.Editor.Context, markType: MarkType) => {
    if (ctx.range.collapsed) return false
    if (ctx.node && ctx.range.startContainer === ctx.range.endContainer && ctx.range.endOffset === ctx.node.length &&
        (ctx.range.startOffset === 0 || ctx.range.startOffset === 1 && ctx.node.data[0] === HtmlCharEnum.ZERO_WIDTH_SPACE)
    ) {
        return checkChangeMark(ctx, markType) || ctx.effectInvoker.invoke('formatMark', ctx, markType)
    }
    return ctx.effectInvoker.invoke('formatMark', ctx, markType)
}
/* -------------------------------------------------------------------------- */
/*                                标记节点内操作                               */
/* -------------------------------------------------------------------------- */
/**
 * 光标在标记节点内试图添加相同标记时, 移除标记
 */
const checkUnmark = (ctx: Effitor.Editor.Context) => {
    return ctx.effectInvoker.invoke('unformatMark', ctx)
}
/**
 * 光标状态下切换标记节点样式
 */
const checkChangeMark = (ctx: Effitor.Editor.Context, markType: MarkType) => {
    if (!isMarkElement(ctx.effectElement)) return false
    if (ctx.effectElement.markType === markType) return checkUnmark(ctx)
    ctx.effectElement.changeMarkType(markType)
    return true
}
/**
 * ctrl+b等热键插入/更改/format样式
 */
const checkHotKeyToMark = (markType: MarkType) => {
    return (ev: KeyboardEvent, ctx: Effitor.Editor.Context) => {
        if (!ev.ctrlKey || ev.shiftKey || ev.altKey) return
        ev.preventDefault()
        ev.stopPropagation()
        ctx.skipDefault = true
        if (ctx.range.collapsed) {
            return checkChangeMark(ctx, markType) || checkMarking(ev, ctx, markType)
        }
        else {
            return checkSurroundMark(ctx, markType)
        }
    }
}
/**
 * 是否撤销标记节点并插入对应标记字符
 */
const checkRegress = (ev: KeyboardEvent, ctx: Effitor.Editor.Context): boolean => {
    return markState.phase && markState.markingType
        && isMarkElement(ctx.effectElement)
        && ctx.effectInvoker.invoke('regressToMarkChar', ctx, markState.markingType)
        && (ev.preventDefault(), ctx.skipDefault = true)
        || false
}
/** 
 * 按下tab跳到标记节点的下一个#text开头, 若以zws开头则顺移
 */
const checkTabToNextText = (ev: KeyboardEvent, ctx: Effitor.Editor.Context) => {
    if (!isMarkElement(ctx.effectElement)) return false
    return ctx.effectInvoker.invoke('tabToNextText', ctx) && (ev.preventDefault(), ctx.skipDefault = true)
}

/**
 * 这里负责判断要不要插入的问题；markHandler.insertMarkNode 负责如何插的问题
 */
export const keydownSolver: Effitor.Effector.KeyboardKeySolver = {
    /** `: code */
    [markerMap.code.char]: (ev, ctx) => {
        return checkMarking(ev, ctx, MarkType.CODE)
    },
    /** ~: delete */
    [markerMap.delete.char]: (ev, ctx) => {
        // if (ev.key !== ctx.currDownKey) return
        if (ev.key !== ctx.prevUpKey) return
        return checkMarking(ev, ctx, MarkType.DELETE)
    },
    /** =: highlight */
    [markerMap.highlight.char]: (ev, ctx) => {
        // if (ev.key !== ctx.currDownKey) return
        if (ev.key !== ctx.prevUpKey) return
        return checkMarking(ev, ctx, MarkType.HIGHLIGHT)
    },
    /** *: italic bold */
    [markerMap.italic.char]: (ev, ctx) => {
        const markEl = ctx.effectElement
        if (!isMarkElement(markEl)) {
            return checkMarking(ev, ctx, MarkType.ITALIC)
        }
        if (markEl.markType === MarkType.ITALIC && isTempMarkElement(markEl)) {
            markEl.changeMarkType(MarkType.BOLD)
            markState.markingType = MarkType.BOLD
            ev.preventDefault()
            return ctx.skipDefault = true
        }
        return ctx.range.collapsed && checkNesting(ctx, MarkType.ITALIC) && checkInsertMark(ctx, MarkType.ITALIC) && (ev.preventDefault(), ctx.skipDefault = true)
    },
    // 选区状态下ctrl+b标记样式 或光标状态下ctrl+b切换样式
    B: checkHotKeyToMark(MarkType.BOLD),
    I: checkHotKeyToMark(MarkType.ITALIC),
    D: checkHotKeyToMark(MarkType.DELETE),
    H: checkHotKeyToMark(MarkType.HIGHLIGHT),

    // 节点内特殊按键处理
    ' ': checkRegress,
    Tab: (ev, ctx) => {
        // 临时节点中, 撤回
        if (checkRegress(ev, ctx)) return true
        // 正式节点中, 光标跳到节点后边
        if (ctx.node && ctx.range.collapsed) {
            return checkTabToNextText(ev, ctx)
        }
    },
    Enter: (ev, ctx) => {
        if (checkRegress(ev, ctx)) return true
        if (ctx.node && ctx.range.collapsed && ctx.node.length === ctx.range.endOffset) {
            return checkTabToNextText(ev, ctx)
        }
    },
    Backspace: (ev, ctx) => {
        if (markState.phase) {
            console.error('backspace 撤销临时节点')
            markState.endMarking()
            ctx.commandHandler.discard()
        }
    },
    Delete: (ev, ctx) => {
        if (checkRegress(ev, ctx)) return true
        // if (ctx.node && ctx.range.collapsed && ctx.range.endOffset === ctx.node.length && isMarkElement(ctx.effectElement)) {
        //     return ctx.effectInvoker.invoke('deleteAtMarkEnd', ctx) && (ev.preventDefault(), ctx.skipDefault = true)
        // }
    },

}

