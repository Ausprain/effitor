/** 
 * @author: Ausprain 
 * @email: ausprain@qq.com 
 * @date: 2024-04-04 16:39:08 
 */
import { Et } from "@/effitor";
import { dom } from "@/effitor/utils";
import { EtListElement } from "./EtListElement";
import { HtmlChar } from "@/effitor/@types";

export const listKeydownSpaceCallback: Et.KeyboardAction = (ev, ctx) => {
    // 当前效应元素不是段落，跳过
    if (ctx.effectElement !== ctx.paragraphEl) return
    if (!dom.isTextNode(ctx.node)) return
    let flag: Et.booleanvoid = false
    const text = ctx.node.data
    if (text === '-') {
        // 插入无序列表
        flag = ctx.effectInvoker.invoke('createList', ctx, false)
    }
    else if (/^[1-9]?[0-9][.。]$/.test(text)) {
        // 插入有序列表
        const start = parseInt(text.slice(0, -1))
        flag = ctx.effectInvoker.invoke('createList', ctx, true, start)
    }
    return flag && ctx.commandHandler.handle() && (ev.preventDefault(), ctx.skipDefault = true)
}

export const listKeydownEnterCallback: Et.KeyboardAction = (ev, ctx) => {
    if (ctx.effectElement.localName !== EtListElement.elName) return
    const node = ctx.node ?? ctx.range.startContainer
    const li = dom.closestUnderTheNode(node, 'li', ctx.effectElement) as HTMLLIElement
    if (!li) return
    let flag: Et.booleanvoid = false
    // shift enter直接插入li
    if (ev.shiftKey) {
        flag = ctx.effectInvoker.invoke('insertLi', ctx, li, true)
    }
    else {
        const text = li.textContent?.trim()
        // null, '', '\u200b'
        if (!text || text === HtmlChar.ZERO_WIDTH_SPACE) {
            // 空白li
            if (li === li.parentElement?.lastChild) {
                // 最后一个
                flag = ctx.effectInvoker.invoke('trimTail', ctx, li)
            }
            else {
                // 在中间
                flag = ctx.effectInvoker.invoke('insertLi', ctx, li, true)
            }
        }
        else {
            // 非空白li, 从光标处拆分成两个li
            flag = ctx.effectInvoker.invoke('insertLi', ctx, li, false)
        }
    }
    return flag && ctx.commandHandler.handle() && (ev.preventDefault(), ctx.skipDefault = true)
}

