import type { Effitor } from '../@types';


export const getCompositionStart = (ctx: Effitor.Editor.Context) => {
    return (e: Event) => {
        ctx.inCompositionSession = true
        ctx.compositionupdateCount = 0
    }
}

export const getCompositionUpdate = (ctx: Effitor.Editor.Context) => {
    return (e: Event) => {
        ctx.compositionupdateCount++
    }
}

export const getCompositionEnd = (ctx: Effitor.Editor.Context) => {
    return (e: Event) => {
        ctx.inCompositionSession = false
        // ctx.forceUpdate()
        // switch (ctx.currDownCode) {
        //     case Effitor.KeyboardCode.Space:
        //         // 空格结束输入法, 跳过2次selchange
        //         ctx.skipSelChange += 2
        //         break;
        //     case Effitor.KeyboardCode.Enter:
        //     case Effitor.KeyboardCode.ShiftLeft:
        //     case Effitor.KeyboardCode.ShiftRight:
        //         // shift/enter结束输入法, 跳过3次selchange
        //         ctx.skipSelChange += 3
        //         break;
        // }
    }
}