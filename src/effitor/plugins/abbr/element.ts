import type { Abbr } from "./abbr";
import { EtComponentElement } from "@/effitor/element";
import { AbbrConfigEnum } from "./config";
import { CssClassEnum } from "@/effitor/@types";

const enum A {
    Tag = AbbrConfigEnum.EL_NAME,
    Pre = CssClassEnum.Prefix,
    Suf = CssClassEnum.Suffix,
    Blk = CssClassEnum.Block,
    Attr_display = 'abbr-display',
    Attr_description = 'abbr-descr'
}

const cssText = `
${A.Tag} {
    margin: 0 4px;
    padding: 4px 6px;
    border-radius: 3px;
    word-break: break-all;   /* 缩写符内边缘截断所有文本 */
}
${A.Tag}::before,
${A.Tag}::after {
    display: inline-block;
    font-style: italic;
    font-size: .83em;
    font-family: Cascadia Code, Consolas;
}

${A.Tag}.${A.Pre} {
    
}
${A.Tag}.${A.Pre}::before {
    content: attr(${A.Attr_display});
    margin-right: .3em;
}

${A.Tag}.${A.Suf} {

}
${A.Tag}.${A.Suf}::after {
    content: attr(${A.Attr_display});
    translate: 0px -.4em;
    margin-left: .4em;
}

${A.Tag}.${A.Blk} {
    display: block;
    padding: 8px 16px;
    border-radius: 6px;
}
${A.Tag}.${A.Blk}::before {
    content: attr(${A.Attr_display});
    display: block;
    transform: translate(-6px, -4px);
    text-decoration: underline;
}
`


export class EtAbbrElement extends EtComponentElement {
    static readonly elName = A.Tag
    static readonly cssText = cssText

    constructor() { super() }

    connectedCallback(this: EtAbbrElement): void { }

}

export type EtAbbrCtor = typeof EtAbbrElement

export const createEtAbbrElement = (abbr: Abbr, text: string) => {
    const el = document.createElement(A.Tag) as EtAbbrElement
    let typeName = A.Pre

    // todo add other elements
    if (abbr.type & 1) {
        // 前缀符
    }
    else if (abbr.type & 2) {
        // 后缀符
        typeName = A.Suf
    }
    else {
        // 块级符
        typeName = A.Blk
    }
    el.setAttribute('part', `${abbr.name}-${typeName}`)
    el.setAttribute(A.Attr_display, abbr.display)
    el.setAttribute(A.Attr_description, abbr.description)
    el.classList.add(typeName)

    el.textContent = text
    return el
}