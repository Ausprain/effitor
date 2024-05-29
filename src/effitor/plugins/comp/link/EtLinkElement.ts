import { BuiltinElName } from "@/effitor/@types/constant";
import { EtComponentElement } from "@/effitor/element";

const enum A {
    TAG = BuiltinElName.ET_LINK
}
const anchorCssText = `
${A.TAG} {
    cursor: pointer;
    margin: 0 2px;
    padding: 1px 3px;
    border-radius: 2px;
    background-color: hsl(240, 100%, 98%);
}
${A.TAG} > a {
    color: hsl(240, 61%, 57%);
}
${A.TAG}:hover {
    background-color: hsl(240, 100%, 96%);
}
${A.TAG}:active {
    background-color: hsl(240, 100%, 95%);
}
${A.TAG}:active > a {
    color: hsl(240, 61%, 51%);
    use-select: none;
}
`

export class EtLinkElement extends EtComponentElement {
    static readonly elName = A.TAG
    static readonly cssText = anchorCssText

    readonly nestedEditable: boolean = false;

    /**
     * 创造一个EtLink元素（et-a）
     * @param url 链接地址（非空字符串）
     * @param name 链接名（非空字符串）
     */
    static create(el: HTMLAnchorElement): EtLinkElement;
    static create(url: string, name: string): EtLinkElement;
    static create(aOrUrl: HTMLAnchorElement | string, name = '') {
        let a = aOrUrl
        if (typeof aOrUrl === 'string') {
            a = document.createElement('a')
            a.href = aOrUrl
            a.textContent = name
        }
        const el = document.createElement(EtLinkElement.elName)
        el.appendChild(a as HTMLAnchorElement)
        return el
    }

    connectedCallback(): void {
        this.setAttribute('contenteditable', 'false')
    }
}
export type EffitorLinkElementCtor = typeof EtLinkElement;

