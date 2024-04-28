import type * as Et from '../../../@types'
import { CmdTypeEnum, HtmlCharEnum } from "@/effitor/@types/constant";
import { markState } from "../config";
import { isMarkElement } from "../element";
import { MarkEnum, MarkStatus } from "../@type.mark";
import { dom } from "@/effitor/utils";
import { mergeFragments } from "@/effitor/handler/utils";

// const checkRemoveMarkNodeAfterDeleteContent = (ev: Et.InputEvent, ctx: Et.EditorContext) => {
//     if (ctx.effectElement.localName !== MarkEnum.ElName) return
//     if (ctx.effectElement.textContent === HtmlCharEnum.ZERO_WIDTH_SPACE) {
//         // console.warn('remove empty mark')
//         const srcTr = dom.staticFromRange(ctx.range),
//             prev = ctx.effectElement.previousSibling,
//             next = ctx.effectElement.nextSibling
//         // 没有前/后节点 或 前后节点不同类, 直接删除, 不用考虑合并
//         if (!prev || !next || prev.nodeName !== next.nodeName) {
//             const removeAt = dom.caretStaticRangeOutNode(ctx.effectElement, -1)
//             ctx.commandHandler.push(CmdTypeEnum.Remove_Node, {
//                 node: ctx.effectElement,
//                 removeAt,
//                 setCaret: true,
//                 targetRanges: [srcTr, removeAt]
//             })
//             ctx.commandHandler.handle()
//             return (ctx.skipDefault = true)
//         }
//         const f1 = document.createDocumentFragment()
//         const f2 = document.createDocumentFragment()
//         f1.append(prev.cloneNode(true))
//         f2.append(next.cloneNode(true))
//         const out = mergeFragments(f1, f2)
//         if (!out) return
//         const [fragment, dest] = out
//         const removeAt = dom.caretStaticRangeOutNode(prev, -1)
//         // 整体删除/插入
//         const removeRange = document.createRange()
//         removeRange.setStartBefore(prev)
//         removeRange.setEndAfter(next)
//         ctx.commandHandler.push(CmdTypeEnum.Remove_Content, {
//             removeRange,
//             setCaret: true,
//             targetRanges: [dom.staticFromRange(ctx.range), removeAt]
//         })
//         if (typeof dest === 'number') {
//             ctx.commandHandler.push(CmdTypeEnum.Insert_Content, {
//                 fragment,
//                 insertAt: removeAt,
//                 setCaret: true,
//                 collapseTo: dest,
//                 targetRanges: [srcTr, srcTr]
//             })
//         }
//         else {
//             ctx.commandHandler.push(CmdTypeEnum.Insert_Content, {
//                 fragment,
//                 insertAt: removeAt,
//                 setCaret: true,
//                 targetRanges: [srcTr, dest]
//             })
//         }
//         ctx.commandHandler.handle()
//         return (ctx.skipDefault = true)
//     }
// }

export const inputSolver: Et.InputTypeSolver = {
    default: (ev, ctx) => {
        if (markState.phase) {
            // 只要触发了input, 说明临时节点插入了内容
            markState.endMarking()
            if (isMarkElement(ctx.effectElement)) {
                ctx.effectElement.classList.remove(MarkStatus.MARKING)
                ctx.commandHandler.closeTransaction()
            }
        }
    },
    // deleteContentBackward: checkRemoveMarkNodeAfterDeleteContent,
    // deleteContentForward: checkRemoveMarkNodeAfterDeleteContent,
    // deleteWordBackward: checkRemoveMarkNodeAfterDeleteContent,
    // deleteWordForward: checkRemoveMarkNodeAfterDeleteContent,
}