import type { Effitor } from '../@types'
import { BuiltinElName, BuiltinElType } from "../@types";
import { EffectElement } from ".";

/**
 * 纯文本节点
 */
export class EtPlainTextElement extends EffectElement {
    // static readonly [k: Effitor.Effect]: Effitor.EffectHandler | undefined

    static readonly elName: Effitor.Element.ElName = BuiltinElName.ET_PLAINTEXT;
    readonly elType: Effitor.Element.ElType = BuiltinElType.PLAINTEXT;

    connectedCallback(this: EffectElement): void {
        this.setAttribute('contenteditable', 'plaintext-only')
    }

    replaceToNativeElement(): void {
        const span = document.createElement('span')
        span.append(...this.childNodes)
        this.replaceWith(span)
    }
}
export type EtPlainTextCtor = typeof EtPlainTextElement