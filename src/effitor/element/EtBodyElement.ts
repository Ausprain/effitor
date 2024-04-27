import type { Effitor } from '../@types'
import { BuiltinElName } from "../@types";
import { EffectElement } from ".";

/**
 * 编辑区
 */
export class EtBodyElement extends EffectElement {
    // static readonly [k: Effitor.Effect]: Effitor.EffectHandler | undefined

    static readonly elName = BuiltinElName.ET_BODY
    static readonly cssStyle: Effitor.Element.ElStyle = {
        display: 'block',
        minHeight: '64px',
        outline: 'none',
        border: 'none',
        whiteSpace: 'pre-wrap',
        fontFamily: 'ubuntu',
        fontWeight: '449',
        fontSize: '15px'
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