import type * as Et from '../@types'
import { CssClassEnum } from "../@types/constant";
import { debounce } from "../utils";


export const getSelectionChangeListener = (ctx: Et.EditorContext, callbacks: ((e: Event, c: Et.EditorContext) => void)[]) => {
    return debounce((e: Event) => {
        // 在输入法会话中, 跳过
        if (ctx.inCompositionSession) {
            return
        }
        // console.error('sel change')
        ctx.forceUpdate()
        if (ctx.range.collapsed) ctx.body.classList.remove(CssClassEnum.SelectionRange)
        else ctx.body.classList.add(CssClassEnum.SelectionRange)

        for (const callback of callbacks) {
            callback(e, ctx);
        }

    }, 1)
}