import { BuiltinElName, type Et } from "../@types";
import { EffectElement } from ".";

/**
 * 编辑区
 */
export class EtBodyElement extends EffectElement {
    // static readonly [k: Et.Effect]: Et.EffectHandler | undefined

    static readonly elName = BuiltinElName.ET_BODY
    static readonly cssStyle: Et.ElStyle = {
        display: 'block',
        minHeight: '64px',
        outline: 'none',
        border: 'none',
        whiteSpace: 'pre-wrap',
        fontFamily: 'ubuntu',
        fontWeight: '449',
        fontSize: '16.6px'
    }

    connectedCallback(): void {
        this.setAttribute('contenteditable', '')
        this.setAttribute('part', BuiltinElName.ET_BODY)
    }

    replaceToNativeElement(): void {
        const div = document.createElement('div')
        div.append(...this.childNodes)
        this.replaceWith(div)
    }
}

export type EtBodyCtor = typeof EtBodyElement