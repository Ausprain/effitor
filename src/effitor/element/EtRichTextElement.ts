import type { Effitor } from '../@types'
import { BuiltinElName, BuiltinElType } from "../@types";
import { EffectElement } from ".";
import { cssStyle2cssText } from "../utils";

/**
 * 富文本节点
 */
export class EtRichTextElement extends EffectElement {
    // static readonly [k: Effitor.Effect]: Effitor.EffectHandler | undefined

    static readonly elName: Effitor.Element.ElName = BuiltinElName.ET_RICHTEXT;
    readonly elType: Effitor.Element.ElType = BuiltinElType.RICHTEXT;

    replaceToNativeElement(): void {
        const computedMap = this.computedStyleMap();
        const isBlock = computedMap.get('display') === 'block';
        const cssStyle: Effitor.Element.ElStyle = {
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

