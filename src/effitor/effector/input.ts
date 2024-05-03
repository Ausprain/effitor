import type * as Et from '../@types';
import { HtmlCharEnum } from '../@types/constant';
import { removeNodeAndMerge } from '../handler/utils';
import { dom } from '../utils';
import { runInputSolver } from './beforeinput';

/**
 * 删除内容后（更新上下文前），若当前效应元素内容为零宽字符，则一起删除，并合并前后可合并节点
 */
const checkRemoveZWSNodeAfterDeleteContent = (ev: Et.InputEvent, ctx: Et.EditorContext) => {
    // console.warn('check zws', ctx.range, ctx.node)
    // fix. issues.3 命令handler中已经更新了ctx.range和ctx.node, 应直接从ctx.node向上找EtElement，因为ctrl删除时ctx.effectElement可能是段落
    // 若剩下零宽字符，则ctx.node必定存在
    if (ctx.node?.data !== HtmlCharEnum.ZERO_WIDTH_SPACE) return
    const etElement = dom.findEffectParent(ctx.node)
    if (!etElement || etElement === ctx.paragraphEl) return  // 段落不应参与
    // console.warn('remove empty node')
    return removeNodeAndMerge(ctx, etElement) && ctx.commandHandler.handle() && (ctx.skipDefault = true)
}

const mainAfterInputTypeSolver: Et.InputTypeSolver = {
    deleteContentBackward: checkRemoveZWSNodeAfterDeleteContent,
    deleteContentForward: checkRemoveZWSNodeAfterDeleteContent,
    // ctrl删除时不清理zws
    // deleteWordBackward: checkRemoveZWSNodeAfterDeleteContent,
    // deleteWordForward: checkRemoveZWSNodeAfterDeleteContent,
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
