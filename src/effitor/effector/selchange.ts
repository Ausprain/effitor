import { Et } from "../@types";
import { debounce } from "../utils";


export const getSelectionChangeListener = (ctx: Et.EditorContext, callbacks: ((e: Event, c: Et.EditorContext) => void)[]) => {
    return debounce((e: Event) => {
        // 在输入法会话中, 跳过
        if (ctx.inCompositionSession) {
            return
        }
        // console.error('sel change')
        ctx.forceUpdate()
        if (ctx.range.collapsed) ctx.body.classList.remove(Et.CssClass.SelectionRange)
        else ctx.body.classList.add(Et.CssClass.SelectionRange)

        for (const callback of callbacks) {
            callback(e, ctx);
        }
        
    }, 1)
}