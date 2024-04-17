import type { Et } from "@/effitor";
import { markState } from "../config";
import { isMarkElement } from "../element";
import { MarkStatus } from "../@type.mark";


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
    }
}