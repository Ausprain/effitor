/* eslint-disable @stylistic/max-len */
import { BuiltinElName, CssClassEnum } from '@effitor/shared'
import type { Options as FmOptions } from 'mdast-util-from-markdown'
import type { Options as TmOptions } from 'mdast-util-to-markdown'

import type { Et } from '../@types'
import baseCss from '../assets/base.css?raw'
import builtinCss from '../assets/builtin.css?raw'
import { defaultConfig, platform } from '../config'
import { EditorContext } from '../context'
import { getMainEffector } from '../effector'
import { getBeforeinputListener } from '../effector/beforeinput'
import { getCopyListener, getCutListener, getPasteListener } from '../effector/clipboard'
import {
  getCompositionEnd,
  getCompositionStart,
  getCompositionUpdate,
} from '../effector/composition'
import { solveEffectors } from '../effector/ectx'
import { getInputListener } from '../effector/input'
import { getKeydownListener } from '../effector/keydown'
import { getKeyupListener } from '../effector/keyup'
import { getSelectionChangeListener } from '../effector/selchange'
import {
  EffectElement,
  EtBodyElement,
  EtEditorElement,
  EtParagraphElement,
} from '../element'
import { extentEtElement, registerEtElement } from '../element/register'
import { useUndoEffector } from '../handler/command/undoEffector'
import { HtmlProcessor } from '../html/HtmlProcessor'
import { getMdProcessor, MdProcessor } from '../markdown/processor'
import { cssStyle2cssText } from '../utils'
import type { EditorMountOptions } from './config'

class EffitorNotMountedError extends Error {
  constructor() {
    super(`EffitorNotMountedError: Editor not yet mounted, mount it first.`)
  }
}

/**
 * 编辑器元信息
 */
export interface EditorMeta {
  readonly contextMeta: Readonly<Et.EditorContextMeta>
  readonly mainEffector: Readonly<Et.MainEffector>
  readonly pluginConfigs: Readonly<PluginConfigs>
  readonly cssText: string
  readonly customStyleLinks: readonly Et.CustomStyleLink[]
  readonly hotkeyOptions?: Readonly<Et.hotkey.ManagerOptions>
}

/**
 * Effitor编辑器
 */
export class Effitor {
  private __host: HTMLDivElement | undefined
  private __root: ShadowRoot | Et.EtEditorElement | undefined
  private __body: Et.EtBodyElement | undefined
  private __context: Et.EditorContext | null = null
  private __ac: AbortController | undefined

  private readonly __observerDisconnecters = new Map<symbol, (observerKey: symbol) => void>()
  private readonly __meta: Readonly<EditorMeta>

  public readonly config: Readonly<Et.EditorConfig>
  public readonly platform = platform
  public readonly isShadow: boolean
  public readonly htmlProcessor: HtmlProcessor
  public readonly mdProcessor: MdProcessor
  public readonly callbacks: Et.EditorCallbacks

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

  constructor({
    shadow = true,
    schemaInit = {},
    mainEffector = getMainEffector(),
    effectorInline = false,
    plugins = [],
    config = {},
    customStyleText = '',
    customStyleLinks = [],
    callbacks = {},
    hotkeyOptions,
  }: Et.CreateEditorOptions | Et.CreateEditorOptionsInline = {}) {
    // 若启用 ShadowDOM, 而平台环境不支持 ShadowDOM, 则强制不使用 ShadowDOM
    if (shadow) {
      shadow = !!(document.createElement('div').attachShadow({ mode: 'open' }) as Et.ShadowRoot).getSelection
    }
    this.isShadow = shadow
    this.config = { ...defaultConfig, ...config }
    // undoEffector应放在首位, 但放在其他强制pre的插件effector之后, 因此将其标记pre并放在插件列表最后
    // 目前尚未遇到插件需要在undoEffector之前执行的情况, 暂时强制放在首位
    plugins = [{ name: '__plugin_$undo', effector: useUndoEffector() }, ...plugins]
    const schema = {
      editor: EtEditorElement,
      body: EtBodyElement,
      paragraph: EtParagraphElement,
      ...schemaInit,
    } as Et.EditorSchema
    /** 初始化编辑器上下文 */
    const contextMeta = {
      editor: this,
      schema,
      assists: {},
      pctx: {},
      settings: {},
      keepDefaultModkeyMap: {},
    } as Et.EditorContextMeta
    // 记录需要注册的EtElement
    const pluginElCtors: Et.EtElementCtor[] = []
    /** 从plugins中提取出effector对应处理器 及 自定义元素类对象至elCtors */
    const pluginConfigs = reducePlugins(plugins, pluginElCtors, contextMeta, effectorInline)
    // html相关处理器
    const htmlTransformerMaps: Et.HtmlToEtElementTransformerMap[] = []
    // mdast相关处理器
    const toMdTransformerMapList: Et.MdastNodeTransformerMap[] = []
    const fromMdHandlerMapList: Et.MdastNodeHandlerMap[] = []
    const toMdHandlerMap: Et.ToMarkdownHandlerMap = {}
    // 注册EtElement 加载mdast处理器 并获取内联样式; plugin的el必须先于内置的进行处理, 否则markdown处理顺序将可能与预期不符
    const allCtorCssText = new Set([...pluginElCtors, ...Object.values(schema)]).values().reduce<string[]>((css, ctor) => {
      if (!ctor) {
        return css
      }
      registerEtElement(ctor)
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

      css.push(
        ctor.cssStyle === undefined
          ? ctor.cssText
          : ctor.cssText + '\n' + cssStyle2cssText(ctor.cssStyle, ctor.elName),
      )
      return css
    }, []).join('\n') + pluginConfigs.cssText + '\n' + customStyleText

    this.__meta = {
      contextMeta,
      mainEffector,
      cssText: baseCss + builtinCss + allCtorCssText,
      pluginConfigs: pluginConfigs,
      customStyleLinks: [...customStyleLinks],
      hotkeyOptions,
    }
    this.htmlProcessor = new HtmlProcessor(htmlTransformerMaps)
    this.mdProcessor = getMdProcessor({
      fromMdHandlerMapList,
      toMdTransformerMapList,
      toMdHandlerMap,
    })
    this.callbacks = callbacks
  }

  /**
   * 在一个div下加载一个编辑器  若已挂载 则抛出一个异常; 除非配置了 `ALLOW_MOUNT_WHILE_MOUNTED: true`
   * @param host 编辑器宿主, 一个 div 元素
   * @param scrollContainer 滚动容器, 默认是 html 根元素, 若host 在另一个滚动容器里, 则必须配置此项
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
    const { contextMeta, mainEffector, cssText, pluginConfigs, hotkeyOptions } = this.__meta
    const ac = new AbortController()
    const [root, bodyEl] = formatEffitorStructure(host, this, cssText, customStyleLinks, ac.signal)
    const context = new EditorContext({
      contextMeta,
      root,
      bodyEl,
      locale,
      scrollContainer,
      hotkeyOptions,
      onEffectElementChanged: this.callbacks.onEffectElementChanged,
      onParagraphChanged: this.callbacks.onParagraphChanged,
      onTopElementChanged: this.callbacks.onTopElementChanged,
    })

    // 使用 shadowRoot 时, 必须向 EtSelection 提供获取 shadowRoot 内选区的方法
    if (this.isShadow) {
      context.selection.setSelectionGetter(root as Et.ShadowRoot)
    }

    /** 编辑器事件监听器 */
    const listeners = initListeners(context, mainEffector, pluginConfigs)
    addListenersToEditorBody(bodyEl, ac, context, listeners, pluginConfigs.htmlEventSolver)

    this.__ac = ac
    this.__root = root
    this.__host = host
    this.__body = bodyEl
    this.__context = context

    // 配置了自动创建首段落
    if (this.config.AUTO_CREATE_FIRST_PARAGRAPH) {
      this.initBody(undefined, true)
    }

    for (const onMounted of pluginConfigs.onMounteds) {
      onMounted(context, ac.signal)
    }
    return this
  }

  /**
   * 卸载编辑器 div宿主内容清空  若未挂载, 则不做任何操作
   */
  unmount() {
    if (!this.__host) return
    for (const onBeforeUnmount of this.__meta.pluginConfigs.onBeforeUnmounts) {
      onBeforeUnmount(this.context)
    }

    // abort signal自动清除绑定的监听器
    this.__ac?.abort()
    this.__host.innerHTML = ''
    this.__host = undefined
    this.__context = null
    this.cancelObserve()
  }

  changeLocale(locale: string) {
    this.context.segmenter.setLocale(locale)
  }

  /** 光标聚焦到编辑器末尾 */
  focus() {
    const ctx = this.context
    const restoreCaretRange = ctx.selection.getCaretRange()
    this.bodyEl.focus()
    ctx.isFocused = true
    const r = restoreCaretRange.toRange()
    if (r) {
      ctx.selection.selectRange(r)
    }
    else {
      // 没有先前位置, 定位到末尾
      // ctx.selection.modify('move', 'forward', 'documentboundary')
      const lastParagraph = ctx.body.lastParagraph
      if (lastParagraph) {
        ctx.setSelection(lastParagraph.innerEndEditingBoundary())
      }
    }
  }

  /** 让编辑器失去焦点 */
  blur() {
    const ctx = this.context
    ctx.selection.getCaretRange()
    // 先标记编辑器失去焦点 再调用blur方法, 因为 `.blur() -> focusout事件监听器执行` 是同步的
    ctx.isFocused = false
    this.__body?.blur()
    // blur后要移除选区
    ctx.selection.selection?.removeAllRanges()
  }

  /**
   * 导出`<et-body>`的outerHTML
   */
  toEtHTML() {
    if (!this.__root) {
      throw new EffitorNotMountedError()
    }
    return this.__root.querySelector(BuiltinElName.ET_BODY)?.outerHTML ?? null
  }

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
  fromEtHTML(html: string) {
    if (!this.__root) {
      throw new EffitorNotMountedError()
    }
    const df = this.context.createFragment(html)
    if (df.childElementCount !== 1 || df.firstChild?.nodeName !== BuiltinElName.ET_BODY.toUpperCase()) {
      throw new Error('Invalid html for Effitor')
    }
    for (const p of df.firstChild.childNodes) {
      if (p.nodeName !== BuiltinElName.ET_PARAGRAPH.toUpperCase()) {
        throw new Error('Invalid html for Effitor')
      }
    }
    const body = this.__root.querySelector(BuiltinElName.ET_BODY)
    if (body) {
      this.__root.replaceChild(df, body)
    }
  }

  /**
   * 将指定效应元素转为markdown文本
   */
  toMarkdown(el: Et.EtElement, options?: TmOptions): string
  /**
   * 将编辑区内容输出为markdown文本
   */
  toMarkdown(options?: TmOptions): string
  toMarkdown(elOrOptions?: Et.EtElement | TmOptions, options?: TmOptions) {
    if (elOrOptions instanceof EffectElement) {
      return this.mdProcessor.toMarkdown(this.context, (elOrOptions as EffectElement), options)
    }
    return this.mdProcessor.toMarkdown(this.context, this.bodyEl, (elOrOptions as TmOptions))
  }

  /**
   * 解析markdown文本, 返回一个DocumentFragment
   */
  fromMarkdown(mdText: string, parseOnly: true, options?: FmOptions): DocumentFragment
  /**
   * 解析markdown文本并覆盖编辑区内容
   */
  fromMarkdown(mdText: string, parseOnly: false, options?: FmOptions): void
  fromMarkdown(mdText: string, parseOnly: boolean, options?: FmOptions): DocumentFragment | void {
    if (parseOnly) {
      return this.mdProcessor.fromMarkdown(this.context, mdText, options)
    }
    const ctx = this.context
    ctx.getEtHandler(ctx.bodyEl).UpdateEditorContentsFromMarkdown?.(ctx, {
      mdText,
      mdOptions: options,
    })
  }

  /**
   * 初始化编辑区(插入第一个段落), 若已有段落, 则什么也不做
   * 可用于配置 `AUTO_CREATE_FIRST_PARAGRAPH = false` 时手动创建第一个段落
   * @param create 首段落创建函数, 若没有则查询 `callbacks?.firstInsertedParagraph` 仍没有则使用ctx默认段落创建函数
   */
  initBody(create?: Et.ParagraphCreator, isFirstInit = true) {
    const ctx = this.context
    ctx.getEtHandler(ctx.bodyEl).InitEditorContents?.(ctx, {
      create,
      isFirstInit,
    })
  }

  /**
   * 观察编辑区body变化
   * @param options 默认只监听文本和子节点的变化
   * @returns 终止观察(终止前会自动完成所有pending的变化)
   */
  observeBody(fn: MutationCallback, options?: MutationObserverInit) {
    if (!this.__body) {
      throw new EffitorNotMountedError()
    }
    const ob = new MutationObserver(fn)
    ob.observe(this.__body, options)
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
  observeEditing<ParagraphType extends HTMLElement = HTMLElement>({
    onTextUpdated,
    onParagraphAdded,
    onParagraphRemoved,
    onParagraphUpdated,
  }: ObserveEditingInit<ParagraphType>) {
    const body = this.bodyEl
    const ctx = this.context
    // TODO 使用2个观察者,分别观察body子节点列表 和深度观察后代节点文本变化
    // 与直接用一个深度观察者观察所有相比, 哪个性能更好 ?

    const fb: MutationCallback = (mrs) => {
      for (const mr of mrs) {
        switch (mr.type) {
          case 'characterData':
            if (onTextUpdated) {
              onTextUpdated(ctx, mr.target as Text, ctx.focusTopElement as unknown as ParagraphType)
            }
            break
          case 'childList':
            if (mr.target === this.__body) {
              if (onParagraphAdded && mr.addedNodes.length) {
                onParagraphAdded(ctx, mr.addedNodes as NodeListOf<ParagraphType>, mr.previousSibling as ParagraphType, mr.nextSibling as ParagraphType)
              }
              if (onParagraphRemoved && mr.removedNodes.length) {
                onParagraphRemoved(ctx, mr.removedNodes as NodeListOf<ParagraphType>, mr.previousSibling as ParagraphType, mr.nextSibling as ParagraphType)
              }
            }
            else if (onParagraphUpdated) {
              onParagraphUpdated(ctx, ctx.focusTopElement as unknown as ParagraphType, mr.target as HTMLElement)
            }
            break
          default:
            break
        }
      }
    }
    const ob = new MutationObserver(fb)
    ob.observe(body, {
      characterData: true,
      childList: true,
      subtree: true,
    })
    const key = Symbol()
    this.__observerDisconnecters.set(key, (key: symbol) => {
      const rs = ob.takeRecords()
      if (rs.length) {
        fb(rs, ob)
      }
      ob.disconnect()
      this.__observerDisconnecters.delete(key)
    })

    return key
  }

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
}

interface ObserveEditingInit<ParagraphType extends Node = Node> {
  /**
   * 编辑区内部文本变化
   * @param ctx 编辑器上下文对象
   * @param text 文本变化了的Text节点
   */
  onTextUpdated?: (ctx: Et.EditorContext, text: Text, paragraph: ParagraphType) => void
  /**
   * 编辑区顶层节点(“段落”)新增
   */
  onParagraphAdded?: (ctx: Et.EditorContext, addedNodes: NodeListOf<ParagraphType>, prevSibling: ParagraphType | null, nextSibling: ParagraphType | null) => void
  /**
   * 编辑区顶层节点(“段落”)删除
   */
  onParagraphRemoved?: (ctx: Et.EditorContext, removedNodes: NodeListOf<ParagraphType>, prevSibling: ParagraphType | null, nextSibling: ParagraphType | null) => void
  /**
   * 编辑器顶层节点(“段落”)更新
   */
  onParagraphUpdated?: (ctx: Et.EditorContext, paragraph: ParagraphType, target: HTMLElement) => void
}

/** 格式化容器div为Effitor初始化结构 */
const formatEffitorStructure = (
  host: HTMLDivElement, editor: Et.Editor,
  cssText: string, customStyleLinks: readonly Et.CustomStyleLink[], signal: AbortSignal,
) => {
  const editorEl = document.createElement(BuiltinElName.ET_EDITOR)
  const body = document.createElement(BuiltinElName.ET_BODY)

  let root: Et.EditorRoot
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(cssText)

  if (editor.isShadow) {
    // 在editor下创建一个shadowRoot
    root = editorEl.attachShadow({ mode: 'open' }) as Et.ShadowRoot
    root.adoptedStyleSheets = [sheet]
  }
  else {
    root = editorEl
    document.adoptedStyleSheets = [sheet]
  }

  // 链接自定义样式文件
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
    root.append(linkEl)
  }

  // 清空el并挂载editor
  host.innerHTML = ''
  host.append(editorEl)
  host.classList.add(CssClassEnum.Effitor)
  if (editor.config.WITH_EDITOR_DEFAULT_STYLE) {
    editorEl.classList.add(CssClassEnum.DefaultStyle)
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
  return [root, body] as const
}

type PluginConfigs = Omit<Et.Effector, 'inline' | 'enforce' | 'onMounted' | 'onBeforeUnmount'> & {
  cssText: string
  onMounteds: Required<Et.Effector>['onMounted'][]
  onBeforeUnmounts: Required<Et.Effector>['onBeforeUnmount'][]
}
const reducePlugins = (
  plugins: Et.EditorPlugin[], elCtors: Et.EtElementCtor[], ctx: Et.EditorContextMeta, inline = false,
): PluginConfigs => {
  const pNameSet = new Set<Et.EditorPlugin['name']>()
  const effectors = [],
    preEffectors = [],
    postEffectors = [],
    onMounteds = [],
    onBeforeUnmounts = [],
    cssTexts = []
  const setSchema: Et.EditorSchemaSetter = (init) => {
    Object.assign(
      ctx.schema,
      Object.fromEntries(Object.entries(init).filter(([, v]) => v !== void 0)),
    )
  }
  for (const cur of plugins) {
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
      const { onMounted, onBeforeUnmount, ...solvers } = et
      if (onMounted) {
        onMounteds.push(onMounted)
      }
      if (onBeforeUnmount) {
        onBeforeUnmounts.push(onBeforeUnmount)
      }
      if (et.enforce === void 0) {
        effectors.push(solvers)
      }
      else if (et.enforce === 'pre') {
        preEffectors.push(solvers)
      }
      else {
        postEffectors.push(solvers)
      }
    }
    cur.registry?.(ctx, setSchema, extentEtElement)
  }
  const pluginEffector = inline
    ? solveEffectors(
        [...preEffectors, ...effectors, ...postEffectors], true,
      )
    : solveEffectors([...preEffectors, ...effectors, ...postEffectors], false)
  return {
    cssText: cssTexts.join('\n'),
    onMounteds,
    onBeforeUnmounts,
    ...pluginEffector,
  }
}
const initListeners = (
  ctx: Et.EditorContext, mainEffector: Et.MainEffector, pluginEffector: PluginConfigs,
) => ({
  // ): { [k in keyof Et.HTMLElementEventMap]?: (ev: Et.HTMLElementEventMap[k]) => void } => ({

  keydown: getKeydownListener(ctx, mainEffector.keydownSolver, pluginEffector.keydownSolver),
  keyup: getKeyupListener(ctx, mainEffector.keyupSolver, pluginEffector.keyupSolver),
  beforeinput: getBeforeinputListener(ctx, mainEffector.beforeInputSolver, pluginEffector.beforeInputSolver),
  input: getInputListener(ctx, mainEffector.afterInputSolver, pluginEffector.afterInputSolver), // ? GlobalEventHandlersEventMap为什么input事件对象是Event而非InputEvent
  compositionstart: getCompositionStart(ctx),
  compositionupdate: getCompositionUpdate(ctx),
  compositionend: getCompositionEnd(ctx),

  copy: getCopyListener(ctx, pluginEffector.copyCallback),
  cut: getCutListener(ctx, pluginEffector.copyCallback),
  paste: getPasteListener(ctx, pluginEffector.pasteCallback),

  // mousedown: getMouseDownListener(ctx),
  // mouseup: getMouseUpListener(ctx),
  // click: getClickListener(ctx),
  // dblclick: getDblClickListener(ctx),

  // dragstart: getDragStartListener(ctx),
  // drag: getDragListener(ctx),
  // dragend: getDragEndListener(ctx),
  // dragenter: getDragEnterListener(ctx),
  // dragover: getDragOverListener(ctx),
  // dragleave: getDragLeaveListener(ctx),
  // drop: getDropListener(ctx),

  selectionchange: getSelectionChangeListener(ctx, pluginEffector.selChangeCallback),

  focusin: (ev: FocusEvent) => pluginEffector.focusinCallback?.(ev, ctx),
  focusout: (ev: FocusEvent) => pluginEffector.focusoutCallback?.(ev, ctx),
})
const addListenersToEditorBody = (
  // root: Et.ShadowRoot,
  body: Et.EtBodyElement,
  ac: AbortController,
  ctx: Et.EditorContext,
  listeners: ReturnType<typeof initListeners>,
  htmlEventSolver?: Et.HTMLEventSolver,
) => {
  // 先为插件绑定其他监听器, 这样通过e.stopImmediatePropagation()可以阻止effitor相关事件的默认行为触发
  if (htmlEventSolver) {
    for (const [name, fn] of Object.entries(htmlEventSolver)) {
      // @ts-expect-error name 是一个 string, 无法准确提取出 e 的类型
      body.addEventListener(name, e => fn(e, ctx), { signal: ac.signal })
    }
  }

  // 绑在shadowRoot上
  body.addEventListener('focusin', (ev) => {
    // import.meta.env.DEV && console.error('body focus')
    // body无段落, 清空并初始化
    if (body.childElementCount === 0) {
      ctx.editor.initBody(void 0, false)
    }
    // 仅当焦点从编辑区外部移入时, 才执行相应逻辑; 因为编辑区内嵌套 contenteditable之间切换时也会触发 focusin/out
    if (!ev.relatedTarget || !ctx.body.isNodeInBody(ev.relatedTarget as Node)) {
      // 编辑器聚焦时绑定上下文
      ctx.isFocused = true
      // fixed. HMR热更新时 旧的selection对象可能丢失
      // fixed. focus瞬间 还未获取光标位置(Selection对象未更新), 使用requestAnimationFrame延迟更新上下文
      requestAnimationFrame(() => {
        // 手动更新上下文和选区, 再绑定sel监听器
        ctx.update()
        document.addEventListener('selectionchange', listeners.selectionchange, { signal: ac.signal })
        listeners.focusin(ev)
      })
    }
  }, { signal: ac.signal })
  body.addEventListener('focusout', (ev) => {
    // import.meta.env.DEV && console.error('body blur')

    // 当编辑区失去焦点, 且焦点并非落入编辑区内的嵌套 contenteditable 内时
    // 即焦点转移到编辑区(et-body)外 时
    if (!ev.relatedTarget || !ctx.body.isNodeInBody(ev.relatedTarget as Node)) {
      // 编辑器失去焦点时, 结束命令事务
      listeners.focusout(ev)
      // 解绑selectionchange
      document.removeEventListener('selectionchange', listeners.selectionchange)
      // 执行focusout回调, 先执行段落的
      requestAnimationFrame(() => {
        ctx.blurCallback()
      })
    }
  }, { signal: ac.signal })

  body.addEventListener('keydown', listeners.keydown, { signal: ac.signal })
  body.addEventListener('keyup', listeners.keyup, { signal: ac.signal })
  // *wran. shadow dom内不会捕获isTrusted=true 的 inputType='insertFromDrop' 的 beforeinput事件
  body.addEventListener('beforeinput', listeners.beforeinput, { signal: ac.signal })
  body.addEventListener('input', listeners.input, { signal: ac.signal })

  body.addEventListener('compositionstart', listeners.compositionstart, { signal: ac.signal })
  body.addEventListener('compositionupdate', listeners.compositionupdate, { signal: ac.signal })
  body.addEventListener('compositionend', listeners.compositionend, { signal: ac.signal })

  body.addEventListener('copy', listeners.copy, { signal: ac.signal })
  body.addEventListener('cut', listeners.cut, { signal: ac.signal })
  body.addEventListener('paste', listeners.paste, { signal: ac.signal })

  // body.addEventListener('mousedown', listeners.mousedown, { signal: ac.signal })
  // body.addEventListener('mouseup', listeners.mouseup, { signal: ac.signal })
  // body.addEventListener('click', listeners.click, { signal: ac.signal })
  // body.addEventListener('dblclick', listeners.dblclick, { signal: ac.signal })

  // body.addEventListener('dragstart', listeners.dragstart, { signal: ac.signal })
  // body.addEventListener('drag', listeners.drag, { signal: ac.signal })
  // body.addEventListener('dragend', listeners.dragend, { signal: ac.signal })
  // body.addEventListener('dragenter', listeners.dragenter, { signal: ac.signal })
  // body.addEventListener('dragover', listeners.dragover, { signal: ac.signal })
  // body.addEventListener('dragleave', listeners.dragleave, { signal: ac.signal })
  // body.addEventListener('drop', listeners.drop, { signal: ac.signal })
}
