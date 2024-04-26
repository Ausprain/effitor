import type { Effitor } from "@/effitor/@types";
import { markEffector } from "./effector"
import { EtMarkElement } from "./element"
import { EtParagraphElement, extentEtElement, type EffectElementCtor } from "@/effitor/element"
import { inMarkHandler, markHandler } from "./handler"

/**
 * mark标记节点插件
 * @param needMarkEffectElementCtors 需要mark effect的元素构造器列表
 */
export const useMarkPlugin = (needMarkEffectElementCtors: EffectElementCtor[] = [EtParagraphElement]): Effitor.Editor.Plugin => {
    return {
        name: 'mark',
        effector: markEffector,
        elements: [EtMarkElement],
        registry() {
            extentEtElement(EtMarkElement, inMarkHandler)
            extentEtElement(EtMarkElement, markHandler)
            // 注册接收markEffect的元素
            needMarkEffectElementCtors?.forEach(Ctor => extentEtElement(Ctor, markHandler))
        },
    }
}

