import { BuiltinConfig, BuiltinElName, CssClassEnum } from '@effitor/shared'
import type { Options as FmOptions } from 'mdast-util-from-markdown'
import type { Options as TmOptions } from 'mdast-util-to-markdown'

import type { Et } from '../@types'
import baseCss from '../assets/base.css?raw'
import builtinCss from '../assets/builtin.css?raw'
import { defaultConfig, platform } from '../config'
import { EditorContext } from '../context'
import { type CreateEditorContextOptionsFields } from '../context/EditorContext'
import { getMainEffector } from '../effector'
import { solveEffectors } from '../effector/ectx'
import {
  EtBodyElement,
  EtEditorElement,
  EtParagraphElement,
} from '../element'
import { mountEtHandler, registerEtElement } from '../element/register'
import { HtmlProcessor } from '../html/HtmlProcessor'
import { getMdProcessor, type MdProcessor } from '../markdown/processor'
import { useUndo } from '../plugins'
import { dom } from '../utils'
import type { EditorMountOptions } from './config'
import { ConfigManager } from './ConfigManager'
import { addListenersToEditorBody, initListeners } from './listeners'

class EffitorNotMountedError extends Error {
  constructor() {
    super(`EffitorNotMountedError: Editor not yet mounted, mount it first.`)
  }
}

/**
 * 编辑器元数据
 */
interface EditorMeta extends CreateEditorContextOptionsFields {
  readonly mainEffector: Readonly<Et.MainEffector>
  readonly pluginConfigs: Readonly<PluginConfigs>
  readonly cssText: string
  readonly customStyleLinks: readonly Et.CustomStyleLink[]
}
export type PluginConfigs = Omit<Et.Effector, 'enforce'> & {
  cssText: string
}
const reducePlugins = (
  assists: Et.EditorPlugin[],
  plugins: Et.EditorPlugin[], elCtors: Et.EtElementCtor[], ctx: Et.EditorContextMeta,
): PluginConfigs => {
  const pNameSet = new Set<Et.EditorPlugin['name']>()
  const effectors: Et.Effector[] = [],
    preEffectors: Et.Effector[] = [],
    postEffectors: Et.Effector[] = [],
    cssTexts: string[] = []
  const setSchema: Et.EditorSchemaSetter = (init) => {
    Object.assign(
      ctx.schema,
      Object.fromEntries(Object.entries(init).filter(([, v]) => v !== void 0)),
    )
  }
  function solvePlugins(ps: Et.EditorPlugin[]) {
    for (const cur of ps) {
      if (pNameSet.has(cur.name)) {
        throw Error(`Duplicate plug-in named '${cur.name}'.`)
      }
      pNameSet.add(cur.name)
      if (cur.cssText) {
        cssTexts.push(cur.cssText)
      }
      if (cur.elements) {
        cur.elements.forEach(e => elCtors.push(e))
      }
      const ets = Array.isArray(cur.effector) ? cur.effector : [cur.effector]
      for (const et of ets) {
        if (et.enforce === void 0) {
          effectors.push(et)
        }
        else if (et.enforce === 'pre') {
          preEffectors.push(et)
        }
        else {
          postEffectors.push(et)
        }
      }
      cur.register?.(ctx, setSchema, mountEtHandler)
    }
  }
  solvePlugins(assists)
  solvePlugins(plugins)
  const pluginEffector = solveEffectors([...preEffectors, ...effectors, ...postEffectors])
  return {
    cssText: cssTexts.join('\n'),
    ...pluginEffector,
  }
}

// interface ObserveEditingInit<ParagraphType extends Node = Node> {
//   /**
//    * 编辑区内部文本变化
//    * @param ctx 编辑器上下文对象
//    * @param text 文本变化了的Text节点
//    */
//   onTextUpdated?: (ctx: Et.EditorContext, text: Text, paragraph: ParagraphType) => void
//   /**
//    * 编辑区顶层节点(“段落”)新增
//    */
//   onParagraphAdded?: (ctx: Et.EditorContext, addedNodes: NodeListOf<ParagraphType>, prevSibling: ParagraphType | null, nextSibling: ParagraphType | null) => void
//   /**
//    * 编辑区顶层节点(“段落”)删除
//    */
//   onParagraphRemoved?: (ctx: Et.EditorContext, removedNodes: NodeListOf<ParagraphType>, prevSibling: ParagraphType | null, nextSibling: ParagraphType | null) => void
//   /**
//    * 编辑器顶层节点(“段落”)更新
//    */
//   onParagraphUpdated?: (ctx: Et.EditorContext, paragraph: ParagraphType, target: HTMLElement) => void
// }

/**
 * Effitor编辑器
 */
export class Effitor {
  private __host: HTMLDivElement | undefined
  private __root: ShadowRoot | Et.EtEditorElement | undefined
  private __editorEl: Et.EtEditorElement | undefined
  private __body: Et.EtBodyElement | undefined
  private __context: Et.EditorContext | null = null
  private __ac: AbortController | undefined
  private __scrollContainer: HTMLElement = document.documentElement
  /** 已注册样式的文档对象, 避免再次挂载时重复注册样式表 */
  private __styledDocuments = new WeakSet<Document>()

  // 只读相关
  private __readonlyObKey?: symbol
  private __readonlyEditableEls?: Map<HTMLElement, string>
  private __readonlyRawEls?: Set<Et.HTMLRawEditElement>

  private readonly __observerDisconnecters = new Map<symbol, (observerKey: symbol) => void>()
  private readonly __meta: Readonly<EditorMeta>

  public readonly status: Readonly<Et.EditorStatus>

  public readonly isShadow: boolean
  public readonly theme: string
  public readonly config: Et.EditorConfig
  public readonly platform = platform
  public readonly htmlProcessor: HtmlProcessor
  public readonly mdProcessor: MdProcessor
  public readonly callbacks: Readonly<Et.EditorCallbacks>
  /**
   * 编辑器配置管理器, 可由构造函数参数提供; 用于自定义编辑器配置持久化, 如快捷键等
   */
  public readonly configManager: ConfigManager

  private _isFocused = false
  /** 焦点是否在编辑区内 */
  get isFocused() {
    return this._isFocused
  }

  get isMounted() {
    return this.__host !== undefined
  }

  /**
   * 编辑器宿主 div元素
   */
  get host() {
    if (!this.__host) {
      throw new EffitorNotMountedError()
    }
    return this.__host
  }

  /**
   * 编辑器根节点
   */
  get root() {
    if (!this.__root) {
      throw new EffitorNotMountedError()
    }
    return this.__root
  }

  /**
   * 编辑器上下文对象
   */
  get context() {
    if (!this.__context) {
      throw new EffitorNotMountedError()
    }
    return this.__context
  }

  get bodyEl() {
    if (!this.__body) {
      throw new EffitorNotMountedError()
    }
    return this.__body
  }

  get editorEl() {
    if (!this.__editorEl) {
      throw new EffitorNotMountedError()
    }
    return this.__editorEl
  }

  /**
   * 编辑器所在滚动容器`document.documentElement`
   * * [NB]: 该值不是`document.documentElement`时, 监听 scroll 事件的 scrollTarget 等于该值
   *         否则, scrollTarget 为 document 或 window 对象
   */
  get scrollContainer() {
    return this.__scrollContainer
  }

  /**
   * 用于监听scroll事件的滚动目标, 当 scrollContainer 为 `document.documentElement` (默认值) 时,
   * 等于 document; 否则, 等于 scrollContainer 本身
   */
  get scrollTarget() {
    return this.__scrollContainer === document.documentElement ? document : this.__scrollContainer
  }

  /**
   * 编辑器内部的样式文本(包含插件携带的样式); 在编辑器mount时, 这些样式文本会添加到文档的 adoptedStyleSheets 中;
   * 启用shadow模式时, 根节点是编辑器创建的 shadowRoot 对象, 否则是 document 对象
   */
  get cssText() {
    return this.__meta.cssText
  }

  constructor({
    shadow = false,
    theme = '',
    readonly = false,
    schemaInit = {},
    mainEffector = getMainEffector(),
    assists = [],
    plugins = [],
    config = {},
    configManager = new ConfigManager(),
    customStyleText = '',
    customStyleLinks = [],
    callbacks = {},
    hotstringOptions = undefined,
    htmlOptions = undefined,
  }: Et.CreateEditorOptions = {}) {
    // 若启用 ShadowDOM, 而平台环境不支持 ShadowDOM以及ShadowDOM内选区, 则强制不使用 ShadowDOM
    // if (shadow) {
    //   shadow = !!(document.createElement('div').attachShadow({ mode: 'open' }) as Et.ShadowRoot).getSelection
    // }
    shadow = false
    this.isShadow = shadow
    this.theme = theme
    this.configManager = configManager
    const restoreConfig = configManager.getConfig('editorConfig')
    this.config = { ...defaultConfig, ...config, ...restoreConfig }
    if (this.config.toString() !== restoreConfig?.toString()) {
      configManager.updateConfig('editorConfig', this.config)
    }

    const schema = {
      editor: EtEditorElement,
      body: EtBodyElement,
      paragraph: EtParagraphElement,
      ...schemaInit,
    } as Et.EditorSchema
    /** 初始化编辑器上下文 */
    const contextMeta: Et.EditorContextMeta = {
      editor: this,
      schema,
      assists: {} as Et.EditorAssists,
      actions: {} as Et.EditorActions,
      pctx: {} as Et.EditorPluginContext,
      keepDefaultModkeyMap: {},
    }
    // 记录需要注册的EtElement
    const pluginElCtors: Et.EtElementCtor[] = []
    // 将on回调取出，以插件形式添加
    plugins.push({
      name: '$editor-callbacks',
      effector: {
        ...(() => {
          const ons: Et.Hooks = {}, cbs: Et.EditorCallbacks = {}
          for (const key in callbacks) {
            if (key.startsWith('on')) {
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              ons[key] = callbacks[key]
            }
            else {
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              cbs[key] = callbacks[key]
            }
          }
          callbacks = cbs
          return ons
        })(),
      },
    })
    /** 从plugins中提取出effector对应处理器 及 自定义元素类对象至elCtors */
    // undoEffector应放在首位, 但放在其他强制pre的插件effector之后, 因此将其标记pre并放在插件列表最后
    // 目前尚未遇到插件需要在undoEffector之前执行的情况, 暂时强制放在首位
    const pluginConfigs = reducePlugins([useUndo(), ...assists], plugins, pluginElCtors, contextMeta)
    // html相关处理器
    const htmlTransformerMaps: Et.HtmlToEtElementTransformerMap[] = []
    // mdast相关处理器
    const toMdTransformerMapList: Et.MdastNodeTransformerMap[] = []
    const fromMdHandlerMapList: Et.MdastNodeHandlerMap[] = []
    const toMdHandlerMap: Et.ToMarkdownHandlerMap = {}
    // 注册EtElement 加载mdast处理器; plugin的元素类必须先于内置的进行处理, 否则markdown处理顺序将可能与预期不符
    const registeredCtors = new WeakSet<Et.EtElementCtor>()
    pluginElCtors.concat(Object.values(schema)).forEach((ctor) => {
      if (registeredCtors.has(ctor)) {
        return
      }
      registerEtElement(ctor)
      registeredCtors.add(ctor)
      if (ctor.fromNativeElementTransformerMap) {
        htmlTransformerMaps.push(ctor.fromNativeElementTransformerMap)
      }
      if (ctor.fromMarkdownHandlerMap) {
        fromMdHandlerMapList.push(ctor.fromMarkdownHandlerMap)
      }
      if (ctor.toMarkdownTransformerMap) {
        toMdTransformerMapList.push(ctor.toMarkdownTransformerMap)
      }
      Object.assign(toMdHandlerMap, ctor.toMarkdownHandlerMap)
    })

    this.status = {
      readonly,
      isDark: false,
    }
    this.__meta = {
      contextMeta,
      mainEffector,
      cssText: baseCss + builtinCss + pluginConfigs.cssText + customStyleText,
      pluginConfigs,
      customStyleLinks,
      hotstringOptions,
    }
    this.htmlProcessor = new HtmlProcessor(htmlTransformerMaps, htmlOptions)
    this.mdProcessor = getMdProcessor({
      fromMdHandlerMapList,
      toMdTransformerMapList,
      toMdHandlerMap,
    })
    this.callbacks = Object.assign(
      Object.fromEntries(Object.entries(pluginConfigs).filter(([k]) => k.startsWith('on'))),
      callbacks,
    )
  }

  /**
   * 在一个div下加载一个编辑器  若已挂载 则抛出一个异常; 除非配置了 `ALLOW_MOUNT_WHILE_MOUNTED: true`
   * @param host 编辑器宿主, 一个 div 元素
   * @param scrollContainer 滚动容器, 默认是 html 根元素, 若编辑器 mount 在另一个滚动容器内部,
   *                        则必须配置此项, 否则一些插件无法正确工作
   * @param locale 编辑器语言, 默认是平台语言
   * @param customStyleLinks 自定义样式链接, 默认是配置中的样式链接; 该值会覆盖配置中的样式链接
   */
  mount(host: HTMLDivElement, {
    scrollContainer,
    locale = this.platform.locale,
    customStyleLinks = [...this.__meta.customStyleLinks],
  }: EditorMountOptions = {}) {
    if (this.__host) {
      if (this.config.ALLOW_MOUNT_WHILE_MOUNTED) {
        this.unmount()
      }
      else {
        throw Error('Editor already mounted')
      }
    }
    if (scrollContainer) {
      this.__scrollContainer = scrollContainer
    }
    const { contextMeta, mainEffector, pluginConfigs, hotstringOptions } = this.__meta
    const ac = new AbortController()
    const [root, bodyEl, editorEl] = this.#formatEffitorStructure(host, customStyleLinks, ac.signal)
    const context = new EditorContext({
      contextMeta,
      root,
      bodyEl,
      locale,
      hotstringOptions,
      onEffectElementChanged: this.callbacks.onEffectElementChanged,
      onParagraphChanged: this.callbacks.onParagraphChanged,
      onTopElementChanged: this.callbacks.onTopElementChanged,
    })

    this.__ac = ac
    this.__root = root
    this.__host = host
    this.__editorEl = editorEl
    this.__body = bodyEl
    this.__context = context

    if (this.config.USE_HOST_AS_SCROLL_CONTAINER) {
      this.__scrollContainer = host
    }

    // 使用 shadowRoot 时, 必须向 EtSelection 提供获取 shadowRoot 内选区的方法
    if (this.isShadow) {
      context.selection.setSelectionGetter(root as Et.ShadowRoot)
    }
    if (this.status.readonly) {
      this.setReadonly(true)
    }

    /** 编辑器事件监听器 */
    const listeners = initListeners(context, mainEffector, pluginConfigs)
    addListenersToEditorBody(bodyEl, ac, context, listeners, pluginConfigs.htmlEventSolver)

    // 配置了自动创建首段落
    if (this.config.AUTO_CREATE_FIRST_PARAGRAPH) {
      this.initBody(undefined, true)
    }
    this.callbacks.onMounted?.(this.context, ac.signal)
    return this
  }

  /**
   * 卸载编辑器 div宿主内容清空  若未挂载, 则不做任何操作
   */
  unmount() {
    if (!this.__host) return
    this.callbacks.onBeforeUnmount?.(this.context)

    // abort signal自动清除绑定的监听器
    this.__ac?.abort()
    this.__host.innerHTML = ''
    this.__host = undefined
    this.__context = null
    this.cancelObserve()
  }

  /**
   * 设置编辑器的颜色方案
   * @param isDark 是否为深色模式
   */
  setColorScheme(isDark: boolean) {
    const root = this.isShadow ? (this.__root as ShadowRoot).host : (this.__root as HTMLElement)
    if (!root || root.classList.contains(CssClassEnum.DarkMode) === isDark) {
      return
    }
    if (isDark) {
      root.classList.add(CssClassEnum.DarkMode)
    }
    else {
      root.classList.remove(CssClassEnum.DarkMode)
    }
    Object.assign(this.status, { isDark })
    this.callbacks.onDarkModeChanged?.(this.context, isDark)
  }

  setLocale(locale: string) {
    this.context.segmenter.setLocale(locale)
  }

  setReadonly(readonly: boolean) {
    if (readonly) {
      this.bodyEl.removeAttribute('contenteditable')
      this.context.isolateSelection(true)
      this.#setReadonly()
    }
    else {
      this.bodyEl.setAttribute('contenteditable', '')
      this.context.isolateSelection(false)
      this.#cancelReadonly()
    }
    Object.assign(this.status, { readonly })
  }

  #setReadonly() {
    const els = this.__readonlyEditableEls = new Map()
    const rawEls = this.__readonlyRawEls = new Set()
    this.__readonlyObKey = this.observeEditor((ms) => {
      for (const rcd of ms) {
        if (rcd.type === 'attributes') {
          const el = rcd.target as HTMLElement
          const val = el.contentEditable
          if (val !== 'false') {
            els.set(el, val)
            el.contentEditable = 'false'
          }
          return
        }
        for (const node of rcd.addedNodes) {
          if (dom.isRawEditElement(node)) {
            rawEls.add(node)
          }
        }
        for (const node of (rcd.removedNodes as NodeListOf<HTMLElement>)) {
          const val = node.contentEditable
          if (val !== void 0) {
            node.contentEditable = val
            els.delete(node)
          }
        }
      }
    }, {
      childList: true,
      attributes: true,
      attributeFilter: ['contenteditable'],
      subtree: true,
    }, 'root')
  }

  #cancelReadonly() {
    if (this.__readonlyObKey) {
      this.cancelObserve(this.__readonlyObKey)
      this.__readonlyObKey = void 0
    }
    this.__readonlyEditableEls = void 0
    this.__readonlyRawEls = void 0
  }

  /**
   * 让编辑区获取焦点, 若没有记录的光标位置, 则光标聚焦到编辑器末尾
   */
  focus(options?: FocusOptions) {
    if (this._isFocused) {
      return
    }
    this._markFocused()
    const ctx = this.context
    this.bodyEl.focus(options)
    if (ctx.selection.restore()) {
      ctx.forceUpdate()
    }
    else {
      // 恢复选区失败, 定位到末尾
      const lastParagraph = ctx.body.lastParagraph
      if (lastParagraph) {
        ctx.setSelection(lastParagraph.innerEndEditingBoundary())
      }
    }
  }

  /**
   * @internal
   * 标记编辑器获得焦点, 仅内部使用
   */
  private _markFocused() {
    this._isFocused = true
  }

  /**
   * @internal
   * 标记编辑器失去焦点, 仅内部使用
   */
  private _markBlurred() {
    this._isFocused = false
  }

  /**
   * 让编辑器失去焦点
   */
  blur() {
    // 先标记编辑器失去焦点 再调用blur方法, 因为 `.blur() -> focusout事件监听器执行` 是同步的
    this._markBlurred()
    this.__body?.blur()
  }

  /**
   * 导出`<et-body>`的outerHTML
   */
  // toEtHTML() {
  //   if (!this.__root) {
  //     throw new EffitorNotMountedError()
  //   }
  //   return this.__root.querySelector(BuiltinElName.ET_BODY)?.outerHTML ?? null
  // }

  /**
   * 导入html为`<et-body>` 若非以下格式将报错
   * ```html
   * <et-body>
   *  <et-p>...</et-p>
   *  ...
   *  <et-p>...</et-p>
   * </et-body>
   * ```
   */
  // fromEtHTML(html: string) {
  //   if (!this.__root) {
  //     throw new EffitorNotMountedError()
  //   }
  //   const df = this.context.createFragment(html)
  //   if (df.childElementCount !== 1 || df.firstChild?.nodeName !== BuiltinElName.ET_BODY.toUpperCase()) {
  //     throw new Error('Invalid html for Effitor')
  //   }
  //   for (const p of df.firstChild.childNodes) {
  //     if (p.nodeName !== BuiltinElName.ET_PARAGRAPH.toUpperCase()) {
  //       throw new Error('Invalid html for Effitor')
  //     }
  //   }
  //   const body = this.__root.querySelector(BuiltinElName.ET_BODY)
  //   if (body) {
  //     this.__root.replaceChild(df, body)
  //   }
  // }

  /**
   * 将编辑器内容输出为原生html文本;
   * @param [prefers='style'] 样式保留输出偏好, 默认为 'style'
   *   * class: 效应元素替换为原生html元素, 并将效应元素名添加到html元素classList中; 并复制效应元素的属性;
   *   * style: 效应元素替换为原生html元素, 并将效应元素样式添加到html元素style属性中; 不保留属性;
   * @param [withEditor=false] 是否包含编辑器元素, 默认为 false
   */
  toHTML(prefers: Et.ToNativeHTMLPrefers = 'style', withEditor = false) {
    const html = this.htmlProcessor.toHtml(this.context, this.bodyEl, prefers)
    if (!withEditor) {
      return html
    }
    return this.editorEl.toNativeHTML(this.context, prefers, html)
  }

  fromHTML(html: string) {
    this.context.commonHandler.updateEditorContentsFromHTML(html)
  }

  /**
   * 将编辑区内容输出为markdown文本
   */
  toMarkdown(options?: TmOptions): string {
    return this.mdProcessor.toMarkdown(this.context, this.bodyEl, options)
  }

  /**
   * 解析markdown文本并覆盖编辑区内容; 若仅解析不覆盖编辑区内容, 请使用 `Effitor.context.fromMarkdown`
   */
  fromMarkdown(mdText: string, options?: FmOptions): void {
    this.context.commonHandler.updateEditorContentsFromMarkdown(mdText, options)
  }

  /**
   * 初始化编辑区(插入第一个段落), 若已有段落, 则什么也不做
   * 可用于配置 `AUTO_CREATE_FIRST_PARAGRAPH = false` 时手动创建第一个段落
   * @param create 首段落创建函数, 若没有则查询 `callbacks?.firstInsertedParagraph` 仍没有则使用ctx默认段落创建函数
   */
  initBody(create?: Et.ParagraphCreator, isFirstInit = true) {
    return this.context.commonHandler.initEditorContents(isFirstInit, create)
  }

  clearBody() {
    return this.context.commonHandler.clearEditorContents(true)
  }

  /**
   * 观察编辑器变化，默认监听对象为编辑区 et-body 元素
   * @param options 监听选项
   * @param target 监听目标, 默认为 'body'; 当为 'root' 时监听编辑器根节点（et-editor 或 ShadowRoot）
   * @returns 本次观察的 key 值, 用于cancelObserve 关闭
   */
  observeEditor(fn: MutationCallback, options?: MutationObserverInit, target: 'body' | 'root' = 'body') {
    const targetNode = target === 'body' ? this.__body : this.root
    if (!targetNode) {
      throw new EffitorNotMountedError()
    }
    const ob = new MutationObserver(fn)
    ob.observe(targetNode, options)
    const key = Symbol()
    this.__observerDisconnecters.set(key, (key) => {
      const records = ob.takeRecords()
      if (records.length) {
        fn(records, ob)
      }
      ob.disconnect()
      this.__observerDisconnecters.delete(key)
    })
    return key
  }

  /**
   * 观察编辑行为 (深度观察文本变化/节点增删) 更细粒度的行为请使用observeBody
   * @returns 终止观察(终止前会自动完成所有pending的变化)
   */
  // observeEditing<ParagraphType extends HTMLElement = HTMLElement>({
  //   onTextUpdated,
  //   onParagraphAdded,
  //   onParagraphRemoved,
  //   onParagraphUpdated,
  // }: ObserveEditingInit<ParagraphType>) {
  //   const body = this.bodyEl
  //   const ctx = this.context
  //   // TODO 使用2个观察者,分别观察body子节点列表 和深度观察后代节点文本变化
  //   // 与直接用一个深度观察者观察所有相比, 哪个性能更好 ?

  //   const fb: MutationCallback = (mrs) => {
  //     for (const mr of mrs) {
  //       switch (mr.type) {
  //         case 'characterData':
  //           if (onTextUpdated) {
  //             onTextUpdated(ctx, mr.target as Text, ctx.focusTopElement as unknown as ParagraphType)
  //           }
  //           break
  //         case 'childList':
  //           if (mr.target === this.__body) {
  //             if (onParagraphAdded && mr.addedNodes.length) {
  //               onParagraphAdded(ctx, mr.addedNodes as NodeListOf<ParagraphType>, mr.previousSibling as ParagraphType, mr.nextSibling as ParagraphType)
  //             }
  //             if (onParagraphRemoved && mr.removedNodes.length) {
  //               onParagraphRemoved(ctx, mr.removedNodes as NodeListOf<ParagraphType>, mr.previousSibling as ParagraphType, mr.nextSibling as ParagraphType)
  //             }
  //           }
  //           else if (onParagraphUpdated) {
  //             onParagraphUpdated(ctx, ctx.focusTopElement as unknown as ParagraphType, mr.target as HTMLElement)
  //           }
  //           break
  //         default:
  //           break
  //       }
  //     }
  //   }
  //   const ob = new MutationObserver(fb)
  //   ob.observe(body, {
  //     characterData: true,
  //     childList: true,
  //     subtree: true,
  //   })
  //   const key = Symbol()
  //   this.__observerDisconnecters.set(key, (key: symbol) => {
  //     const rs = ob.takeRecords()
  //     if (rs.length) {
  //       fb(rs, ob)
  //     }
  //     ob.disconnect()
  //     this.__observerDisconnecters.delete(key)
  //   })

  //   return key
  // }

  /**
   * 取消编辑区内容修改观察
   * @param observerKey 启动观察者时返回的key, 缺省时关闭并删除所有观察者
   */
  cancelObserve(observerKey?: symbol) {
    if (observerKey) {
      this.__observerDisconnecters.get(observerKey)?.(observerKey)
    }
    else {
      this.__observerDisconnecters.entries().forEach(([key, fn]) => fn(key))
    }
    this.__observerDisconnecters.clear()
  }

  /** 格式化容器div为Effitor初始化结构 */
  #formatEffitorStructure(
    host: HTMLDivElement, customStyleLinks: readonly Et.CustomStyleLink[], signal: AbortSignal,
  ) {
    const editorEl = document.createElement(BuiltinElName.ET_EDITOR)
    const body = document.createElement(BuiltinElName.ET_BODY)

    if (!this.config.INSERT_BR_FOR_LINE_BREAK) {
      // 换行不使用<br>时, 设置pre, 以支持段落内文本换行符来换行
      body.style.whiteSpace = 'pre-wrap'
    }

    // 链接自定义样式文件
    const linkStyleCss = () => {
      for (const link of customStyleLinks) {
        const linkEl = document.createElement('link')
        // 使用preload 先加载样式, 防止内容闪烁
        linkEl.href = link.href
        linkEl.type = 'text/css'
        if (link.preload) {
          linkEl.rel = 'preload'
          linkEl.as = link.as ?? 'style'
        }
        if (link.onload) {
          linkEl.addEventListener('load', link.onload, { signal })
        }
        root.appendChild(linkEl)
      }
    }

    let root: Et.EditorRoot
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(this.__meta.cssText)

    if (this.isShadow) {
      // 在editor下创建一个shadowRoot
      root = editorEl.attachShadow({ mode: 'open' }) as Et.ShadowRoot
      root.adoptedStyleSheets = [sheet]
      linkStyleCss()
    }
    else {
      root = editorEl
      if (!this.__styledDocuments.has(document)) {
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]
        linkStyleCss()
        this.__styledDocuments.add(document)
      }
    }

    // 清空el并挂载editor
    host.innerHTML = ''
    host.append(editorEl)
    host.classList.add(CssClassEnum.Effitor)
    // host.style.position = 'relative'  // host 定位会让 dropdown 的锚点定位不基于视口判断
    if (this.theme) {
      editorEl.setAttribute(BuiltinConfig.THEME_ATTR, this.theme)
    }
    // host元素需要设置定位, 让editor内部元素能以其为offsetParent, 而不是body
    // fixed. 若为 relative, 会让内部的 anchor-position失效
    // host.style.position = 'relative'

    editorEl.append(body)
    // 使用shadow, 将editor所有内容移动到root下; 否则不显示
    if (root !== editorEl) {
      root.append(...editorEl.childNodes)
    }

    // todo 如果能处理好输入法位置的话，使用editcontext也是可以的
    // body.contentEditable = 'false'
    // body.editContext = new EditContext()
    return [root, body, editorEl] as const
  }
}
