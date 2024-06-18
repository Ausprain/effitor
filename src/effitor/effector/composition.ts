import type * as Et from '../@types';


export const getCompositionStart = (ctx: Et.EditorContext) => {
    return (e: Event) => {
        ctx.inCompositionSession = true
        ctx.compositionUpdateCount = 0
    }
}

export const getCompositionUpdate = (ctx: Et.EditorContext) => {
    return (e: Event) => {
        ctx.compositionUpdateCount++
    }
}

export const getCompositionEnd = (ctx: Et.EditorContext) => {
    return (e: Event) => {
        // ctx.inCompositionSession = false
        // 页面内失焦方式结束输入法会话, 会在compositionend后 发送一个不可取消的 deleteContentBackward
        // 因此需要延迟 compositionend 让beforeinput跳过这个 deleteContentBackward
        setTimeout(() => {
            ctx.inCompositionSession = false
            ctx.commandHandler.commit()
        }, 0);
    }
}