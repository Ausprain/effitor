import type { DOM, Effitor } from "@/effitor/@types";
import { EffectElement, EtBodyElement, type EtParagraphElement } from "./element"
import { initEffectInvoker } from "./handler"
import { initCommandHandler } from "./handler/cmd"
import { dom } from "./utils"


class EtContext implements Effitor.Editor.Context {
    [s: symbol]: any

    readonly schema: Effitor.Editor.Schema
    readonly config: Effitor.Editor.Config
    el: HTMLDivElement = null as any
    root: DOM.ShadowRoot = null as any
    body: EtBodyElement = null as any

    selection: Selection = null as any
    range: Range = null as any
    node: DOM.NullableText = null
    oldNode: DOM.NullableText = null
    private _effectElement: EffectElement = null as any;
    private _paragraphEl: EtParagraphElement = null as any;

    // focused: false,
    currDownKey?: string = undefined
    prevUpKey: undefined
    // isComposing: false,
    inCompositionSession: boolean = false
    compositionupdateCount: number = 0
    // skipSelChange: 0,
    skipDefault: boolean = false
    // isEtElBegining: false

    forceUpdate: (this: Effitor.Editor.Context) => void = updateContext.bind(this);
    effectInvoker: Effitor.Handler.EffectInvoker = initEffectInvoker(this);
    commandHandler: Effitor.Handler.CommandHandler = initCommandHandler(this);

    constructor(
        schema: Effitor.Editor.Schema,
        config: Effitor.Editor.Config,
    ) {
        this.schema = schema
        this.config = config
    }

    get effectElement() {
        return this._effectElement
    }
    set effectElement(v) {
        if (this._effectElement === v) return
        this._effectElement?.localName !== this.schema.paragraph.elName && this._effectElement?.focusoutCallback?.(this)
        this._effectElement = v
        this._effectElement.localName !== this.schema.paragraph.elName && this._effectElement.focusinCallback?.(this)
    }
    get paragraphEl() {
        return this._paragraphEl
    }
    set paragraphEl(v) {
        if (this._paragraphEl === v) return
        this._paragraphEl?.focusoutCallback()
        this._paragraphEl = v
        this._paragraphEl.focusinCallback()
    }

}

function updateContext(this: Effitor.Editor.Context): boolean {
    // if (!this.focused) return false
    // console.log('update context')

    let sel: Selection | null = this.selection
    if (!sel) {
        // chromium通过shadowRoot.getSelection获取shadowRoot内部选区, 其他依旧通过window获取
        sel = this.root.getSelection ? this.root.getSelection() : window.getSelection()
        if (!sel) {
            console.error('no selection')
            return false
        }
        this.selection = sel
    }
    const r = sel.rangeCount && sel.getRangeAt(0)
    if (!r) {
        console.error('no range', sel, r)
        return false
    }
    this.range = r
    // const focusNode = r.endContainer   // 不一定是 sel.focusNode 
    const focusNode = sel.focusNode
    this.node = dom.isTextNode(focusNode) ? focusNode : null
    if (this.oldNode !== null && this.oldNode === this.node) {
        // console.error('同一个节点, 更新完毕', this.oldNode, this.node)
        return true
    }
    // fix. 后置更新oldNode, 因为 handle命令时也更新了一次, 避免一直出现'同一节点内'的情况
    this.oldNode = this.node

    const effectEl = dom.findEffectParent(focusNode)
    if (!effectEl) {
        console.error("effect element not found")
        return false
    }
    this.effectElement = effectEl

    const pName = this.schema.paragraph.elName
    if (effectEl.localName === pName) {
        this.paragraphEl = effectEl as EtParagraphElement
    }
    else {
        const currP = dom.findParagraphParent(focusNode, pName)
        if (!currP) {
            console.error("paragraph element not found")
            return false
        }
        this.paragraphEl = currP
    }
    // console.error('update ctx done', this)
    return true
}

let _ctx: Effitor.Editor.Context
export const initContext = (schema: Effitor.Editor.Schema, config: Effitor.Editor.Config): Effitor.Editor.Context => {
    if (_ctx) return _ctx
    return _ctx = new EtContext(schema, config)
}
