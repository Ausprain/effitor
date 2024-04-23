import type { Effitor } from "@/effitor/@types";
import { markEffector } from "./effector"
import { EtMarkElement } from "./element"
import { extentEtElement } from "@/effitor/element"
import { inMarkHandler, markHandler } from "./handler"

/**
 * mark标记节点插件
 */
export const useMarkPlugin = (): Effitor.Editor.Plugin => {
    return {
        name: 'mark',
        effector: markEffector,
        elements: [EtMarkElement],
        registry(ctx) {
            extentEtElement(EtMarkElement, inMarkHandler)
            extentEtElement(EtMarkElement, markHandler)
            extentEtElement(ctx.schema.paragraph, markHandler)
        },
    }
}

