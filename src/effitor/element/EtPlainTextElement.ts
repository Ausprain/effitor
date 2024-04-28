import type * as Et from '../@types'
import { BuiltinElName, BuiltinElType } from "../@types/constant";
import { EffectElement } from ".";

/**
 * 纯文本节点
 */
export class EtPlainTextElement extends EffectElement {
    // static readonly [k: Et.Effect]: Et.EffectHandler | undefined

    static readonly elName: Et.ElName = BuiltinElName.ET_PLAINTEXT;
    readonly elType: Et.ElType = BuiltinElType.PLAINTEXT;

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