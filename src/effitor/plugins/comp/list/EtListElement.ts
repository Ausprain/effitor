import type { Effitor } from '../../../@types'
import { BuiltinElName } from "@/effitor/@types";
import { EtComponentElement } from "@/effitor/element";
import { dom } from "@/effitor/utils";

const enum L {
    TAG = BuiltinElName.ET_LIST,
    OL = 'ordered'
}

const cssText = `
${L.TAG} {
    display: block;
}
${L.TAG} ol,
${L.TAG} ul {
    padding-inline-start: 32px;
}
${L.TAG} ol ol {
    list-style: lower-alpha
}
`
// ${L.TAG} ol,
// ${L.TAG} ul {
//     padding-inline-start: 12px;
// }
// ${L.TAG} li {
//     display: flex;
//     justify-content: flex-start;
//     align-items: center;
// }
// ${L.TAG} li::before {
//     min-width: 20px;
//     text-align: center;
// }
// ${L.TAG} ul li::before {
//     /* 实心圆 • ◦ ◉ ■ ▲ ◆ ★ ● ○ ◇ */
//     content: "• ";
//     color: red;
// }

// ${L.TAG} ol {
//     counter-reset: ol-level1;
//     counter-set: ol-level1 attr(start);
// }
// ${L.TAG} ol ol {
//     counter-reset: ol-level2;
// }
// ${L.TAG} ol li::before {
//     content: counter(ol-level1, decimal) ". ";
//     counter-increment: ol-level1;
// }
// ${L.TAG} ol ol li::before {
//     content: /* counter(ol-level1, decimal) "." */ counter(ol-level2, lower-alpha) ". ";
//     counter-increment: ol-level2;
// }

export class EtListElement extends EtComponentElement {
    static readonly elName: Effitor.Element.ElName = L.TAG;
    static readonly cssText: string = cssText;

    static create(ordered: boolean, start = 1) {
        const etl = document.createElement(L.TAG);
        ordered && etl.classList.add(L.OL)
        const list = document.createElement(ordered ? 'ol' : 'ul')
        if (start > 1) list.setAttribute('start', start.toString())
        const [li, zws] = EtListElement.createLi()
        li.append(zws)
        list.append(li);
        etl.append(list);
        return [etl, zws] as [EtListElement, Text];
    }
    static createLi() {
        const li = document.createElement('li')
        const zws = dom.zwsText()
        return [li, zws] as [HTMLLIElement, Text]
    }

    changeOrdered(ordered: boolean, changeAll: boolean = false) {
        if (ordered && this.classList.contains(L.OL)) return;
        this.classList.toggle(L.OL, ordered);
        const curTag = this.children[0].localName;
        const newTag = ordered ? 'ol' : 'ul';
        const needReplaceNodes: HTMLElement[] = []
        dom.traverseNode(this, (node) => {
            if (node.localName === curTag) needReplaceNodes.push(node);
            if (changeAll) return true
        }, {
            whatToShow: NodeFilter.SHOW_ELEMENT
        })
        needReplaceNodes.forEach(node => {
            const newEl = document.createElement(newTag)
            newEl.append(...node.childNodes)
            newEl.contentEditable = 'true'
            node.replaceWith(newEl)
        })
    }

    connectedCallback(): void {
        // this.contentEditable = 'true'
    }

    replaceToNativeElement(): void {
        // const ele = this.classList.contains(L.OL) ? document.createElement('ol') : document.createElement('ul');
        // ele.append(...this.childNodes)
        // this.replaceWith(ele);
        this.parentElement?.append(...this.childNodes)
        this.remove()
    }

}
export type EffitorListElementCtor = typeof EtListElement