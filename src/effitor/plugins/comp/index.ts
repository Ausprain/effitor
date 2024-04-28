import type * as Et from "@/effitor/@types";
import { getCompEffector } from "./effector";
import { imageComp } from "./image";
import { linkComp } from "./link";
import { listComp } from "./list";


const compMap = {
    image: imageComp,
    link: linkComp,
    list: listComp,
}
type CompNames = keyof typeof compMap

/**
 * 组件插件
 * ```
 * 链接：'link'
 * 图片：'image'
 * 列表：'list'
 * 代码块：//todo
 * ```
 * @param compNames 需要注册的组件，组件将在给定段落元素内生效
 * @param paragraphCtor 编辑器段落元素的构造函数
 * @returns 
 */
export const useCompPlugin = (compNames: CompNames[]): Et.EditorPlugin => {
    let codeSum = 0
    const elements = []

    for (const name of new Set(compNames)) {
        const comp = compMap[name]
        codeSum += comp.code
        elements.push(comp.element)
    }
    const effector: Et.Effector = getCompEffector(codeSum)

    return {
        name: 'comp',
        elements,
        effector,
        registry(ctx) {
            codeSum & listComp.code && listComp.registry?.(ctx.schema.paragraph)
        },
    }
}