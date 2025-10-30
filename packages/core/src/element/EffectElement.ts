import { BuiltinConfig, CssClassEnum, EtTypeEnum, HtmlCharEnum } from '@effitor/shared'

import type { Et } from '../@types'
import { cr } from '../selection'
import { dom } from '../utils'
import { ETCODE, EtCode, IN_ETCODE, NOT_IN_ETCODE } from './config'

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
   * 光标位于当前Effect元素的直接子孙内（即中间无其他Effect元素）时调用; 即ctx.focusEtElement更新时调用
   * * 此回调在更新上下文(高频)时调用, 如任务繁重, 应使用异步逻辑
   */
  focusinCallback?(_ctx: Et.EditorContext): void
  /**
   * 当前Effect元素从ctx.focusEtElement移除（被赋新值）时调用
   * * 此回调在更新上下文(高频)时调用, 如任务繁重, 应使用异步逻辑
   */
  focusoutCallback?(_ctx: Et.EditorContext): void
}

/** 效应拦截器, 作为EffectElement的一个属性, 仅当返回true时, 阻止该效应 */
export type EffectBlocker = (effect: string, ctx: Et.EditorContext, el: EffectElement) => boolean

/**
 * 效应元素, 通过绑在类名上的 EffectHandle 处理编辑器效应(编辑行为)
 */
export abstract class EffectElement
  extends (HTMLElement as {
    new(): Et.HTMLElement
    prototype: Et.HTMLElement
  })
  implements HTMLElementCallbacks,
  EffectElementCallbacks,
  Required<EtCode>,
  Et.ToMdast {
  /**
   * 当前效应元素类的父类效应处理器(本质上是该构造器的原型), 基类EffectElement指向 HTMLElement\
   * 该属性在 registerEtElement 注册时初始化, 用于快速访问父类的效应处理器
   * * 使用此属性直接调用效应处理函数会无视`effectBlocker`
   */
  declare static readonly superHandler: Et.EffectHandleThis
  /**
   * 当前效应元素类的效应处理器(本质上是构造器自身), 该属性在 registerEtElement 注册时初始化,
   * 用于快速访问该类对象上的效应处理器;
   * * 该属性只可用于调用效应处理器 ( 替代 `ctx.effectInvoker.invoke` 好让 IDE 追踪到调用处 )
   * * 性能敏感场景应优先使用 `ctx.effectInvoker.invoke(el, 'XXX')` 或 `ctx.getEtHandler(el).XXX`
   * * 使用此属性直接调用效应处理函数会无视`effectBlocker`
   */
  declare static readonly thisHandler: Et.EffectHandleThis

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

  /**
   * 效应拦截器, 当非空 且执行返回true时, 阻止对应效应;
   * 同时, 也可以作为一个通用效应处理器, 但只在使用 effectInvoker.invoke 调用时生效
   * @deprecated 此属性在使用非 effectInvoker.invoke 激活效应时无效
   */
  static effectBlocker?: EffectBlocker

  /** 节点创建函数, 所有参数必须可选, 因为effitor上下文ctx可能会调用该方法来创造类似的节点(ctx.createEtElementAs) */
  static create() { return document.createElement(this.elName) as EffectElement }
  /** 判断某个node是否为当前效应元素的实例 */
  static is<T extends typeof EffectElement>(
    this: T, node?: Node | null,
  ): node is InstanceType<T> { return (node as Element)?.localName === this.elName }

  /**
   * // TODO, 与 DeleteContentsSpanningStart 和 DeleteContentsSpanningEnd 效应的取舍
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

  declare readonly [ETCODE]: number
  declare readonly [IN_ETCODE]: number
  declare readonly [NOT_IN_ETCODE]: number

  /** 效应码，绑在this上以判断该效应元素内部拥有何种效应 */
  get etCode() {
    return this[ETCODE]
  }

  /** 内部效应码, 该元素允许何种效应的子节点; */
  get inEtCode() {
    return this[IN_ETCODE]
  }

  /** 内部禁止效应码, 该元素禁止何种效应的子节点; */
  get notInEtCode() {
    return this[NOT_IN_ETCODE]
  }

  constructor() {
    super()

    const { etType, inEtType, notInEtType } = (
      this.__proto__ ?? Object.getPrototypeOf(this)
    ).constructor as typeof EffectElement

    this[ETCODE] = etType === void 0 ? 0 : etType
    this[IN_ETCODE] = inEtType === void 0 ? 0 : inEtType
    this[NOT_IN_ETCODE] = notInEtType === void 0 ? 0 : notInEtType

    // 添加一个et类名（因为外部样式文件的标签选择器优先级不够, 这样可以用 et-p.et 来提高优先级 ）
    // fixed. document.createElement 时元素对象不可有属性 延迟添加;
    // 不放在connectedCallback里, 是因为其可能会被子类覆盖
    Promise.resolve().then(() => {
      if (etType & EtTypeEnum.Uneditable) {
        this.setAttribute('contenteditable', 'false')
      }
      if (etType & EtTypeEnum.Paragraph) {
        this.classList.add(CssClassEnum.ParagraphLike)
      }
      this.classList.add(CssClassEnum.Et)
    })
  }

  /**
   * // TODO 待完善\
   * 为当前效应元素添加css类名, 并自动会添加前缀: `ET_cls-` (BuiltinConfig.EDITOR_CSS_CLASS_PREFIX)
   */
  addCssClass(cls: string) {
    this.classList.add(BuiltinConfig.EDITOR_CSS_CLASS_PREFIX + cls)
  }

  /**
   * 为当前效应元素移除css类名, 并自动会添加前缀: `ET_cls-` (BuiltinConfig.EDITOR_CSS_CLASS_PREFIX)
   */
  removeCssClass(cls: string) {
    this.classList.remove(BuiltinConfig.EDITOR_CSS_CLASS_PREFIX + cls)
  }

  hasCssClass(cls: string) {
    return this.classList.contains(BuiltinConfig.EDITOR_CSS_CLASS_PREFIX + cls)
  }

  /**
   * 当前效应元素下是否允许某效应, 即该元素的子节点是否允许为含有某效应类型的节点 \
   * * 当且仅当 `inEtCode & code && !(notInEtCode & code)` 时返回 true
   * @param codeOrNode 要校验的子节点效应码, 若为 0, 则视为不允许
   */
  checkIn(codeOrNode: number | Node) {
    const code = typeof codeOrNode === 'number' ? codeOrNode : codeOrNode.etCode
    // 默认允许一切非效应元素, 子类可重写该方法, 即过滤一些不接受的 html 节点
    if (code === void 0) {
      return true
    }
    if (this.notInEtCode & code) {
      return false
    }
    if (this.inEtCode & code) {
      return true
    }
    return false
  }

  /* -------------------------------------------------------------------------- */
  /*                                 dom methods                                */
  /* -------------------------------------------------------------------------- */
  /** 当前效应元素内容是否视为空; 默认 textContent == '' 或仅含零宽字符或换行符 时视为空 */
  isEmpty() {
    const data = this.textContent
    return data === '' || (
      data.length <= 2 && (
        data === HtmlCharEnum.ZERO_WIDTH_SPACE
        || data === HtmlCharEnum.MOCK_LINE_BREAK
        || data === '\n'
      )
    )
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
   * 重写时, 可使用工具函数`mergeHtmlNode`来以默认合并逻辑合并`this.lastChild`和`el.firstChild`;\
   * *`mergeHtmlNode`, 不可用于合并this和el, 否则进入死循环*
   * * 该方法(钩子)只可用于合并克隆片段内的节点
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

  /**
   * 光标落入其中时调用, 这与 focusin 事件无关, 也不是冒泡的;\
   * 当当前效应元素被设置为 `ctx.focusEtElement/paragraph/topElement` 时会调用此回调
   */
  focusinCallback(_ctx: Et.EditorContext) {
    this.classList.add(CssClassEnum.Active)
  }

  /**
   * 光标移出其中时调用, 这与 focusout 事件无关, 也不是冒泡的;\
   * 当当前效应元素从 `ctx.focusEtElement/paragraph/topElement` 移除时会调用此回调
   */
  focusoutCallback(_ctx: Et.EditorContext) {
    this.classList.remove(CssClassEnum.Active)
  }

  /* -------------------------------------------------------------------------- */
  /*                                    html                                    */
  /* -------------------------------------------------------------------------- */

  /**
   * 定义该效应元素可以从哪些原生 html 元素转化而来\
   * 处理粘贴的 html 内容时, 会依据效应元素类注册的顺序, 依次从此列表中获取转换器,
   * 将 html 元素转为效应元素; 若未配置或处理失败, 则将原 html 元素转为纯文本后插入
   */
  static readonly fromNativeElementTransformerMap: Et.HtmlToEtElementTransformerMap

  /**
   * 返回此效应元素对应的原生 html 元素;\
   * 该方法主要作为复制时, 将复制范围中的效应元素转为普通 html 元素,
   * 然后以 `text/html` 写入剪切板, 以兼容带样式的跨应用粘贴;
   * 子类重写时, 最好根据效应元素的定义, 使用"硬编码"的方式构建对应的 html 元素的样式,
   * 而避免直接使用 window.getComputedStyle 以在复制大量内容时获取更好的性能.\
   * // TODO 测试, 复制大量内容时, getComputedStyle是否会, 以及会如何影响性能
   * @returns
   * - `null`, 该效应元素及其后代不会被复制到 `text/html` 中
   * - `HTMLElement`, 声明该效应元素以何种形式复制到 `text/html` 中; 即该函数
   *   不处理后代, 由调用者处理后代
   * - `() => HTMLElement`, 声明以该效应元素为根的子树, 将以何种形式被
   *   复制到 `text/html` 中; 即包括后代处理
   */
  toNativeElement(this: EffectElement): null | HTMLElement | (() => HTMLElement) {
    const cssValues = window.getComputedStyle(this)
    let el
    if (['block', 'flex'].includes(cssValues.display)) {
      el = document.createElement('div')
    }
    else {
      el = document.createElement('span')
    }
    return el
  }

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
   *   并将处理得到的节点插入到该`html`节点的`childNodes`中
   * * 若注册的EtElement中有多个定义了相同节点的解析方式, 则按插件注册顺序依次处理，直到处理成功为止
   * * 接受的返回值类型: `DocumentFragment | HTMLElement | Text | null`
   * * 返回`null`说明当前效应元素不处理该`mdast节点`, 交给下一个处理器处理
   * * 返回`DocumentFragment`说明当前`mdast节点`无对应`html节点`, 直接将其子节点插入到父节点`childNodes`中,
   *   即相当于跳过当前`mdast节点`
   */
  static readonly fromMarkdownHandlerMap: Et.MdastNodeHandlerMap
  /**
   * mdast节点转换器(对节点原地修改), 当且仅当返回 true 时终止后续transformer对该节点的处理\
   * 转换器会在toMarkdown的最后阶段（序列化为字符串前）执行，对mdast树进行修改
   */
  static readonly toMarkdownTransformerMap: Et.MdastNodeTransformerMap
  /**
   * 定义自定义节点的处理逻辑，将mdast节点转为md字符串, 即toMarkdown最后阶段
   * * 该定义是唯一的, 后来的会覆盖前面定义的
   * * 自定义mdast节点
   * ```ts
   * declare module 'mdast' {
   *     interface RootContentMap {
   *         highlight: HighLight
   *     }
   *     interface Highlight extends Parent {
   *        type: 'highlight'
   *        ...
   *     }
   * }
   * class EtHighlightElement extents EtRichElement {
   *    static readonly toMarkdownHandlerMap = {
   *      highlight: (node, parent, state, info) => {
   *        return `==${state.containerPhrasing(node, info)}==`
   *      }
   *    }
   * }
   * ```
   */
  static readonly toMarkdownHandlerMap: Et.ToMarkdownHandlerMap
}

export type EffectElementCtor = typeof EffectElement
