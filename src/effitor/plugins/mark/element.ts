/** 实现mark标记节点
 * @author: Ausprain 
 * @email: ausprain@qq.com 
 * @date: 2024-01-10 07:56:43 
 */
import type { Effitor } from "@/effitor/@types";

import { EtRichTextElement } from "@/effitor/element";
import { MarkElName, MarkEnum, MarkStatus, MarkType } from "./@type.mark";
import { markCssText } from "./config";
import { BuiltinElType, HtmlCharEnum, type DOM } from "@/effitor/@types";


export class EtMarkElement extends EtRichTextElement {
    // static [k: Effitor.Effect]: Effitor.EffectHandler | undefined

    static readonly elName = MarkElName
    static readonly cssText: string = markCssText

    readonly elType = BuiltinElType.RICHTEXT;
    markType: `${MarkType}` | undefined
    changeMarkType(markType: `${MarkType}`) {
        if (this.markType !== markType) {
            this.markType && this.classList.remove(this.markType)
            this.classList.add(markType)
            this.markType = markType
        }
    }
    focusinCallback(ctx: Effitor.Editor.Context): void {
        if (ctx.range.collapsed) {
            this.classList.add(MarkStatus.HINTING)
        }
    }
    focusoutCallback(): void {
        this.classList.remove(MarkStatus.HINTING)
    }
}
export type EffitorMarkElementCtor = typeof EtMarkElement
// export type Instance = InstanceType<typeof EtMarkElement>

/**
 * 标记节点嵌套规则：
 * ```
 * code不可嵌套，也不可被嵌套
 * delete不可嵌套
 * highlight可嵌套除code外所有
 * bold可嵌套italic，反之不可
 * ```
 */
export const nestedMarkMap: { [k in MarkType]?: `${MarkType}`[] } = {
    [MarkType.HIGHLIGHT]: [MarkType.BOLD, MarkType.ITALIC, MarkType.DELETE],
    [MarkType.BOLD]: [MarkType.ITALIC, MarkType.DELETE],
    [MarkType.ITALIC]: [MarkType.DELETE],
}

/**
 * 创建一个mark节点；返回 该节点和其子#text节点, #text的值为一个零宽字符
 */
export const createMarkNode = (
    markType: `${MarkType}`,
    data: string = '',
): [EtMarkElement, Text] => {
    // const markEl = document.createElement('et-mark')
    const markEl = document.createElement(MarkEnum.ElName)
    const text = document.createTextNode(HtmlCharEnum.ZERO_WIDTH_SPACE + data)
    markEl.appendChild(text)
    markEl.changeMarkType(markType)
    // 没有data, 标记临时节点
    !data && markEl.classList.add(MarkStatus.MARKING)
    return [markEl, text]
}
/**
 * 判断一个节点是否为 EtMarkElement
 */
export const isMarkElement = (node: DOM.NullableNode): node is EtMarkElement => (node as Element)?.localName === EtMarkElement.elName
/**
 * 判断是否为空 mark节点
 */
export const isTempMarkElement = (el: EtMarkElement): boolean => el.textContent === HtmlCharEnum.ZERO_WIDTH_SPACE