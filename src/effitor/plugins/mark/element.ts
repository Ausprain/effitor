/** 实现mark标记节点
 * @author: Ausprain 
 * @email: ausprain@qq.com 
 * @date: 2024-01-10 07:56:43 
 */
import type * as Et from "@/effitor/@types";

import { EtRichTextElement } from "@/effitor/element";
import { MarkEnum, MarkStatus, MarkType } from "./@type.mark";
import { markCssText } from "./config";
import { BuiltinElType, HtmlCharEnum } from "@/effitor/@types/constant";
import { removeNodeAndMerge } from "@/effitor/handler/utils";
import { dom } from "@/effitor/utils";


export class EtMarkElement extends EtRichTextElement {
    // static [k: Et.Effect]: Et.EffectHandler | undefined

    static readonly elName = MarkEnum.ElName
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
    connectedCallback(this: EtMarkElement): void {
        this.className = MarkEnum.ElName
    }
    focusinCallback(ctx: Et.EditorContext): void {
        if (ctx.range.collapsed) {
            this.classList.add(MarkStatus.HINTING)
        }
    }
    focusoutCallback(ctx: Et.EditorContext): void {
        // 已不在dom上, 跳过
        if (!this.isConnected) return
        // 若标记节点仅剩零宽字符，应当将其移除
        if (this.textContent === HtmlCharEnum.ZERO_WIDTH_SPACE) {
            // 回调在selchange之后触发，光标已不在this节点; 标记节点内光标位置，以便撤回删除时能让光标落于this节点内
            const srcTr = dom.caretStaticRangeInNode(this, this.childNodes.length)
            removeNodeAndMerge(ctx, this, srcTr, false) && ctx.commandHandler.handle()
        }
        else {
            this.classList.remove(MarkStatus.HINTING)
        }
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
export const isMarkElement = (node: Et.NullableNode): node is EtMarkElement => (node as Element)?.localName === EtMarkElement.elName
/**
 * 判断是否为空 mark节点
 */
export const isTempMarkElement = (el: EtMarkElement): boolean => el.textContent === HtmlCharEnum.ZERO_WIDTH_SPACE