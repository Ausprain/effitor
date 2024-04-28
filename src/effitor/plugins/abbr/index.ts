import type * as Et from "@/effitor/@types";
import type { AbbrConfig, AbbrName } from "./abbr";
import { abbrListener, createAbbrs } from "./abbr";
import { getAbbrEffector } from "./effector";
import { abbrContext } from "./config";
import { extentEtElement } from "@/effitor/element";
import { abbrHandler, inAbbrHandler } from "./handler";
import { EtAbbrElement } from "./element";


export type AbbrInit = {
    name: AbbrName,
    config: AbbrConfig
}

type UseAbbrOptions = {
    /** 触发字符, 默认`.`  即输入【`ps.`空格】 触发`ps`缩写符 */
    triggerChar?: string;
    abbrInits: AbbrInit[]
}

export const useAbbrPlugin = (options?: UseAbbrOptions): Et.EditorPlugin => {
    abbrContext.triggerChar = options?.triggerChar ?? abbrContext.triggerChar
    options?.abbrInits.forEach(init => {
        abbrListener.registerAbbrs(createAbbrs(init.name, init.config))
    })

    return {
        name: "abbr",
        effector: getAbbrEffector(),
        elements: [EtAbbrElement],
        registry(ctx) {
            extentEtElement(ctx.schema.paragraph, abbrHandler)
            extentEtElement(EtAbbrElement, inAbbrHandler)
        },
    }
}