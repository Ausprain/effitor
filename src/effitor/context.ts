import type * as Et from "@/effitor/@types";
import type { EffectElement, EtBodyElement, EtParagraphElement } from "./element"
import { initEffectInvoker } from "./handler"
import { initCommandHandler } from "./handler/cmd"
import { dom } from "./utils"


export class EtContext implements Et.EditorContext {
    [s: symbol]: any

    readonly editor: Et.Editor;
    readonly schema: Et.EditorSchema
    readonly config: Et.EditorConfig
    host: HTMLDivElement = null as any
    root: Et.ShadowRoot = null as any
    body: EtBodyElement = null as any

    selection: Selection = null as any
    range: Range = null as any
    node: Et.NullableText = null
    oldNode: Et.NullableText = null
    private _effectElement: EffectElement = null as any;
    private _paragraphEl: EtParagraphElement = null as any;

    // focused: false,
    currDownKey?: string = undefined
    prevUpKey: undefined
    // isComposing: false,
    inCompositionSession: boolean = false
    compositionUpdateCount: number = 0
    // skipSelChange: 0,
    skipDefault: boolean = false
    // isEtElBegining: false

    forceUpdate: (this: Et.EditorContext) => void = updateContext.bind(this);
    effectInvoker: Et.EffectInvoker;
    commandHandler: Et.CommandHandler;

    constructor(
        editor: Et.Editor,
        schema: Et.EditorSchema,
        config: Et.EditorConfig,
    ) {
        this.editor = editor
        this.schema = schema
        this.config = config
        this.effectInvoker = initEffectInvoker(this)
        this.commandHandler = initCommandHandler(this)
    }

    get effectElement() {
        return this._effectElement
    }
    set effectElement(v) {
        if (this._effectElement === v) return
        // this._effectElement?.localName !== this.schema.paragraph.elName && this._effectElement?.focusoutCallback?.(this)
        // fix. 为防止focusoutCallback里用到context, 先更新this._effectElement, 再调用focusoutCallback
        const old = this._effectElement
        this._effectElement = v
        old && old.localName !== this.schema.paragraph.elName && old.focusoutCallback(this)
        this._effectElement.localName !== this.schema.paragraph.elName && this._effectElement.focusinCallback(this)
    }
    get paragraphEl() {
        return this._paragraphEl
    }
    set paragraphEl(v) {
        if (this._paragraphEl === v) return
        this._paragraphEl?.focusoutCallback(this)
        this._paragraphEl = v
        this._paragraphEl.focusinCallback(this)
    }

    modify(alter: ModifyAlter, direction: ModifyDirection, granularity: ModifyGranularity) {
        this.selection.modify(alter, direction, granularity)
        this.forceUpdate()
    }
}

function updateContext(this: EtContext): boolean {
    // console.log('update context')
    try {
        // 每次focus时重新获取selection对象, 更新上下文时直接使用同一个对象即可
        const sel = this.selection
        this.range = sel.getRangeAt(0)!    // 光标focus到编辑器内, range必定存在
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
    } catch (__) {
        if (import.meta.env.DEV) console.error(__)
        return false
    }
}
