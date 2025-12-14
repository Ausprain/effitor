import type { NodeHasParent, TupleOfLength } from '@effitor/shared'
import { CssClassEnum, EtTypeEnum, HtmlCharEnum } from '@effitor/shared'
import type { Options as FmOptions } from 'mdast-util-from-markdown'
import type { Options as TmOptions } from 'mdast-util-to-markdown'

import type { Et } from '../@types'
import { platform } from '../config'
import type { OnEffectElementChanged, OnParagraphChanged } from '../editor'
import { etcode, EtParagraph, type EtParagraphElement } from '../element'
import { CommandManager } from '../handler/command/CommandManager'
import { CommonHandler } from '../handler/CommonHandler'
import { effectInvoker } from '../handler/invoker'
import { KeepDefaultModkeyMap } from '../hotkey/builtin'
import { HotkeyManager } from '../hotkey/HotkeyManager'
import { HotstringManager } from '../hotstring/HotstringManager'
import { Segmenter } from '../intl/Segmenter'
import { cr } from '../selection'
import { EtSelection } from '../selection/EtSelection'
import { EtSelectionIsolated } from '../selection/EtSelectionIsolated'
import { traversal } from '../utils'
import { Composition } from './Composition'
import type { EditorContextMeta, EditorPluginContext } from './config'
import { EditorBody } from './EditorBody'
import { EditorLogger } from './EditorLogger'
import { EditorMode } from './EditorMode'

type PickKeyOfRange
  = | keyof AbstractRange
    | 'cloneRange'
    | 'commonAncestorContainer'
    | 'getBoundingClientRect'
    | 'getClientRects'
type ContextSelection = Readonly<Omit<EtSelection, 'range'> & {
  // 限制 range 的能力, 剔除如 extractContents 等可能会破坏 DOM 结构的方法
  range: Pick<Et.Range, PickKeyOfRange> | null
}>

type UpdatedContextSelection = ContextSelection & {
  range: Exclude<ContextSelection['range'], null>
}

/**
 * 在 keydown 事件中, 若上下文效应元素/段落为空, 则强制编辑器失去焦点;
 * 否则继续执行效应器, 效应器中的上下文的效应元素/段落必定非空
 */
export interface UpdatedContext extends EditorContext {
  readonly commonEtElement: NodeHasParent<Et.EtElement>
  readonly focusEtElement: NodeHasParent<Et.EtElement>
  readonly selection: UpdatedContextSelection
}
export interface CreateEditorContextOptionsFields {
  readonly contextMeta: Readonly<Et.EditorContextMeta>
  readonly hotstringOptions?: Et.hotstring.ManagerOptions
}
export interface CreateEditorContextOptions extends CreateEditorContextOptionsFields {
  readonly root: Et.EditorRoot
  readonly bodyEl: Et.EtBodyElement
  readonly locale?: string
  readonly onEffectElementChanged?: OnEffectElementChanged
  readonly onParagraphChanged?: OnParagraphChanged
  readonly onTopElementChanged?: OnParagraphChanged
}
/**
 * 编辑器上下文, 每一个编辑区对应一个上下文
 */
export class EditorContext implements Readonly<EditorContextMeta> {
  // 来自 meta 的属性
  readonly editor
  readonly root
  readonly schema
  readonly assists
  readonly actions
  readonly pctx: Readonly<EditorPluginContext>
  readonly keepDefaultModkeyMap: Readonly<EditorContextMeta['keepDefaultModkeyMap']>

  /** 编辑区对象 */
  readonly body: EditorBody
  /** 编辑器模式转换器 // TODO */
  readonly mode: EditorMode
  /** 编辑器选区对象, 在 mount 之前为 null */
  private _selection: ContextSelection
  private _connectedSel: EtSelection
  private _isolatedSel?: EtSelectionIsolated
  /** 文本分词器 */
  readonly segmenter: Segmenter
  /** 编辑器输入法对象 */
  readonly composition: Composition
  /** 效应激活器 */
  readonly effectInvoker: Et.EffectInvoker
  /** 命令管理器 */
  readonly commandManager: CommandManager
  /** 通用效应处理器, 不依赖效应元素激活效应(跳过effectInvoker), 直接处理指定效应 */
  readonly commonHandler: CommonHandler
  /** 热键管理器 */
  readonly hotkeyManager: Et.hotkey.Manager
  /** 热字符串管理器 */
  readonly hotstringManager: Et.hotstring.Manager

  /** 上一个`text node` 用于判断光标是否跳动 */
  private _oldNode: Et.TextOrNull = null
  private _updated = false

  private _commonEtElement: Et.EtElement | null = null
  private _focusEtElement: Et.EtElement | null = null
  private _focusParagraph: Et.Paragraph | null = null
  private _focusTopElement: Et.Paragraph | null = null

  /** 是否跳过默认 effector */
  private _skipDefault = false
  /**
   * 是否跳过下一次keydown, 在 compositionupdate 中赋值为true;
   * {@link EditorContext.nextKeydownSkipped }
   */
  private _skipNextKeydown = false
  /** 是否跳过下一次selectionchange事件 */
  private _skipSelChange = false
  /** 本次更新时，选区类型是否发生改变：Range->Caret 或 Caret->Range */
  private _selectionTypeChanged = false

  /**
   * 当前按下的按键, 在keydown结束时赋值当前按键; \
   * 在keydown事件中, 为上一个按下的按键; 可用于判断是否连续按下相同的按键
   * * 该值等于event.key
   */
  currDownKey?: string = undefined
  /**
   * 上一个抬起的按键; 用于判定双击按键 \
   * 每当按键抬起后211ms重设为undefined; 若在keydown时光标为Range状态,
   * 则设置为null, 并在keyup中为null时不记录该按键
   * * 该值等于event.key
   */
  prevUpKey?: string | null
  /**
   * 有完成InsertText的input事件，用于在selchange中判断该
   * selchange是否因用户输入（非输入法）文本而触发\
   * // TODO: 应该可用skipSelChange替代, 因为inputText之后会调用ctx.setSelection()
   */
  hasInsertText = false
  /**
   * 光标亲和性偏好, true 优先亲和到前节点末尾, false 优先亲和到后节点开头,
   * undefined 优先亲和到最近一个文本节点, 没有文本节点则定位到前者(相当于 true)\
   * 这在和平片段内容时, 决定光标落点优先在前者末尾 or 后者开头,
   * 这主要用于删除时, 区分是 Backspace 删除还是 Delete 删除, 以更精确
   * 地设置结束光标为了, 利于下一次删除动作获取对应的 TargetRange
   * * 每次 keyup 会重置为 undefined
   */
  affinityPreference?: boolean

  // 回调
  // TODO 加入 effector 中, 类似 onMounted 等
  private readonly __onEffectElementChanged?: OnEffectElementChanged
  private readonly __onParagraphChanged?: OnParagraphChanged
  private readonly __onTopElementChanged?: OnParagraphChanged

  constructor(options: CreateEditorContextOptions) {
    const contextMeta = options.contextMeta
    this.editor = contextMeta.editor
    this.schema = contextMeta.schema
    this.assists = contextMeta.assists
    this.actions = contextMeta.actions
    this.pctx = contextMeta.pctx
    this.keepDefaultModkeyMap = {
      ...contextMeta.keepDefaultModkeyMap,
      ...KeepDefaultModkeyMap,
    }

    this.root = options.root
    this.body = new EditorBody(options.bodyEl, this.editor.scrollContainer)
    this.mode = new EditorMode(this)
    this._selection = new EtSelection(this, this.body)
    this._connectedSel = this._selection as EtSelection
    this.segmenter = new Segmenter(options.locale)
    this.composition = new Composition(this, platform.isSupportInsertFromComposition)
    this.effectInvoker = effectInvoker
    this.commandManager = new CommandManager(this)
    // 只能在命令管理器创建之后创建
    this.commonHandler = new CommonHandler(this)
    this.hotkeyManager = new HotkeyManager(this)
    this.hotstringManager = new HotstringManager(this, options.hotstringOptions)

    this.__onEffectElementChanged = options.onEffectElementChanged
    this.__onParagraphChanged = options.onParagraphChanged
    this.__onTopElementChanged = options.onTopElementChanged

    if (this.editor.config.WITH_EDITOR_DEFAULT_LOGGER) {
      this.assists.logger = new EditorLogger()
    }
  }

  /**
   * 更新编辑器上下文
   */
  update() {
    const prevSelType = this._selection.type
    if (!this._selection.update()) {
      // 光标更新失败, 强制编辑器失去焦点
      this.editor.blur()
      return (this._updated = false)
    }
    // 文本节点没有变更新, 说明效应元素/段落都没变, 可结束更新
    if (this._oldNode && this._oldNode === this._selection.anchorText && this._focusEtElement?.isConnected) {
      return (this._updated = true)
    }
    this._oldNode = this._selection.anchorText

    // topElement 非空, 则 paragraph 非空, 则 etElement 非空
    if (!this._selection.commonEffectElement) {
      // 更新上下文后, commonEffectElement 必须存在, 因为光标选区必须在 et-body 内, 而 et-body 是效应元素, 即兜底的最外层 commonEffectElement
      this.assists.logger?.logError('ctx update failed: common effect element not found. ', 'EditorContext')
      this.editor.blur()
      return (this._updated = false)
    }
    this._selectionTypeChanged = prevSelType !== this._selection.type
    // 更新上下文效应元素
    // 特别的, 若 focusEtElement === focusParagraph === focusTopElement, 则
    // focusinCallback 由 focusEtElement 调用
    // focusoutCallback 由 focusTopElement 调用
    this._commonEtElement = this._selection.commonEffectElement
    this.focusEtElement = this._selection.focusEffectElement
    this.focusParagraph = this._selection.focusParagraph
    this.focusTopElement = this._selection.focusTopElement
    return (this._updated = true)
  }

  /**
   * 强制更新编辑器上下文, 并跳过下一次 selectionchange 事件的更新
   */
  forceUpdate() {
    if (this.update()) {
      return this.skipNextSelChange()
    }
    return false
  }

  /**
   * 检查当前上下文是否已更新; 已更新的上下文 effectElement/paragraphEl/topElement非空
   */
  isUpdated(this: EditorContext): this is UpdatedContext {
    return this._updated
  }

  /**
   * 编辑区元素, 等价于 ctx.body.el
   */
  get bodyEl() {
    return this.body.el
  }

  /**
   * 公共效应元素祖先; 当选区 collapsed 时, 等于 focusEtElement;
   * 否则等于 Range.commonAncestorContainer 的第一个效应元素祖先
   */
  get commonEtElement() {
    return this._commonEtElement
  }

  /**
   * 当前效应元素
   * * 若选区非collapsed, 该值与选区结束(focus)位置对齐
   */
  get focusEtElement() {
    return this._focusEtElement
  }

  private set focusEtElement(v) {
    if (this._focusEtElement === v && !this._selectionTypeChanged) return
    // fixed. 为防止focusoutCallback里用到context, 先更新this._focusEtElement, 再调用focusoutCallback;
    // 因为旧的节点直接就是回调函数的this, 可以直接拿到, 而新的节点需要ctx获得
    const old = this._focusEtElement
    this._focusEtElement = v
    if (this.__onEffectElementChanged) {
      this.__onEffectElementChanged(v, old, this)
    }
    // 旧的效应元素不是旧段落时, 调用focusoutCallback, 避免在段落更新时重复调用
    if (old) {
      old.classList.remove(CssClassEnum.CaretIn)
      if (old !== this._focusParagraph) {
        old.focusoutCallback?.(this)
      }
    }
    if (v) {
      v.classList.add(CssClassEnum.CaretIn)
      v.focusinCallback?.(this)
    }
  }

  /**
   * 当前光标所在"段落"元素, 光标只能落在"段落"里
   * * 若选区非collapsed, 该值与选区结束(focus)位置对齐
   * * **正常情况下, ctx 更新后, 当且仅当选区非collapsed时, 该值可能为 null**
   */
  get focusParagraph() {
    return this._focusParagraph
  }

  private set focusParagraph(v) {
    if (this._focusParagraph === v && !this._selectionTypeChanged) return
    const old = this._focusParagraph
    this._focusParagraph = v
    if (this.__onParagraphChanged) {
      this.__onParagraphChanged(v, old, this)
    }
    // 旧段落不是旧_topElement时, 调用focusoutCallback, 避免重复调用
    if (old && old !== this._focusTopElement) {
      old.focusoutCallback?.(this)
    }
    // 新段落不是新_focusEtElement时, 调用focusinCallback, 避免重复调用
    if (v && v !== this._focusEtElement) {
      v.focusinCallback?.(this)
    }
  }

  /**
   * 光标所在编辑区顶层元素 (即et-body的子节点), 顶层元素也是"段落"
   * * 若选区非collapsed, 该值与选区结束(focus)位置对齐
   */
  get focusTopElement() {
    return this._selection.focusTopElement
  }

  private set focusTopElement(v) {
    if (this._focusTopElement === v && !this._selectionTypeChanged) return
    const old = this._focusTopElement
    this._focusTopElement = v
    if (this.__onTopElementChanged) {
      this.__onTopElementChanged(v, old, this)
    }
    if (old && old.focusoutCallback) {
      old.focusoutCallback(this)
    }
    // 顶层节点不是当前段落时调用回调, 避免重复调用
    if (v && v !== this._focusParagraph) {
      v.focusinCallback?.(this)
    }
  }

  /**
   * @internal
   * 编辑区失去焦点时调用
   */
  private _blurCallback() {
    if (this.selIsolated) {
      return
    }
    this._updated = false
    this._oldNode = null
    this.focusEtElement = null
    this.focusParagraph = null
    this.focusTopElement = null
    this._commonEtElement = null
    this._selection.clear()
    this.commandManager.closeTransaction()
  }

  /** 编辑器选区对象, 在 mount 之前为 null */
  get selection() {
    return this._selection
  }

  /**
   * 选区是否隔离; 隔离的选区将于页面原生的 Selection 对象解绑
   */
  get selIsolated() {
    return this._selection.isolated
  }

  /**
   * 隔离选区; 隔离的选区将于页面原生的 Selection 对象解绑
   * @param enable 是否隔离选区
   */
  isolateSelection(enable: boolean) {
    if (enable === (this._selection === this._isolatedSel)) {
      return
    }
    if (enable) {
      if (!this._isolatedSel) {
        this._isolatedSel = new EtSelectionIsolated(this, this.body)
      }
      Object.assign(this._isolatedSel, this._connectedSel, { isolated: true })
      if (this._isolatedSel.range) {
        // 选择编辑区开头
        this._isolatedSel.selectCaretRange(cr.caretIn(this.bodyEl, 0))
      }
      this._selection = this._isolatedSel
    }
    else {
      Object.assign(this._connectedSel, this._isolatedSel, { isolated: false })
      this._selection = this._connectedSel
    }
    this.forceUpdate()
  }

  /**
   * 是否跳过了一次 selectionchange 事件; 该getter 只能在 selectionchange 事件中使用;
   * 调用时, 会重置为 false
   */
  get selChangeSkipped() {
    if (this._skipSelChange) {
      this._skipSelChange = false
      return true
    }
    return false
  }

  /**
   * 跳过下一次selectionchange事件
   * {@link _skipSelChange}
   */
  skipNextSelChange() {
    return (this._skipSelChange = true)
  }

  /**
   * 检查是否跳过了下一次 keydown 事件; 在 compositionupdate 中赋值为true;
   * 用于解决 MacOS 下 Safari 的 composition事件先于 keydown 触发, 从而导致
   * 每次输入法输入最后都多余的插入一个空格或执行多一次 keydown 的问题
   * * 该值只可读取一次, 读取时重置为 false
   */
  get nextKeydownSkipped() {
    if (this._skipNextKeydown) {
      this._skipNextKeydown = false
      return true
    }
    return false
  }

  /**
   * 跳过下一次keydown, 正常情况下只在 composition 事件中调用
   * {@link _skipNextKeydown}
   */
  skipNextKeydown() {
    return (this._skipNextKeydown = true)
  }

  /** 是否跳过默认 effector; 该属性读取时会重置为 false */
  get defaultSkipped() {
    if (this._skipDefault) {
      this._skipDefault = false
      return true
    }
    return false
  }

  /**
   * 跳过默认Effector, (在keydown/keyup/beforeinput/input中设置为true时,
   * 都将跳过mainEffector的对应事件监听器)
   * {@link _skipDefault}
   */
  skipDefault() {
    return (this._skipDefault = true)
  }

  /** 阻止事件默认行为, 并跳过默认effector */
  preventAndSkipDefault(ev: Event) {
    ev.preventDefault()
    return this.skipDefault()
  }

  /**
   * 设置新的光标位置并更新选区和上下文(selection和ctx)
   */
  setSelection(caretRange?: Et.CaretRange) {
    // selectRange 必然会导致selectionchagne, 进而调用ctx.forceUpdate()
    // 如若selchange加了防抖, 快速编辑情况下, 可能导致更新延误, 因此需要手动更新ctx;
    if (caretRange) {
      this._selection.selectCaretRange(caretRange)
    }
    // TODO 尝试使用 selection.collapse 来定位到空节点内部看是否有效
    if (this.editor.isShadow) {
      // fixed. shadowDOM 内使用`forceUpdate`更新选区会无法定位到空节点内部
      // 如 <et-p>aaa<et-p> 后边插入一个列表 `<et-list><et-li>|</et-li></et-list>`
      // 期望光标落于 li 内即`|`处, 但使用`forceUpdate`时, 光标会落在`<et-p>aaa|<et-p>`
      // 手动触发selectionchange事件, 以更新通过 selchange 回调来更新上下文和选区
      // this._selection.dispatchChange()
      document.dispatchEvent(new Event('selectionchange'))
      // fixed. selectionchange事件是异步的, 即时手动触发也不会立即执行, 这里需要保底更新选区
      // 因为 setSelection() 方法的语义上同步更新选区
      this._selection.update()
      return true
    }
    return this.forceUpdate()
  }

  /**
   * 设置光标定位优先倾向
   * @param toFormer `true` 优先定位到前节点末尾; `false`优先定位到后节点开头,
   *                 `undefined` 优先定位到最近一个文本节点, 无文本节点相当于`true`
   */
  setCaretAffinityPreference(toFormer?: boolean) {
    this.affinityPreference = toFormer
  }

  /**
   * 设置光标到一个段落的开头/末尾; 由于段落有多种类型(普通段落, 组件段落, Blockquote段落...),
   * 因此需要此方法来统一根据段落类型设置光标位置; 该设置光标的动作是默认异步的 (requestAnimationFrame)
   * @param [bySync=false] 是否同步设置光标位置, 默认 false(异步)
   * @returns 是否更新了上下文
   */
  setCaretToAParagraph(paragraph: Et.Paragraph, toStart: boolean, bySync = false) {
    if (etcode.check(paragraph, EtTypeEnum.Component)) {
      if (bySync) {
        paragraph.focusToInnerEditable(this, toStart)
      }
      else {
        requestAnimationFrame(() => {
          paragraph.focusToInnerEditable(this, toStart)
        })
      }
      return
    }
    if (bySync) {
      return this.setSelection(toStart
        ? paragraph.innerStartEditingBoundary().toTextAffinity()
        : paragraph.innerEndEditingBoundary().toTextAffinity())
    }
    else {
      requestAnimationFrame(() => {
        this.setSelection(toStart
          ? paragraph.innerStartEditingBoundary().toTextAffinity()
          : paragraph.innerEndEditingBoundary().toTextAffinity())
      })
    }
  }

  focusToPrevParagraph(toStart = false) {
    if (!this._focusParagraph) {
      return
    }
    let prevP = traversal.treePrevSibling(this._focusParagraph) as Et.Paragraph | null
    if (!this.isEtParagraph(prevP)) {
      prevP = this._focusTopElement?.previousSibling as Et.Paragraph | null
      if (!prevP) {
        return
      }
    }
    this.setCaretToAParagraph(prevP, toStart, true)
  }

  focusToNextParagraph(toStart = true) {
    if (!this._focusParagraph) {
      return
    }
    let nextP = traversal.treeNextSibling(this._focusParagraph) as Et.Paragraph | null
    if (!this.isEtParagraph(nextP)) {
      nextP = this._focusTopElement?.nextSibling as Et.Paragraph | null
      if (!nextP) {
        return
      }
    }
    this.setCaretToAParagraph(nextP, toStart, true)
  }

  /**
   * 检查光标是否***直接***在指定效应元素内；当且仅当选区 collapsed 且 focusEtElement 等于 el 时返回 true
   */
  isCaretIn(el: Et.EtElement) {
    return this._selection.isCollapsed && this._focusEtElement === el
  }

  isEtElement(node: Node | null): node is Et.EtElement {
    return !!node && etcode.check(node)
  }

  /**
   * 判断一个节点是否为 EtParagraph 实例, 即是否具有段落效应
   */
  isEtParagraph(node: Node | null) {
    return !!node && etcode.check(node, EtTypeEnum.Paragraph)
  }

  isEtComponent(node: Node | null) {
    return !!node && etcode.check(node, EtTypeEnum.Component)
  }

  /**
   * 判断一个节点是否为普通段落, 即当前ctx.schema.paragraph的实例
   * * 有别于 `isEtParagraph` 即 `etcode.check(node, EtTypeEnum.Paragraph)`
   *    etcode的方法用于判断节点是否为paragraph效应类型元素
   * * 而该方法用于判断一个节点是否为当前编辑器配置的paragraph段落元素本身
   */
  isPlainParagraph(node: EtParagraph | EtParagraphElement | Node | null): node is EtParagraphElement {
    return !!node && (node as HTMLElement).localName === this.schema.paragraph.elName
  }

  /**
   * 创建一个schema段落
   * @param withBr 新是否带一个 br 或零宽字符 (取决于编辑器配置 `INSERT_BR_FOR_LINE_BREAK`), 默认为 true
   */
  createPlainParagraph(withBr = true): Et.EtParagraphElement {
    const p = this.schema.paragraph.create()
    return withBr ? this.appendBrToElement(p) : p
  }

  /**
   * 创建一个带“换行符”的元素，或为一个现有元素追加一个“换行符”
   * * 根据编辑器配置： `INSERT_BR_FOR_LINE_BREAK` 决定“换行符”是 br 或零宽字符
   * @param nameOrEl 元素标签名或需要添加 br 的元素
   */
  appendBrToElement<T extends HTMLElement | string>(nameOrEl: T): T extends string
    ? T extends keyof Et.DefinedEtElementMap ? Et.DefinedEtElementMap[T]
      : T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T]
        : HTMLElement
    : T {
    let el
    if (typeof nameOrEl === 'string') {
      el = document.createElement(nameOrEl)
    }
    else {
      el = nameOrEl
    }
    if (this.editor.config.INSERT_BR_FOR_LINE_BREAK) {
      el.appendChild(document.createElement('br'))
    }
    else {
      el.appendChild(document.createTextNode(HtmlCharEnum.ZERO_WIDTH_SPACE))
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return el as any
  }

  /**
   * 根据当前段落克隆一个段落; 克隆规则如下: \
   * 若当前段落是普通段落(schema.paragraph), 则返回一个新的普通段落 \
   * 若当前段落是标题段落(schema.heading), 则返回一个新的普通段落 \
   * 若当前段落是组件(EtComponent), 则返回一个新的普通段落 \
   * 否则, 返回一个当前“段落”的浅克隆版本, 并移除状态css类名 \
   * @param withBr 是否在新段落内插入一个br, 仅在返回普通段落时有效; 默认true
   */
  cloneParagraph(pEl = this._focusParagraph, withBr = true) {
    if (!pEl) {
      return this.createPlainParagraph(withBr)
    }
    if (
      pEl.localName === this.schema.paragraph.elName
      || pEl.etCode & EtTypeEnum.Heading
      || pEl.etCode & EtTypeEnum.Component
    ) {
      return this.createPlainParagraph(withBr)
    }
    // 浅克隆 元素名 + 属性
    const clone = pEl.cloneNode(false) as Et.Paragraph
    // 去掉特有属性
    clone.removeAttribute('id')
    // 去掉状态class
    clone.classList.remove(CssClassEnum.Active, CssClassEnum.CaretIn, CssClassEnum.Selected)
    return clone
  }

  /** 调用et元素对应类的create方法创建同类元素 */
  createEtElementAs<T extends Et.EtElement, N extends number = 1>(
    el: T, count: N = 1 as N,
  ): N extends 1 ? T : TupleOfLength<T, N> {
    const create = Object.getPrototypeOf(el).constructor.create
    if (count === 1) return create()
    return new Array(count).fill(0).map(create) as N extends 1 ? T : TupleOfLength<T, N>
  }

  createText(data: string): Et.Text {
    return document.createTextNode(data) as Et.Text
  }

  /**
   * 创建一个空的Document片段 或 根据html文本创建一个Document片段
   * @param data html文本
   */
  createFragment(data?: string) {
    if (!data) {
      return document.createDocumentFragment() as Et.Fragment
    }
    return document.createRange().createContextualFragment(data) as Et.Fragment
  }

  /**
   * 获取一个效应元素的效应处理器, 这是一个便利方法, 返回值为 `effectInvoker.getEtElCtor(el)`
   * * 使用此方法调用的效应无视`effectBlocker`
   * @param el 效应元素
   * @returns 效应元素的处理器
   */
  getEtHandler(el: Et.EtElement) {
    return this.effectInvoker.getEtElCtor(el) as Et.EffectHandleThis
  }

  /** 获取EtElement对应的Markdown文本 */
  toMarkdown(el: Et.EtElement, options?: TmOptions): string {
    return this.editor.mdProcessor.toMarkdown(this, el, options)
  }

  /** 将markdown文本转为编辑器内容(EtElement)的fragment */
  fromMarkdown(mdText: string, options?: FmOptions): Et.Fragment {
    return this.editor.mdProcessor.fromMarkdown(this, mdText, options)
  }
}
