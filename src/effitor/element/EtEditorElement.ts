import type { Effitor } from '../@types'
import { BuiltinElName } from "../@types";
import { EffectElement } from ".";

/** 编辑器, shadow-root容器 */
export class EtEditorElement extends EffectElement {
    // static readonly [k: Effitor.Effect]: Effitor.EffectHandler | undefined

    static readonly elName = BuiltinElName.ET_APP
    // static readonly cssStyle: Partial<CSSStyleDeclaration> = {
    //     display: 'block',
    //     border: '1px solid #ccc',
    //     padding: '16px',
    // };

    connectedCallback(this: EffectElement): void {
        this.setAttribute('contenteditable', 'false')
        // et-editor作为shadowRoot的host, 样式需要挂在自己身上
        Object.assign(this.style, {
            // display: 'block',
            margin: 'auto',
            padding: '8px 32px',
            border: '1px solid #ccc',
            display: 'flow-root',
            overflow: 'clip',
            overflowClipMargin: 'padding-box',
        } as Effitor.Element.ElStyle)


        // 插入一个标题
        const h2 = document.createElement('h2')
        h2.innerText = 'Effitor Editor Body'
        this.appendChild(h2)

    }
}

export type EtEditorCtor = typeof EtEditorElement