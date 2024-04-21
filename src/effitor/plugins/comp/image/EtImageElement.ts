import { BuiltinElName } from "@/effitor/@types"
import { EtComponentElement } from "@/effitor/element"

const enum I {
    TAG = BuiltinElName.ET_IMAGE
}

const etImgCssText = `
${I.TAG} {
    display: block;
    margin: auto;
}
${I.TAG}.float-start {
    float: inline-start;
    margin: 8px;
}
${I.TAG}.float-end {
    float: inline-end;
    margin: 8px;
}
`

export class EtImageElement extends EtComponentElement {
    static readonly elName = I.TAG
    static readonly cssText = etImgCssText

    readonly nestedEditable: boolean = false

    /**
     * 创建一个EtImage元素（et-img）
     */
    static create(imgOrSrc: HTMLImageElement | string, alt = '') {
        let img = imgOrSrc
        if (typeof imgOrSrc === 'string') {
            img = document.createElement('img')
            img.src = imgOrSrc
            img.alt = alt
        }
        const el = document.createElement(EtImageElement.elName)
        el.appendChild(img as HTMLImageElement)
        return el
    }

    connectedCallback(): void {
        this.setAttribute('contenteditable', 'false')
    }

}
export type EffitorImageElementCtor = typeof EtImageElement