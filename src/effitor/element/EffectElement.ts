import type * as Et from '../@types'
import { BuiltinElType } from "../@types/constant"

/**
 * 效应元素, 通过绑在类名上的 EffectHandle 处理编辑器逻辑
 */
export abstract class EffectElement extends HTMLElement implements Et.ElementCallbacks {
    /** 绑在类名上的效应处理器 */
    // static readonly [k: Et.Effect]: Et.EffectHandler | undefined
    /** 元素名, 应与实例的tagName或nodeName的小写完全相同, 即Element.localName */
    static readonly elName: Et.ElName
    /** style对象, 用于构建<style>标签字符串, 插入到shadownRoot中的内置样式表, 为元素设置内定样式; 最终以`${elName} { ... }`形式追加到cssText中 */
    static readonly cssStyle: Et.ElStyle = {}
    /** style字符串, 作为cssStyle的补充, 如添加:focus等的样式 */
    static readonly cssText: string = ''
    static readonly observedAttributes: string[] = []

    /** 元素类型, 绑在this上用于判断是否是效应元素 */
    readonly elType: Et.ElType = BuiltinElType.UNDEFINED

    /** 效应拦截器, 当非空 且执行返回true时, 阻止对应效应 */
    effectBlocker?: Et.EffectBlocker

    connectedCallback?(this: EffectElement): void
    disconnectedCallback?(this: EffectElement): void
    adoptedCallback?(this: EffectElement): void
    attributeChangedCallback?(this: EffectElement, name: string, oldValue: string, newValue: string): void

    /** 替换当前节点, 并转移其后代到新节点; 在DocumentFragment内使用 */
    replaceToNativeElement(this: EffectElement) { return }
    /** 光标位于当前Effect元素的直接子孙内（即中间无其他Effect元素）时调用; 即赋值到ctx.effectElement时调用 */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    focusinCallback(_ctx: Et.EditorContext) { }
    /** 当前Effect元素从ctx.effectElement移除（被赋新值）时调用 */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    focusoutCallback(_ctx: Et.EditorContext) { }

}
export type EffectElementCtor = typeof EffectElement


/**
 * 全局记录已注册的元素
 */
// const globalDefinedElement: { [k: string]: EffectElementCtor } = {}
/**
 * 扩展一个内置效应元素, 为其添加或重写handler
 * fixme 思考 为什么一定要挂到构造函数上 而不直接挂到元素原型对象上
 *  1. 性能? HTMLElement 原型上有太多属性, 会影响访问速度, 但绑到构造函数上也要多一步 getPrototype().constructor 谁优谁劣? 
 */
export const extentEtElement = (
    ctor: EffectElementCtor,
    extention: Partial<Et.EffectHandlerDeclaration>
) => {
    // 将新的EffectHandle绑到构造函数上
    Object.assign(ctor, extention)
}
/**
 * 注册一个EtElement为CustomElement
 */
export const registerEtElement = (
    ctor: EffectElementCtor,
) => {
    // if (globalDefinedElement[ctor.elName]) {
    //     throw new Error(`Effect Element named '${ctor.elName}' already defined`)
    // }
    customElements.get(ctor.elName) || customElements.define(ctor.elName, ctor as any)
    // todo 需传入ShadowRoot 对已注册元素进行升级
    // const root = {} as ShadowRoot 
    // root.querySelectorAll(ctor.elName).forEach(el => customElements.upgrade(el))
}
