import type { Effitor as Et } from "@/effitor/@types";
import type { NotNullContext } from "./handler";
import { Abbr, abbrListener } from "./abbr";
import { AbbrConfigEnum, abbrContext } from "./config";
import { dom } from "@/effitor/utils";

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
const checkCaretFollowsTriggerString = (ctx: Et.Editor.Context, triggerString: string): ctx is NotNullContext => {
    return ctx.range.collapsed && ctx.node && (
        ctx.node.data.slice(0, ctx.range.startOffset).endsWith(triggerString)
    ) || false
}
/**
 * 判断段落文本是否为触发串文本, 仅空段落能触发块级符
 * @param triggerString 已插入dom的触发串
 */
const checkParagraphTextEqualsTriggerString = (ctx: Et.Editor.Context, triggerString: string): ctx is NotNullContext => {
    return ctx.range.collapsed && ctx.node && ctx.paragraphEl.textContent === triggerString || false
}

const keydownSolver: Et.Effector.KeyboardKeySolver = {
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
        // 监听（块级符）最后一个触发字符: \n
        abbrListener.listen('\n')
        const abbr = abbrContext.readyAbbr
        // 仅在空段落可以触发块级缩写符
        if (abbr && checkParagraphTextEqualsTriggerString(ctx, abbr.inputedTriggerString)) {
            onKeydownTriggerAbbr(ev, ctx, abbr)
        }
    }
}

const afterInputSolver: Et.Effector.InputTypeSolver = {
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
