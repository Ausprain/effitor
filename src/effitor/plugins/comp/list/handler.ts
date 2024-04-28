import type * as Et from '../../../@types'
import { EtListElement } from "./EtListElement";
import { extentEtElement } from "@/effitor/element";
import { getUnselectedCloneFragment } from "@/effitor/handler/utils";
import { builtinHandler } from "@/effitor/handler";
import { dom } from "@/effitor/utils";

export const overrideHandler: Partial<Et.DefaultEffectHandlerMap> = {
    EinsertFromPaste: (ctx, ev) => {
        console.error('被增强的 insertFromPaste')
        // todo 
        const res = builtinHandler.EinsertFromPaste?.(ctx, ev)
        return res
    }
}

export const listHandler: Partial<Et.EffectHandlerDeclaration> = {
    createList(ctx, ordered, start) {
        const [etl, zws] = EtListElement.create(ordered, start)
        // const etl = EtListElement.create(ordered)
        const srcCaretRange = dom.staticFromRange(ctx.range)
        // 移除当前节点, 插入列表
        ctx.commandHandler.push('Replace_Node', {
            node: ctx.node!,   // 上游确定ctx.node非空
            newNode: etl,
            replaceAt: dom.caretStaticRangeOutNode(ctx.node!, -1),
            setCaret: true,
            targetRanges: [srcCaretRange, dom.caretStaticRangeInNode(zws, 1)]
        })
        return true
    },
}

export const inListHandler: Partial<Et.EffectHandlerDeclaration> = {
    insertLi(ctx, currLi, blank) {
        const srcCaretRange = dom.staticFromRange(ctx.range)
        if (blank) {
            const [li, zws] = EtListElement.createLi()
            ctx.commandHandler.push('Insert_Node', {
                node: li,
                insertAt: dom.caretStaticRangeOutNode(currLi, 1),
                setCaret: true,
                targetRanges: [srcCaretRange, dom.caretStaticRangeInNode(zws, 1)]
            })
        }
        else {
            // 从光标位置拆分当前li
            const [f1, f2] = getUnselectedCloneFragment(ctx.range, currLi, currLi, true, false)
            let nod = dom.innermostStartingNode(f2)
            if (!nod) nod = dom.innermostEndingNode(f1)
            f1.appendChild(f2)
            const removeAt = dom.caretStaticRangeOutNode(currLi, -1)
            ctx.commandHandler.push('Remove_Node', {
                node: currLi,
                removeAt,
                targetRanges: [srcCaretRange, removeAt]
            })
            ctx.commandHandler.push('Insert_Content', {
                fragment: f1,
                insertAt: removeAt,
                setCaret: true,
                targetRanges: [srcCaretRange, dom.caretStaticRangeInNode(nod, 0)]
            })
        }
        return true
    },
    trimTail(ctx, currLi) {
        // todo 多级列表要做额外判断, 以下仅处理单层列表的情况
        const srcCaretRange = dom.staticFromRange(ctx.range)
        const etl = currLi.parentElement?.parentElement as EtListElement
        if (!etl) return false
        if (currLi.parentElement?.children.length === 1) {
            // 只有一个li，直接整个删除
            const removeAt = dom.caretStaticRangeOutNode(etl, -1)
            ctx.commandHandler.push('Remove_Node', {
                node: etl,
                removeAt,
                setCaret: true,
                targetRanges: [srcCaretRange, removeAt]
            })
        }
        else {
            // 仅删除当前li
            ctx.commandHandler.push('Remove_Node', {
                node: currLi,
                removeAt: dom.caretStaticRangeOutNode(currLi, -1),
                setCaret: true,
                targetRanges: [srcCaretRange, dom.caretStaticRangeOutNode(etl, 1)]
            })
        }
        return true
    },
}
extentEtElement(EtListElement, inListHandler)