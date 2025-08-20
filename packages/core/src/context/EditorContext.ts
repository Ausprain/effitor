import type { Options as FmOptions } from 'mdast-util-from-markdown'
import type { Options as TmOptions } from 'mdast-util-to-markdown'

import type { Et } from '~/core/@types'

import { platform } from '../config'
import { etcode } from '../element'
import { CssClassEnum, EtTypeEnum } from '../enums'
import { CommandManager } from '../handler/command/manager'
import { commonHandlers } from '../handler/common'
import { effectInvoker } from '../handler/invoker'
import { HotkeyManager } from '../hotkey/HotkeyManager'
import { getHotstringManager } from '../hotstring/manager'
import { EtSelection } from '../selection/EtSelection'

type ContextSelection = Readonly<Omit<EtSelection, 'range'> & {
  // 限制 range 的能力, 剔除如 extractContents 等可能会破坏 DOM 结构的方法
  range: Pick<Et.Range, keyof AbstractRange | 'commonAncestorContainer'> | null
}>

type UpdatedContextSelection = ContextSelection & {
  range: Exclude<ContextSelection['range'], null>
}

/**
 * 在 keydown 事件中, 若上下文效应元素/段落为空, 则强制编辑器失去焦点;
 * 否则继续执行效应器, 效应器中的上下文的效应元素/段落必定非空
 */
export interface UpdatedContext extends EditorContext {
  effectElement: NodeHasParent<Et.EtElement>
  paragraphEl: NodeHasParent<Et.Paragraph>
  topElement: NodeHasParent<Et.Paragraph>
  selection: UpdatedContextSelection
  readonly body: Et.EtBodyElement
}

/**
 * 编辑器上下文, 每一个编辑区对应一个上下文
 */
export class EditorContext {
  /** 编辑器对象本身 */
  readonly editor: Et.Editor
  /** 编辑器内容规范 */
  readonly schema: Readonly<Et.EditorSchema>
  /** 编辑器助手插件 */
  readonly assists = {} as Et.EditorAssists
  /** 插件上下文, 可扩展 EditorPluginContext 接口来获取类型提示 */
  readonly pctx = {} as Et.EditorPluginContext

  /** 上一个`text node` 用于判断光标是否跳动 */
  private oldNode: Et.NullableText = null
  private _updated = false
  private _effectElement: Et.EtElement | null = null
  private _paragraph: Et.Paragraph | null = null
  private _topElement: Et.Paragraph | null = null

  /** 是否跳过下一次selectionchange事件 */
  private _skipSelChange = false

  /** 当前编辑区, 在编辑器mount之前, 为null */
  body: Et.EtBodyElement | null = null
  /** 当前编辑区是否聚焦 */
  isFocused = false
  /**
   * 当前按下的按键, 在keydown结束时赋值当前按键; \
   * 在keydown事件中, 为上一个按下的按键; 可用于判断是否连续按下相同的按键
   * * 该值等于event.key
   */
  currDownKey?: string = undefined
  /**
   * 上一个抬起的按键; 用于判定双击按键 \
   * 每当按键抬起后111ms重设为undefined; 若在keydown时光标为Range状态,
   * 则设置为null, 并在keyup中为null时不记录该按键
   * * 该值等于event.key
   */
  prevUpKey?: string | null
  /** 当前 keydown 按下的按键组合, 通过 hotkey.modKey(KeyboardEvent) 计算 */
  modkey = ''
  /**
   * 一个推断属性, 根据当前用户的输入行为, 判断当前是否开启了输入法; 该判断是非严格的,
   * 因为没有获取输入法状态的相关标准 API, 我们无法得知当前输入是否为输入法输入;
   *
   * 在 Windows平台的 Chorme 下, 可以通过 KeyboardEvent.key
   * 属性是否为 'Process' 来判断, 但在 MacOS 下, 此方法无效; 并且在 Windows 下,
   * 用户开启输入法(如中文), 输入标点符号时, .key是"Process"且会激活 compositionstart,
   * 但在 MacOS 下, 输入法输入中文标点符号时, keydown 事件依旧无法判断是否为输入法输入,
   * .key 依旧等于半角的符号值, 且不会激活 compositionstart; 这样我们就无法判断用户
   * 是否预期插入输入法(全角)标点符号了;
   *
   * 因此需要此属性, 当用户使用输入法输入, 激活了 insertCompositionText 的 beforeinput 事件,
   * 我们将该属性标记为 true; 并在下一个 "纯的"insertText 中将其重置为 false;
   * 这样我们就可以在激活 insertText 之前, 通过该属性判断插入的标点, 是否应当是全角的;
   * 对应的全角字符可通过 HotkeyManager 自定义配置
   *
   * {@link HotkeyManager}
   */
  isUsingIME = false
  /** 是否处于输入法会话中, 即compositionstart与compositionend之间 */
  inCompositionSession = false
  /**
   * 记录composingupdate次数, 用于跳过后续update导致的selectionchange;
   * 当第一次触发输入法事务时, count=1
   */
  compositionUpdateCount = 0
  /**
   * 是否跳过默认Effector, (在keydown/keyup/beforeinput/input中设置为true时,
   * 都将跳过mainEffector的对应事件监听器)
   */
  skipDefault = false
  /**
   * 有完成InsertText的input事件，用于在selchange中判断该
   * selchange是否因用户输入（非输入法）文本而触发\
   * TODO: 应该可用skipSelChange替代, 因为inputText之后会调用ctx.setSelection()
   */
  hasInsertText = false

  /** 编辑器光标对象, 在编辑器mount时赋值 */
  readonly selection: ContextSelection = new EtSelection(this, platform.locale) as ContextSelection
  /** 效应调用器 */
  readonly effectInvoker: Et.EffectInvoker
  /** 通用效应处理器, 不依赖效应元素激活效应(跳过effectInvoker), 直接处理指定效应 */
  readonly commonHandlers = commonHandlers
  /** 命令控制器 */
  readonly commandManager: CommandManager
  /** 热键管理器 */
  readonly hotkeyManager: Et.hotkey.Manager
  /** 热字符串管理器 */
  readonly hotstringManager: Et.hotstring.Manager

  /** 获取编辑区所有文本 */
  textContent = () => this.body?.textContent ?? ''
  /** 获取当前选区的文本 */
  selectedTextContent = () => this.selection.selectedTextContent

  // 回调
  private readonly __onEffectElementChanged
  private readonly __onParagraphChanged

  constructor(
    editor: Et.Editor,
    schema: Et.EditorSchema,
    callbacks: Et.EditorCallbacks,
    hotkeyOptions?: Et.hotkey.ManagerOptions,
  ) {
    this.editor = editor
    this.schema = schema
    this.effectInvoker = effectInvoker
    this.commandManager = new CommandManager(this)
    this.hotkeyManager = new HotkeyManager(this as UpdatedContext, hotkeyOptions)
    this.hotstringManager = getHotstringManager(this)

    this.__onEffectElementChanged = callbacks.onEffectElementChanged
    this.__onParagraphChanged = callbacks.onParagraphChanged
  }

  /** 当前触发编辑逻辑的ShadowRoot */
  get root() {
    return this.editor.root
  }

  /** 当前光标所在文本节点, 光标不在文本节点上时为null */
  get node() {
    return this.selection.anchorText
  }

  /** 当前效应元素 */
  get effectElement() {
    return this._effectElement
  }

  private set effectElement(v) {
    if (this._effectElement === v || !v) return
    // fix. 为防止focusoutCallback里用到context, 先更新this._effectElement, 再调用focusoutCallback;
    // 因为旧的节点直接就是回调函数的this, 可以直接拿到, 而新的节点需要ctx获得
    const old = this._effectElement
    this._effectElement = v
    // 不是段落时执行回调, 避免在paragraphEl中又执行一次
    if (old && old.focusoutCallback && !(old.etCode & EtTypeEnum.Paragraph)) {
      old.focusoutCallback(this)
    }
    if (!(v.etCode & EtTypeEnum.Paragraph) && v.focusinCallback) v.focusinCallback(this)
  }

  /** 当前光标所在顶层节点（“段落”）, 光标只能落在"段落"里 */
  get paragraphEl() {
    return this._paragraph
  }

  private set paragraphEl(v) {
    if (this._paragraph === v) return
    const old = this._paragraph
    this._paragraph = v
    if (old && old.focusoutCallback) old.focusoutCallback(this)
    if (v && v.focusinCallback) v.focusinCallback(this)
  }

  /** 光标所在编辑区顶层元素（即body的子节点） */
  get topElement() {
    if (this._topElement) return this._topElement
    return (this._topElement = this.selection.isForward
      ? this.selection.endTopElement
      : this.selection.startTopElement
    )
  }

  forceUpdate() {
    if (!this.selection.update()) {
      // 光标更新失败, 强制编辑器失去焦点
      this.editor.blur()
      return (this._updated = false)
    }

    if (this.oldNode !== null && this.oldNode === this.selection.anchorText) {
      return (this._updated = true)
    }
    this.oldNode = this.selection.anchorText
    this._topElement = null

    let effectEl, pEl
    if (this.selection.isForward) {
      effectEl = this.selection.endEffectElement
      pEl = this.selection.endParagraph
    }
    else {
      effectEl = this.selection.startEffectElement
      pEl = this.selection.startParagraph
    }

    if (!effectEl || !pEl) {
      if (import.meta.env.DEV) {
        console.error('effect element or paragraph not found')
      }
      this.editor.blur()
      return (this._updated = false)
    }

    // 效应元素没有变，后续不用更新
    if (this._effectElement === effectEl) {
      return (this._updated = true)
    }

    if (this.__onEffectElementChanged && this._effectElement) {
      this.__onEffectElementChanged?.(effectEl, this._effectElement, this)
    }
    this.effectElement = effectEl

    // 效应元素就是段落, 不用更新段落
    if (this._paragraph && effectEl === pEl) {
      return (this._updated = true)
    }

    if (this._paragraph !== pEl) {
      if (this.__onParagraphChanged && this._paragraph) {
        this.__onParagraphChanged?.(pEl, this._paragraph, this)
      }
      this.paragraphEl = pEl
    }
    return (this._updated = true)
  }

  /**
   * 检查当前上下文是否已更新; 已更新的上下文 effectElement/paragraphEl/topElement非空
   */
  isUpdated(this: EditorContext): this is UpdatedContext {
    return this._updated
  }

  /**
   * 向上（包括自身）找第一个`Et.EtElement`, 无效应元素或节点不在编辑区(ctx.body)内, 将返回 null\
   * 使用"鸭子类型",  Effitor 内拥有`etCode`属性的元素被视为效应元素
   */
  findEffectParent(node: Et.NullableNode): Et.EtElement | null {
    while (node) {
      if (node.etCode !== void 0) return node as Et.EtElement
      if (node === this.body) return null
      node = node.parentNode
    }
    return null
  }

  /**
   * 向上查找最近一个`Et.ParagraphElement`, `etCode`匹配段落 EtType, 则视为段落效应元素
   */
  findParagraph(node: Et.NullableNode): Et.Paragraph | null {
    while (node) {
      if (node === this.body) return null
      if (node.etCode && (node.etCode & EtTypeEnum.Paragraph)) return node as Et.Paragraph
      node = node.parentNode
    }
    return null
  }

  /**
   * 找一个在编辑区内的节点所在的顶层节点
   */
  findTopElement(node: Et.Node): Et.Paragraph {
    let p = node.parentNode
    while (p && p !== this.body) {
      node = p
      p = p.parentNode
    }
    return node as Et.Paragraph
  }

  /**
   * 是否跳过了一次 selectionchange 事件; 该getter 只能在 selectionchange 事件中使用;
   * 调用时, 会重置为 false
   */
  get selChangeSkipped() {
    const skipped = this._skipSelChange
    this._skipSelChange = false
    return skipped
  }

  /**
   * 跳过下一次selectionchange事件
   */
  skipNextSelChange() {
    return (this._skipSelChange = true)
  }

  /**
   * 设置新的光标位置并更新选区和上下文(selection和ctx)
   */
  setSelection(caretRange?: Et.CaretRange) {
    // selectRange 必然会导致selectionchagne, 进而调用ctx.forceUpdate()
    // 但此处必须手动更新ctx; 因为selchange加了防抖, 快速编辑情况下, 可能导致更新延误
    if (caretRange) {
      const range = caretRange.toRange()
      if (range && this.selection.selectRange(range) && this.forceUpdate()) {
        return this.skipNextSelChange()
      }
    }
    if (this.forceUpdate()) {
      return this.skipNextSelChange()
    }
    return false
  }

  /**
   * 设置光标到一个段落的开头/末尾; 由于段落有多种类型(普通段落, 组件段落, Blockquote段落...),
   * 因此需要此方法来统一根据段落类型设置光标位置; 该设置光标的动作是异步的 (requestAnimationFrame)
   */
  setCaretToAParagraph(paragraph: Et.Paragraph, toStart: boolean) {
    if (etcode.check(paragraph, EtTypeEnum.Component)) {
      requestAnimationFrame(() => {
        paragraph.focusToInnerEditable(this, toStart)
      })
      return
    }
    requestAnimationFrame(() => {
      this.setSelection(toStart
        ? paragraph.innerStartEditingBoundary()
        : paragraph.innerEndEditingBoundary())
    })
  }

  /**
   * 判断当前位置是否允许某效应; 即判断指定效应元素是否
   * 允许为当前光标所在效应元素(ctx.effectElement)的子节点 \
   * 光标range时始终为false
   * @param target 效应值 | 效应元素类 | 效应元素对象; 若传入值<=0, 则返回true
   */
  checkIn(target: number | Et.EtElement | Et.EtElementCtor) {
    if (!this.selection.isCollapsed || !this._effectElement) {
      return false
    }
    let code: number
    if (typeof target === 'number') {
      if (target <= 0) {
        return true
      }
      code = target as number
    }
    else {
      code = (target as Et.EtElement).etCode
      if (code === void 0) {
        code = (target as Et.EtElementCtor).etType
      }
    }
    return code && !(~this._effectElement.inEtCode & code)
  }

  /**
   * 判断一个节点是否为普通段落, 即当前ctx.schema.paragraph的实例
   * * 有别于 `etcode.check(node, EtTypeEnum.Paragraph)`
   * etcode的方法用于判断节点是否为paragraph效应类型元素
   * * 而该方法用于判断一个节点是否为当前编辑器配置的paragraph段落元素本身
   */
  isParagraph(node: Et.Node) {
    return node.localName === this.schema.paragraph.elName
  }

  /**
   * 根据当前段落克隆一个段落; 克隆规则如下: \
   * 若当前段落是普通段落(schema.paragraph), 则返回一个新的普通段落 \
   * 若当前段落是标题段落(schema.heading), 则返回一个新的普通段落 \
   * 若当前段落是组件(EtComponentElement), 则返回一个新的普通段落 \
   * 否则, 返回一个当前“段落”的浅克隆版本, 并移除状态css类名 \
   * @param withBr 是否在新段落内插入一个br, 仅在返回普通段落时有效; 默认true
   */
  cloneParagraph(withBr = true) {
    if (!this._paragraph) {
      return this.createParagraph(withBr)
    }
    if (
      this._paragraph.localName === this.schema.paragraph.elName
      || this._paragraph.etCode & EtTypeEnum.Heading
      || this._paragraph.etCode & EtTypeEnum.Component
    ) {
      return this.createParagraph(withBr)
    }
    // 浅克隆 元素名 + 属性
    const clone = this._paragraph.cloneNode(false) as Et.Paragraph
    // 去掉特有属性
    clone.removeAttribute('id')
    // 去掉状态class
    clone.classList.remove(CssClassEnum.Active, CssClassEnum.CaretIn, CssClassEnum.Selected)
    return clone
  }

  /** 默认创建一个带br的schema段落 */
  createParagraph(withBr = true): Et.EtParagraphElement {
    const p = this.schema.paragraph.create()
    if (withBr) {
      p.appendChild(document.createElement('br'))
    }
    return p
  }

  /** 调用et元素对应类的create方法创建同类元素 */
  createEtElementAs<T extends Et.EtElement, N extends number = 1>(
    el: T, count: N = 1 as N,
  ): N extends 1 ? T : TupleOfLength<T, N> {
    const create = Object.getPrototypeOf(el).constructor.create
    if (count === 1) return create()
    return new Array(count).fill(0).map(create) as N extends 1 ? T : TupleOfLength<T, N>
  }

  /** 根据html文本创建一个Document片段 */
  createFragment(data: string) {
    return document.createRange().createContextualFragment(data) as Et.Fragment
  }

  /** 触发一个编辑区事件; 此方法只能在编辑器 mount 之后调用 */
  dispatchEvent(event: Event) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.body!.dispatchEvent(event)
  }

  /** 在编辑区触发一个input事件; 此方法只能在编辑器 mount 之后调用 */
  dispatchInputEvent(
    type: 'beforeinput' | 'input',
    init: InputEventInit & { inputType: `${Et.InputType}` },
  ) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.body!.dispatchEvent(new InputEvent(type, {
      bubbles: false,
      cancelable: true,
      ...init,
    }))
  }

  /** 阻止事件默认行为, 并跳过默认effector */
  preventAndSkipDefault(ev: Event) {
    return (ev.preventDefault(), this.skipDefault = true) as true
  }

  /** 获取EtElement对应的Markdown文本 */
  toMarkdown(el: Et.EtElement, options?: TmOptions): string {
    return this.editor.markdown.toMarkdown(this, el, options)
  }

  /** 将markdown文本转为编辑器内容(EtElement)的fragment */
  fromMarkdown(mdText: string, options?: FmOptions): DocumentFragment {
    return this.editor.markdown.fromMarkdown(this, mdText, options)
  }
}
