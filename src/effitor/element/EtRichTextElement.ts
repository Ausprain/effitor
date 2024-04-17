import { BuiltinElName, BuiltinElType, type Et } from "../@types";
import { EffectElement } from ".";
import { cssStyle2cssText } from "../utils";

/**
 * 富文本节点
 */
export class EtRichTextElement extends EffectElement {
    // static readonly [k: Et.Effect]: Et.EffectHandler | undefined

    static readonly elName: Et.ElName = BuiltinElName.ET_RICHTEXT;
    readonly elType: Et.ElType = BuiltinElType.RICHTEXT;

    replaceToNativeElement(): void {
        const computedMap = this.computedStyleMap();
        const isBlock = computedMap.get('display') === 'block';
        const cssStyle: Et.ElStyle = {
            color: computedMap.get('color')?.toString() ?? '',
            backgroundColor: computedMap.get('background-color')?.toString() ?? '',
            fontFamily: computedMap.get('font-family')?.toString() ?? '',
            fontWeight: computedMap.get('font-weight')?.toString() ?? '',
        }

        const ele = isBlock ? document.createElement('div') : document.createElement('span')
        ele.append(...this.childNodes)
        ele.setAttribute('style', cssStyle2cssText(cssStyle))
        this.replaceWith(ele)
    }
}
export type EtRichTextCtor = typeof EtRichTextElement

