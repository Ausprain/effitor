import type { Et } from '..'
import { CssClassEnum, EtTypeEnum } from '../enums'
import { cr } from '../selection'
import { dom } from '../utils'

interface HTMLElementCallbacks {
  connectedCallback?(this: EffectElement): void
  disconnectedCallback?(this: EffectElement): void
  adoptedCallback?(this: EffectElement): void
  attributeChangedCallback?(
    this: EffectElement, name: string, oldValue: string, newValue: string
  ): void
}
interface EffectElementCallbacks {
  /**
   * 光标位于当前Effect元素的直接子孙内（即中间无其他Effect元素）时调用; 即ctx.effectElement更新时调用
   * * 此回调在更新上下文(高频)时调用, 如任务繁重, 应使用异步逻辑
   */
  focusinCallback?(_ctx: Et.EditorContext): void
  /**
   * 当前Effect元素从ctx.effectElement移除（被赋新值）时调用
   * * 此回调在更新上下文(高频)时调用, 如任务繁重, 应使用异步逻辑
   */
  focusoutCallback?(_ctx: Et.EditorContext): void
}

/** 效应拦截器, 作为EffectElement的一个属性, 仅当返回true时, 阻止该效应 */
export type EffectBlocker = (effect: string) => boolean

export interface EtCode {
  /** 效应类型，即该类元素的效应码；用于初始化元素对象的etCode属性; 该值只能使用位运算 */
  readonly etCode?: number
  /** 该元素内部直接子节点允许的效应类型; 该值只能使用位运算 */
  readonly inEtCode?: number
  /** 该元素内部直接子节点`不`允许的效应类型; 该值只能使用位运算 */
  readonly notInEtCode?: number
}

/**
 * 效应元素, 通过绑在类名上的 EffectHandle 处理编辑器效应(编辑行为)
 */
export abstract class EffectElement
  extends (HTMLElement as {
    new (): Et.HTMLElement
    prototype: Et.HTMLElement
  })
  implements HTMLElementCallbacks,
             EffectElementCallbacks,
             Required<EtCode>,
             Et.ToMdast {
  /** 效应类型，即该类元素的效应码；用于初始化元素对象的etCode属性 */
  static etType = 0
  /** 该效应元素直接子节点允许的效应元素类型 */
  static inEtType = 0
  /** 该效应元素直接子节点不允许的效应元素类型 */
  static notInEtType = 0
  /** 元素名, 必须是小写字母且是`et-`开头的kebab形式, 实例的nodeName和tagName是其大写形式, 而localName与该值相同 */
  static readonly elName: string
  /**
   * style对象, 用于构建css字符串, 插入到shadowRoot中的内置样式表, 为元素设置内定样式;
   * 最终会以`${elName} { ... }`形式追加到cssText中
   */
  static readonly cssStyle: Partial<CSSStyleDeclaration> = {}
  /** style字符串, 作为cssStyle的补充, 如添加:focus等的样式 */
  static readonly cssText: string = ''
  /** 观察的属性列表，列表内属性改变时触发 attributeChangedCallback */
  static readonly observedAttributes: string[] = []

  /** 效应拦截器, 当非空 且执行返回true时, 阻止对应效应 */
  static effectBlocker?: EffectBlocker

  /** 节点创建函数, 所有参数必须可选, 因为effitor上下文ctx可能会调用该方法来创造类似的节点(ctx.createEtElementAs) */
  static create() { return document.createElement(this.elName) as EffectElement }
  /** 判断某个node是否为当前效应元素的实例 */
  static is<T extends typeof EffectElement>(
    this: T, node?: Node | null,
  ): node is InstanceType<T> { return (node as Element)?.localName === this.elName }

  /**
   * 这是一个只在效应处理器中调用的(回调)函数;
   * 当效应处理器执行删除操作时, 若需要部分删除某个效应元素节点, 处理器会将节点整体删除,
   * 然后再克隆未选择的部分插回原来的位置; 但效应处理器不知道将要插回的效应元素是否完整,
   * 于是通过此回调函数, 让效应元素类来将自己的实例 el 进行规范化;
   * el 是一个克隆的不在DOM上的(orphan的)元素
   * @returns 正规化后的el元素, 若返回 null, 说明将此元素丢弃 (不再插回页面中)
   */
  static getNormalized(el: EffectElement) {
    return el
  }

  /** 效应码，绑在this上以判断该效应元素内部拥有何种效应 */
  readonly etCode: number = 0
  /** 内部效应码, 该元素允许何种效应的子节点; */
  readonly inEtCode: number = 0
  /** 内部禁止效应码, 该元素禁止何种效应的子节点; */
  readonly notInEtCode: number = 0

  constructor() {
    super()

    const { etType, inEtType, notInEtType } = (
      this.__proto__ ?? Object.getPrototypeOf(this)).constructor as typeof EffectElement

    this.etCode = etType === void 0 ? 0 : etType
    this.inEtCode = inEtType === void 0 ? 0 : inEtType
    this.notInEtCode = notInEtType === void 0 ? 0 : notInEtType

    // 添加一个et类名（因为外部样式文件的标签选择器优先级不够, 这样可以用 et-p.et 来提高优先级 ）
    // fix. document.createElement 时元素对象不可有属性 延迟添加;
    // 不放在connectedCallback里, 是因为其可能会被子类覆盖
    Promise.resolve().then(() => {
      if (etType & EtTypeEnum.Uneditable) {
        this.setAttribute('contenteditable', 'false')
      }
      if (etType & EtTypeEnum.Paragraph) {
        this.classList.add(CssClassEnum.ParagraphLike)
      }
      this.classList.add('et')
    })
  }

  /* -------------------------------------------------------------------------- */
  /*                                 dom methods                                */
  /* -------------------------------------------------------------------------- */
  /** 当前效应元素内容是否视为空; 默认 textContent == '' 时视为空 */
  isEmpty() {
    return this.textContent === ''
  }

  /** 当前效应元素内部可编辑开始边界 */
  innerStartEditingBoundary() {
    return cr.caretInStart(this)
  }

  /** 当前效应元素内部可编辑末尾边界 */
  innerEndEditingBoundary() {
    return cr.caretInEnd(this)
  }

  /* -------------------------------------------------------------------------- */
  /*                                edit behavior                               */
  /* -------------------------------------------------------------------------- */

  /** 替换当前节点, 并转移其后代到新节点; 仅当节点在DocumentFragment内时可以使用 */
  replaceToNativeElement(this: EffectElement) {
    if (this.isConnected) {
      return
    }
  }

  /**
   * 判断与另一个Element是否相同, 默认会判断\
   * { 元素名、class、除class和style外的html属性、元素对象上的可枚举属性 } \
   * 均相同则返回true; \
   * 此方法不回判断后代 \
   * 其他判断逻辑需覆盖此方法, 可使用工具函数`dom.isEqualElement`来调用默认判断逻辑
   */
  isEqualTo(el: Et.Element) {
    return dom.isEqualElement(this, el)
  }

  /**
   * 定义两个认定为相同的 EffectElement 的合并逻辑, 合并后保留当前元素 \
   * 重写时, 可使用工具函数`mergeHtmlNode`来以默认合并逻辑合并this.lastChild和el.firstChild; \
   * *不可用于合并this和el, 否则进入死循环* \
   * @param el 待合并的元素, (经过isEqualTo验证的同类元素)
   * @returns 合并后的中间位置, 若不合并则返回null
   */
  mergeWith(el: typeof this, mergeHtmlNode: Et.MergeHtmlNode) {
    let out = mergeHtmlNode(this.lastChild, el.firstChild)
    if (out) {
      this.append(...el.childNodes)
    }
    else {
      out = cr.caretOutEnd(this)
    }
    el.remove()
    return out
  }

  /* -------------------------------------------------------------------------- */
  /*                                  callbacks                                 */
  /* -------------------------------------------------------------------------- */
  /** <builtin> 元素被插入dom之后调用 */
  connectedCallback?(): void
  /** <builtin> 元素从dom上移除后调用 */
  disconnectedCallback?(): void
  /** <builtin> 元素移动到其他文档(页面)时调用 */
  adoptedCallback?(): void
  /** <builtin> 属性被修改时调用, 需static定义监听的 属性列表 observedAttributes: string[] */
  attributeChangedCallback?(name: string, oldValue: string, newValue: string): void

  focusinCallback?(_ctx: Et.EditorContext): void
  focusoutCallback?(_ctx: Et.EditorContext): void

  /* -------------------------------------------------------------------------- */
  /*                                  markdown                                  */
  /* -------------------------------------------------------------------------- */
  /**
   * 将自身转为mdast节点，需自行处理后代节点，
   * 可使用{@link CreateMdastNode}构建mdast节点，
   * 返回null则忽略该节点
   */
  abstract toMdast(mdastNode: Et.CreateMdastNode): Et.ToMdastResult
  /**
   * `mdast`处理器映射，定义`mdast`节点如何转为`html`节点，***无需手动处理后代节点***
   * * 若处理器返回一个`html`节点，并且当前`mdast node`有`children`属性，则会继续处理其后代节点;
   * 并将处理得到的节点插入到该`html`节点的`childNodes`中
   * * 若注册的EtElement中有多个定义了相同节点的解析方式, 则按插件注册顺序依次处理，直到处理成功为止
   * * 接受的返回值类型: `DocumentFragment | HTMLElement | Text | null`
   * * 返回`null`说明当前效应元素不处理该`mdast节点`, 交给下一个处理器处理
   * * 返回`DocumentFragment`说明当前`mdast节点`无对应`html节点`, 直接将其子节点插入到父节点`childNodes`中, 即相当于跳过当前`mdast节点`
   */
  static readonly fromMarkdownHandlerMap: Et.MdastNodeHandlerMap
  /** mdast节点转换器(对节点原地修改)，转换器会在toMarkdown的最后阶段（序列化为字符串前）执行，对mdast树进行修改 */
  static readonly toMarkdownTransformerMap: Et.MdastNodeTransformerMap
  /**
   * 定义自定义节点的处理逻辑，将mdast节点转为md字符串, 即toMarkdown最后阶段
   * * 自定义mdast节点
   * ```ts
   * declare module 'mdast' {
          interface RootContentMap {
              highlight: HighLight
          }
      }
    * ```
    */
  static readonly toMarkdownHandlerMap: Et.ToMarkdownHandlerMap
}

export type EffectElementCtor = typeof EffectElement

/**
 * 注册一个EtElement为CustomElement
 */
export const registerEtElement = (
  ctor: EffectElementCtor,
) => {
  if (!customElements.get(ctor.elName)) {
    customElements.define(ctor.elName, ctor as unknown as typeof HTMLElement)
  }
}
/**
 * 扩展一个内置效应元素, 为其添加或重写handler
 * @param ctor 被扩展的元素
 * @param extension 扩展执行器handler对象
 * @param extensionElements 扩展哪些新元素到该被扩展元素上（将来哪些元素允许成为该被扩展元素的后代）;若仅扩展handler功能，则传入空数组
 */
export const extentEtElement = (
  ctor: EffectElementCtor,
  extension: Et.EffectHandleMap,
  extensionElements: EffectElementCtor[],
) => {
  // 将新的EffectHandle绑到构造函数上
  Object.assign(ctor, extension)
  extensionElements?.forEach((ext) => {
    // 扩充允许列表
    ctor.inEtType |= ext.etType
    // 从禁止列表中剔除
    ctor.notInEtType -= ctor.notInEtType & ext.etType
  })
}
export type ExtentEtElement = typeof extentEtElement
