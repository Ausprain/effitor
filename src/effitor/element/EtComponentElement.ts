import { BuiltinElName, BuiltinElType, type Et } from "../@types";
import { EffectElement } from "./EffectElement";

/**
 * 组件节点
 */
export class EtComponentElement extends EffectElement {
    // static readonly [k: Et.Effect]: Et.EffectHandler | undefined

    static readonly elName: Et.ElName = BuiltinElName.ET_COMPONENT
    /**
     * 是否嵌套contenteditable, 即组件内是否有contenteditable=true的节点
     */
    readonly nestedEditable: boolean = false;
    readonly elType: Et.ElType = BuiltinElType.COMPONENT;

    connectedCallback?(): void {
        this.setAttribute('contenteditable', 'false')
    }

    replaceToNativeElement?(): void {
        const div = document.createElement('div')
        div.append(...this.childNodes)
        this.replaceWith(div)
    }
}
export type EtComponentCtor = typeof EtComponentElement

