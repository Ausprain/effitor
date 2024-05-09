import type * as Et from '../@types'
import { BuiltinElName, BuiltinElType, CssClassEnum } from "../@types/constant";
import { EffectElement } from ".";

const enum P {
    TAG = BuiltinElName.ET_PARAGRAPH,
    // TAG = 'et-p',
    X = '3px',
    C = '#336699',
}
const paragraphCssText = `
${P.TAG} {
    position: relative;
    display: block;
    min-height: 1.5em;
    line-height: 1.5em;
    margin: 4px 0 4px -${P.X};
    padding: ${P.X};
    border: 1px solid #0000;
    border-radius: 3px;
}
${P.TAG}::before {
    cursor: move;
    content: "¶";
    position: absolute;
    top: 0;
    left: -21px;
    width: 16px;
    padding: ${P.X} 0;
    color: #eee;
    text-align: center;
    font-size: 1em;
    font-family: consolas;
    transform: translateZ(0);
    user-select: none;
}
${P.TAG}:hover::before {
    color: ${P.C};
}
${P.TAG}.${CssClassEnum.Active}::before {
    color: ${P.C};
}
${P.TAG}.${CssClassEnum.Dragging} {
    border: 1px dashed;
    opacity: .5;
}
${P.TAG}.${CssClassEnum.Dragover} {
    border: 1px dotted;
    opacity: .8;
}
${P.TAG}.${CssClassEnum.Heading} {
    font-weight: bold;
    font-size: 1.1em;
}
`

/**
 * 段落
 */
export class EtParagraphElement extends EffectElement {
    // static readonly [k: Et.Effect]: Et.EffectHandler | undefined

    static readonly elName: Et.ElName = BuiltinElName.ET_PARAGRAPH;
    static readonly cssText: string = paragraphCssText;

    readonly elType: Et.ElType = BuiltinElType.PARAGRAPH;

    get pid(): string {
        return this.getAttribute('pid')
    }
    set pid(v) {
        this.setAttribute('pid', v)
    }

    get indent(): number {
        return parseInt(this.getAttribute('indent') || '0')
    }
    // * 在vue中, 可在此处使用响应式变量, 以对缩进更改作响应式; 比如更新pid
    set indent(v) {
        this.setAttribute('indent', v.toString())
    }

    connectedCallback(this: EtParagraphElement): void {
        // console.log('p connected callback')
        // console.log('pid: ', this.pid)
        // 给新段落赋予id
        if (!this.id) {
            this.id = Date.now().toString()
            this.indent = 0
            if (this.innerText === '') {
                // 空段落, 使用<br>占位
                this.append(document.createElement('br'))
            }
        }
    }

    focusinCallback(): void {
        // console.log('paragraph focusin', this)
        this.classList.add(CssClassEnum.Active)
    }
    focusoutCallback(): void {
        // console.log('paragraph focusout', this)
        this.classList.remove(CssClassEnum.Active)
    }

    replaceToNativeElement(): void {
        const div = document.createElement('div')
        div.append(...this.childNodes)
        this.replaceWith(div)
    }

    static create(): EtParagraphElement {
        return document.createElement(P.TAG)
    }
}

export type EtParagraphCtor = typeof EtParagraphElement