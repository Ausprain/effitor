import { Et } from '../@types';


export const getCompositionStart = (ctx: Et.EditorContext) => {
    return (e: Event) => {
        ctx.inCompositionSession = true
        ctx.compositionupdateCount = 0
    }
}

export const getCompositionUpdate = (ctx: Et.EditorContext) => {
    return (e: Event) => {
        ctx.compositionupdateCount++
    }
}

export const getCompositionEnd = (ctx: Et.EditorContext) => {
    return (e: Event) => {
        ctx.inCompositionSession = false
        // ctx.forceUpdate()
        // switch (ctx.currDownCode) {
        //     case Et.KeyboardCode.Space:
        //         // 空格结束输入法, 跳过2次selchange
        //         ctx.skipSelChange += 2
        //         break;
        //     case Et.KeyboardCode.Enter:
        //     case Et.KeyboardCode.ShiftLeft:
        //     case Et.KeyboardCode.ShiftRight:
        //         // shift/enter结束输入法, 跳过3次selchange
        //         ctx.skipSelChange += 3
        //         break;
        // }
    }
}