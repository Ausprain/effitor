import type * as Et from '../@types';
import { CmdTypeEnum, HtmlCharEnum } from '../@types/constant';
import { mergeFragments } from '../handler/utils';
import { dom } from '../utils';
import { runInputSolver } from './beforeinput';

/**
 * 删除内容后（更新上下文前），若当前效应元素内容为零宽字符，则一起删除，并合并前后可合并节点
 */
const checkRemoveZWSNodeAfterDeleteContent = (ev: Et.InputEvent, ctx: Et.EditorContext) => {
    // console.warn('check zws')
    // 段落不应参与
    if (ctx.effectElement === ctx.paragraphEl) return
    if (ctx.effectElement.textContent !== HtmlCharEnum.ZERO_WIDTH_SPACE) return

    // console.warn('remove empty node')
    const srcTr = dom.staticFromRange(ctx.range),
        prev = ctx.effectElement.previousSibling,
        next = ctx.effectElement.nextSibling
    // 没有前/后节点 或 前后节点不同类, 直接删除, 不用考虑合并
    if (!prev || !next || prev.nodeName !== next.nodeName) {
        const removeAt = dom.caretStaticRangeOutNode(ctx.effectElement, -1)
        ctx.commandHandler.push(CmdTypeEnum.Remove_Node, {
            node: ctx.effectElement,
            removeAt,
            setCaret: true,
            targetRanges: [srcTr, removeAt]
        })
        ctx.commandHandler.handle()
        return (ctx.skipDefault = true)
    }
    const f1 = document.createDocumentFragment()
    const f2 = document.createDocumentFragment()
    f1.append(prev.cloneNode(true))
    f2.append(next.cloneNode(true))
    const out = mergeFragments(f1, f2)
    if (!out) return
    const [fragment, dest] = out
    const removeAt = dom.caretStaticRangeOutNode(prev, -1)
    // 整体删除/插入
    const removeRange = document.createRange()
    removeRange.setStartBefore(prev)
    removeRange.setEndAfter(next)
    ctx.commandHandler.push(CmdTypeEnum.Remove_Content, {
        removeRange,
        setCaret: true,
        targetRanges: [dom.staticFromRange(ctx.range), removeAt]
    })
    if (typeof dest === 'number') {
        ctx.commandHandler.push(CmdTypeEnum.Insert_Content, {
            fragment,
            insertAt: removeAt,
            setCaret: true,
            collapseTo: dest,
            targetRanges: [srcTr, srcTr]
        })
    }
    else {
        ctx.commandHandler.push(CmdTypeEnum.Insert_Content, {
            fragment,
            insertAt: removeAt,
            setCaret: true,
            targetRanges: [srcTr, dest]
        })
    }
    ctx.commandHandler.handle()
    return (ctx.skipDefault = true)
}

const mainAfterInputTypeSolver: Et.InputTypeSolver = {
    deleteContentBackward: checkRemoveZWSNodeAfterDeleteContent,
    deleteContentForward: checkRemoveZWSNodeAfterDeleteContent,
    deleteWordBackward: checkRemoveZWSNodeAfterDeleteContent,
    deleteWordForward: checkRemoveZWSNodeAfterDeleteContent,
}

export class MainAfterInputTypeSolver implements Et.InputTypeSolver {
    [k: string]: Et.InputAction
}
Object.assign(MainAfterInputTypeSolver.prototype, mainAfterInputTypeSolver)


export const getInputListener = (ctx: Et.EditorContext, main: MainAfterInputTypeSolver, sovlers: Et.InputTypeSolver[]) => {
    return (ev: Et.InputEvent) => {
        // console.error('after input', ev.inputType)
        runInputSolver(ev, ctx, main, sovlers)
    }
}
