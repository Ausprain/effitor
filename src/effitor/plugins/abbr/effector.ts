import type * as Et from "@/effitor/@types";
import type { NotNullContext } from "./handler";
import { Abbr, abbrListener } from "./abbr";
import { AbbrConfigEnum, abbrContext } from "./config";
import { HtmlCharEnum } from "@/effitor/@types/constant";

/**
 * 触发缩写符  
 */
const onKeydownTriggerAbbr = (ev: KeyboardEvent, ctx: NotNullContext, abbr: Abbr) => {
    abbrContext.readyAbbr = null
    abbr.onTrigger(ctx, (ctx) => {
        // to remove
        // console.log('default trigger')
        return ctx.effectInvoker.invoke('insertAbbrNode', ctx, abbr)
    })
    ctx.commandHandler.handle()
    return (ev.preventDefault(), ctx.skipDefault = true)
}
/**
 * 判断光标前边是否为缩写符触发串, 以确保在正确位置插入缩写符
 * @param triggerString 已插入dom的缩写符触发串文本
 */
const checkCaretFollowsTriggerString = (ctx: Et.EditorContext, triggerString: string): ctx is NotNullContext => {
    return ctx.range.collapsed && ctx.node && (
        ctx.node.data.slice(0, ctx.range.startOffset).endsWith(triggerString)
    ) || false
}
/**
 * 判断段落文本是否为触发串文本, 仅空段落能触发块级符
 */
const checkTriggerBlockAbbr = (ev: KeyboardEvent, ctx: NotNullContext) => {
    const pText = ctx.paragraphEl.textContent
    for (const abbr of abbrContext.blockAbbrs) {
        if (pText === abbr.inputedTriggerString) {
            // to remove
            // console.warn('trigger block abbr')
            return onKeydownTriggerAbbr(ev, ctx, abbr)
        }
    }
}

const checkRegressAbbr = (ev: KeyboardEvent, ctx: Et.EditorContext, isBackspace: boolean) => {
    if (!ctx.range.collapsed) return false
    if (ctx.effectElement.localName !== AbbrConfigEnum.EL_NAME) return false
    if (isBackspace && ctx.node === ctx.effectElement.firstChild && (
        // 在开头
        ctx.range.endOffset === 0
        ||
        // 开头是零宽字符
        (ctx.range.endOffset === 1 && ctx.node?.data[0] === HtmlCharEnum.ZERO_WIDTH_SPACE)
    )) {
        ctx.effectInvoker.invoke('regressAbbr', ctx as NotNullContext, true) && ctx.commandHandler.handle()
        return (ev.preventDefault(), ctx.skipDefault = true)
    }
    if (!isBackspace && ctx.range.endOffset === ctx.node?.length && ctx.node === ctx.effectElement.lastChild) {
        ctx.effectInvoker.invoke('regressAbbr', ctx as NotNullContext, false) && ctx.commandHandler.handle()
        return (ev.preventDefault(), ctx.skipDefault = true)
    }
}

const keydownSolver: Et.KeyboardKeySolver = {
    default: (ev) => {
        abbrContext.readyAbbr = null
    },
    ' ': (ev, ctx) => {
        // 监听（前/后缀符）最后一个触发字符: 空格
        abbrListener.listen(ev.key)
        const abbr = abbrContext.readyAbbr
        if (abbr && checkCaretFollowsTriggerString(ctx, abbr.inputedTriggerString)) {
            onKeydownTriggerAbbr(ev, ctx, abbr)
        }
    },
    Enter: (ev, ctx) => {
        if (ctx.range.collapsed && ctx.node && ctx.paragraphEl === ctx.effectElement) {
            return checkTriggerBlockAbbr(ev, ctx as NotNullContext)
        }
    },
    Backspace: (ev, ctx) => {
        checkRegressAbbr(ev, ctx, true)
    },
    Delete: (ev, ctx) => {
        checkRegressAbbr(ev, ctx, false)
    },
}

const afterInputSolver: Et.InputTypeSolver = {
    default: () => {
        abbrListener.needResetBeforeJudge()
    },
    insertText: (ev, ctx) => {
        if (ev.data && ctx.effectElement === ctx.paragraphEl) {
            // 仅当当前效应元素是段落时监听
            abbrListener.listen(ev.data)
        }
        else {
            abbrListener.needResetBeforeJudge()
        }
    }
}

export const getAbbrEffector = (): Et.Effector => {
    return {
        keydownSolver,
        afterInputSolver,


    }
}
