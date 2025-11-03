import { CssClassEnum } from '@effitor/shared'

import type { Et } from '../@types'
import { platform } from '../config'
import type { EditorBody } from '../context/EditorBody'
import { dom } from '../utils'
import { CaretRange } from './CaretRange'
import { cr } from './cr'
import { getTargetRangeCtor, ValidTargetCaret, ValidTargetRange } from './EtTargetRange'

const enum SelectAllLevel {
  No_Select_All = 0,
  Select_Soft_Line = 1,
  Select_Paragraph = 2,
  Select_Document = 3,
}

/**
 * 编辑器选区
 */
export class EtSelection {
  private _selection: Selection | null = null
  private _getSelection: () => Selection | null
  private readonly _body: EditorBody
  private readonly TargetRange: ReturnType<typeof getTargetRangeCtor>

  /**
   * 光标位置缓存
   * 编辑器 focusout 时, 缓存光标位置; 当主动调用编辑器的 focus方法时,
   * 说明由脚本聚焦编辑器, 此时通过缓存恢复选区位置\
   * 非脚本聚焦编辑器时, 由浏览器处理新的选区位置
   */
  private _caretRange: CaretRange | null = null
  private _targetRange: Et.TargetRange | null = null
  private _validTargetRange?: Et.ValidTargetRange | null = void 0

  private _isForward: boolean | undefined
  private _commonEtElement: Et.EtElement | null | undefined
  private _focusEtElement: Et.EtElement | null | undefined
  private _focusParagraph: Et.Paragraph | null | undefined
  private _focusTopElement: Et.Paragraph | null | undefined
  /** 光标若在原生 input/textarea 内, 则该属性为该 input/textarea 节点; 否则为 null */
  private _rawEl: Et.HTMLRawEditElement | null = null
  private _revealIdleCallbackId = 0

  /** 选区是否在 shadowDOM 内 */
  public inShadow: boolean
  /** 选区历史记录 */
  public history = new SelectionHistory(this)
  /** 当前选择的 Range 列表; 仅在多选区场景非空, 最后一项恒等于 range; */
  public ranges: Et.TargetRange[] = []
  /** 当前选区对应的 Range */
  public range: Et.Range | null = null
  private _collapsed = true

  /**
   * 创建一个编辑器选区对象, 当编辑器使用 ShadowDOM 时, 必须在编辑器 mount 之后调用 setSelectionGetter\
   * getSelection 函数需要 bind 在 ShadowRoot或 Document 上, 否则调用时报错
   */
  constructor(body: EditorBody) {
    this._body = body
    this.inShadow = false
    this._getSelection = document.getSelection.bind(document)
    this.TargetRange = getTargetRangeCtor(body)
  }

  get selection() {
    if (!this._selection) {
      this._selection = this._getSelection()
    }
    return this._selection
  }

  get commonAncestor() {
    return this.range ? this.range.commonAncestorContainer : null
  }

  /**
   * 文本锚点, 只有两种情况下非空\
   * 1. 选区 collapsed 且光标落在文本节点上\
   * 2. 选区非 collapsed, 且 range起止节点是同一文本节点
   */
  get anchorText() {
    if (!this._rawEl && this._targetRange && this._targetRange.isTextCommonAncestor()) {
      return this._targetRange.commonAncestor
    }
    return null
  }

  /**
   * 当 anchorText 非空时, 返回光标或选区起始位置在 anchorText 中的偏移量
   * 当 anchorText 为空时, 返回 0
   */
  get anchorOffset() {
    if (this.range) {
      return this.range.startOffset
    }
    return 0
  }

  /**
   * 当前选区聚焦的节点; 当 anchorText 非空时, 等于 anchorText; 否则等于
   * selection.focusNode在 focusOffset 位置的子节点
   */
  get focusNode() {
    return this.anchorText || this.selection?.focusNode?.childNodes.item(
      this.selection.focusOffset) as Et.NodeOrNull | undefined
  }

  /** 选区是否 collapsed */
  get isCollapsed() {
    if (this._rawEl) {
      return this._rawEl.selectionStart === this._rawEl.selectionEnd
    }
    return this._collapsed
  }

  /** 选区是否是向前选择的, collapsed时始终返回true; 其他情况, 只要不是明确 backward 的, 都是 forward 的 */
  get isForward() {
    if (this._isForward !== void 0) {
      return this._isForward
    }
    if (this.isCollapsed) {
      return (this._isForward = true)
    }
    const s = this._selection
    if (!s || !s.direction) {
      return (this._isForward = true)
    }
    // 使用shift+方向键 选择内容时 direction="forward"|"backward"; 使用鼠标划选时, direction="none"
    if (s.direction !== 'none') {
      return this._isForward = (s.direction === 'forward')
    }
    const r = this.range
    return this._isForward = (
      !!r && r.startContainer === s.anchorNode && r.startOffset === s.anchorOffset
    )
  }

  /**
   * 设置获取 selection 对象的方法, 仅在编辑器使用 ShadowDOM 时使用
   */
  setSelectionGetter(root: Et.ShadowRoot) {
    if (!root.getSelection) {
      this.inShadow = false
      return
    }
    this._getSelection = root.getSelection.bind(root)
    this.inShadow = true
  }

  /**
   * 更新选区信息, 除输入法会话内, 除处理输入法行为需要时, 该方法不可单独调用, 只能通过 ctx.updateUpdate() 间接调用
   */
  update() {
    const sel = this.selection
    if (!sel || sel.rangeCount === 0) {
      return false
    }
    const oldText = this.anchorText
    if (this._rawEl) {
      const r = document.createRange()
      r.setStart(this._rawEl, 0)
      r.setEnd(this._rawEl, 0)
      this.range = r as Et.Range
    }
    else {
      this.range = sel.getRangeAt(0) as Et.Range
      // 使用 range.collapsed 而非 selection.isCollapsed; 后者在 ShadowDOM 内不准（chromium 120)
      this._collapsed = this.range.collapsed
    }
    this._caretRange = cr.fromRange(this.range).markConnected()
    this._targetRange = this.TargetRange.fromRange(this.range)
    this._validTargetRange = void 0

    this._isForward = void 0
    if (!oldText || oldText !== this.anchorText) {
      this._commonEtElement = void 0
      this._focusEtElement = void 0
      this._focusParagraph = void 0
      this._focusTopElement = void 0
    }

    if (this.isRangingBody) {
      this._body.el.classList.add(CssClassEnum.SelectionAll)
    }
    else {
      this._body.el.classList.remove(CssClassEnum.SelectionAll)
    }
    return true
  }

  /**
   * 清除选区上下文
   */
  clear() {
    this.range = null
    // this._caretRange = null
    this._targetRange = null
    this._validTargetRange = void 0
    this._commonEtElement = void 0
    this._focusEtElement = void 0
    this._focusParagraph = void 0
    this._focusTopElement = void 0
    this.selection?.removeAllRanges()
  }

  /** 尝试恢复选区 */
  restore() {
    if (!this._caretRange) {
      return
    }
    const r = this._caretRange.toRange()
    // 恢复的选区需要再次判断是否已连接, 因为_caretRange在赋值时被标记为 connected, 但在恢复选区时, 选区可能已被修改
    if (!r || !r.startContainer.isConnected || !r.endContainer.isConnected) {
      return false
    }
    return this.selectRange(r)
  }

  /**
   * 获取当前选区范围内的文本内容
   */
  get selectedTextContent() {
    if (this._rawEl) {
      return this._rawEl.value.slice(this._rawEl.selectionStart, this._rawEl.selectionEnd)
    }
    if (this.isCollapsed || !this.range) {
      return ''
    }
    return this.range.toString()
  }

  /**
   * 公共效应元素祖先, 多数情况下是当前段落, 或 et-body
   */
  get commonEffectElement(): Et.EtElement | null {
    if (this._commonEtElement !== void 0) {
      return this._commonEtElement
    }
    return this._commonEtElement = (this._targetRange && this._targetRange.commonEtElement)
  }

  get focusEffectElement(): Et.EtElement | null {
    if (this._focusEtElement !== void 0) {
      return this._focusEtElement
    }
    if (this.isForward) {
      this._focusEtElement = (this._targetRange && this._targetRange.endEtElement)
    }
    else {
      this._focusEtElement = (this._targetRange && this._targetRange.startEtElement)
    }
    return this._focusEtElement
  }

  get focusParagraph(): Et.Paragraph | null {
    if (this._focusParagraph !== void 0) {
      return this._focusParagraph
    }
    if (this.isForward) {
      this._focusParagraph = (this._targetRange && this._targetRange.endParagraph)
    }
    else {
      this._focusParagraph = (this._targetRange && this._targetRange.startParagraph)
    }
    return this._focusParagraph
  }

  get focusTopElement(): Et.Paragraph | null {
    if (this._focusTopElement !== void 0) {
      return this._focusTopElement
    }
    if (this.isForward) {
      this._focusTopElement = (this._targetRange && this._targetRange.endTopElement)
    }
    else {
      this._focusTopElement = (this._targetRange && this._targetRange.startTopElement)
    }
    return this._focusTopElement
  }

  /** 光标是否在段落内开头 */
  get isCaretAtParagraphStart() {
    return this._targetRange && this._targetRange.isCaretAtParagraphStart()
  }

  /** 光标是否在段落内结尾 */
  get isCaretAtParagraphEnd() {
    return this._targetRange && this._targetRange.isCaretAtParagraphEnd()
  }

  /** 光标是否在编辑区开头 */
  get isCaretAtBodyStart() {
    return this._targetRange && this._targetRange.isCaretAtBodyStart()
  }

  /** 光标是否在编辑区结尾 */
  get isCaretAtBodyEnd() {
    return this._targetRange && this._targetRange.isCaretAtBodyEnd()
  }

  /** 是否全选编辑区 */
  get isRangingBody() {
    return (!this.isCollapsed && this.range
      && this.range.startContainer === this.range.endContainer
      && this.range.startContainer === this._body.el
      && this.range.startOffset === 0
      && this.range.endOffset === this._body.el.childNodes.length)
  }

  /**
   * 获取光标位置对应的 CaretRange 对象
   * @returns 一个 CaretRange 对象; 若 this.isCollapsed==true, 返回的是 EtCaret, 否则 EtRange
   *  若当前选区为空, 则返回编辑区开头位置
   */
  getCaretRange() {
    if (this._caretRange) {
      return this._caretRange
    }
    return cr.fromRange(this.range ?? {
      collapsed: true,
      startContainer: this._body.el,
      startOffset: 0,
      endContainer: this._body.el,
      endOffset: 0,
    }).markConnected()
  }

  /**
   * 获取当前选区目标光标对象; 若选区非collapsed 或光标位置不存在或不合法, ~~或光标在原生编辑节点内~~, 返回 null
   */
  getTargetCaret() {
    // if (this._rawEl) {
    //   return null
    // }
    const tr = this.getTargetRange()
    if (!tr || !tr.collapsed) {
      return null
    }
    return tr.toTargetCaret()
  }

  /**
   * 获取当前选区目标范围对象; 若选区范围不存在或不合法, ~~或选区范围在原生编辑节点内~~, 返回 null
   * * 该TargetRange可能是 collapsed 的; 可通过其.toTargetCaret()方法获取对应合法光标位置
   */
  getTargetRange() {
    // if (this._rawEl) {
    //   return null
    // }
    if (this._validTargetRange !== void 0) {
      return this._validTargetRange
    }
    if (!this._targetRange || !this._targetRange.isValid()) {
      return this._validTargetRange = null
    }
    if (!this.isForward) {
      this._targetRange.isBackward = true
    }
    return this._validTargetRange = this._targetRange
  }

  /**
   * 从 EtCaretRange 构建一个 EtTargetCaret 实例, 若不存在或不合法, 返回 null
   * @param caretRange EtCaretRange 实例
   */
  createTargetCaret(caretRange: Et.CaretRange | null): ValidTargetCaret | null
  /**
   * 从 Range 构建一个 EtTargetCaret 实例, 若不存在或不合法, 返回 null
   * @param range Range 实例
   */
  createTargetCaret(range: Range): ValidTargetCaret | null
  /**
   * 创建一个 EtTargetCaret 实例, 若光标位置不合法, 返回 null
   * @param container 光标所在节点
   * @param offset 光标所在节点偏移量
   */
  createTargetCaret(container: Et.HTMLNode, offset: number): ValidTargetCaret | null
  createTargetCaret(target: Et.HTMLNode | Et.CaretRange | Range | null, offset?: number): ValidTargetCaret | null {
    if (!target) {
      return null
    }
    if ((target as Et.EtCaret).toRange) {
      target = (target as Et.EtCaret).toRange() as Range
    }
    if (!target) {
      return null
    }
    let tc: Et.TargetCaret | null
    if (target instanceof Range) {
      if (!target.collapsed) {
        return null
      }
      tc = this.TargetRange.createCaret(target.endContainer as Et.HTMLNode, target.endOffset)
    }
    else {
      if (!(target as Node).isConnected || offset === void 0) {
        return null
      }
      tc = this.TargetRange.createCaret(target as Et.HTMLNode, offset)
    }
    if (!tc.isValid()) {
      return null
    }
    return tc
  }

  /**
   * 从 EtCaretRange 构建一个 EtTargetRange 实例; 若不存在或不合法, 将返回 null
   */
  createTargetRange(caretRange: Et.CaretRange | null): ValidTargetRange | null
  /**
   * 从Range构建一个 EtTargetRange 实例; 若范围不合法, 将返回 null
   */
  createTargetRange(range: Range): ValidTargetRange | null
  /**
   * 创建一个 EtTargetRange 实例; 若范围不合法, 将返回 null
   * @param startNode 选区起始节点
   * @param startOffset 选区起始节点偏移量
   * @param endNode 选区结束节点
   * @param endOffset 选区结束节点偏移量
   */
  createTargetRange(
    startNode: Et.HTMLNode, startOffset: number,
    endNode: Et.HTMLNode, endOffset: number,
  ): Et.ValidTargetRange | null
  createTargetRange(
    rangeOrStartNode: Et.HTMLNode | Range | Et.CaretRange | null, startOffset?: number,
    endNode?: Et.HTMLNode, endOffset?: number,
  ): Et.ValidTargetRange | null {
    if (!rangeOrStartNode) {
      return null
    }
    let tr
    if ((rangeOrStartNode as Et.EtRange).toRange) {
      rangeOrStartNode = (rangeOrStartNode as Et.EtRange).toRange() as Range
    }
    if (!rangeOrStartNode) {
      return null
    }
    if (rangeOrStartNode instanceof Range) {
      tr = this.TargetRange.fromRange(rangeOrStartNode)
    }
    else if (!startOffset || !endNode || !endOffset) {
      return null
    }
    else {
      tr = this.TargetRange.createRange(rangeOrStartNode as Et.HTMLNode, startOffset, endNode, endOffset)
    }
    if (!tr || !tr.isValid()) {
      return null
    }
    return tr
  }

  /**
   * 从 EtCaret 和 TargetSelection 中区分出 EtCaret 类型
   */
  tellEtCaret(target: Et.EtCaret | Et.TargetSelection): target is Et.EtCaret {
    return (target as Et.EtCaret).anchor !== void 0
  }

  /**
   * 检查插入位置是否合法, 并执行相应的回调函数
   * @param insertAt 插入位置 可以是一个光标位置(EtCaret) 或目标选区(TargetCaret | TargetRange);
   *                 若为 null, 则使用当前选区位置
   * @param fn 回调函数, 接收一个参数: 合法的目标选区
   * @returns 若检查通过, 返回 true; 否则, 返回 false
   */
  checkInsertAt(
    insertAt: Et.EtCaret | Et.TargetSelection | null,
    fn: (ts: Et.ValidTargetSelection) => boolean,
  ) {
    if (!insertAt) {
      insertAt = this.getTargetCaret()
    }
    else if (this.tellEtCaret(insertAt)) {
      insertAt = this.createTargetCaret(insertAt)
    }
    if (!insertAt || !insertAt.isValid()) {
      return false
    }
    return fn(insertAt)
  }

  /**
   * 检查一个选区目标是合法的光标还是范围, 并执行相应的回调函数
   * @param target 选区目标, 若为 null, 则使用当前选区目标
   * @param options
   * * options.caretFn 光标函数
   * * options.rangeFn 范围函数
   */
  checkSelectionTarget(
    target: Et.TargetSelection | null,
    {
      caretFn,
      rangeFn,
    }: {
      caretFn: (caret: Et.ValidTargetCaret) => boolean
      rangeFn: (range: Et.ValidTargetRange) => boolean
    },
  ) {
    if (!target) {
      target = this.getTargetRange()
      if (!target) {
        return false
      }
    }
    if (!target.isValid()) {
      return false
    }
    if (target.isCaret()) {
      return caretFn(target)
    }
    else if (target.collapsed) {
      return caretFn(target.toTargetCaret())
    }
    return rangeFn(target)
  }

  /**
   * 当光标落入input/textarea 内部, selection更新时, selection 不会包含
   * input/textarea 的内部信息; 通常情况下, selection.anchor/focus 节点
   * 是该 input/textarea节点; 但有时会是其 contenteditable=false 的祖先;
   * 或者光标落于 input/textarea 节点的外开头位置;
   * 因此, 当光标落入此类原生编辑节点时, 须通过该方法手动标记选区为 raw; 并通过
   * this.rawEl 是否为空来判断选区是否在原生编辑节点内
   *
   * * [deprecated] 该方法在 selectionchange 内调用, 通过 event.target 来判断光标是否落入原生编辑节点内
   * * 该方法在 focusin/focusout 事件内调用, 通过 focusin/out 事件的 target 来判断光标是否落入原生编辑节点内
   *   或从原生节点内移出
   */
  setInRaw(el: Et.HTMLRawEditElement | null = null) {
    this._rawEl = el
  }

  /**
   * 当光标光标落入input/textarea 内部时, 该属性为该 input/textarea 节点;
   * 否则为 null
   */
  get rawEl() {
    return this._rawEl
  }

  /** 选择一个范围更新到当前选区; 此方法不执行 EtSelection.update */
  selectRange(range: Range) {
    const sel = this.selection
    if (!sel) {
      return false
    }
    sel.removeAllRanges()
    sel.addRange(range)
    return true
  }

  /**
   * 折叠选区, 使光标位置位于选区开头或结尾
   * @param [toStart=true] 是否折叠到选区开头, 默认 true
   * @param [reveal=true] 是否尝试滚动以保证光标显示在视口内, 默认 true
   */
  collapse(toStart = true, reveal = true) {
    if (this._rawEl) {
      if (toStart) {
        this._rawEl.selectionEnd = this._rawEl.selectionStart
      }
      else {
        this._rawEl.selectionStart = this._rawEl.selectionEnd
      }
      return true
    }
    if (this.isCollapsed) {
      return true
    }
    if (!this.selection) {
      return false
    }
    if (toStart) {
      this.selection.collapseToStart()
    }
    else {
      this.selection.collapseToEnd()
    }
    if (reveal) {
      this.revealSelection()
    }
    return true
  }

  /**
   * 折叠选区, 使光标位置位于 node 节点的相对索引处
   * * 该方法直接调用 Selection.collapse 方法, 不校验位置合法性
   */
  collapseTo(node: Et.Node, offset: number) {
    this.selection?.collapse(node, offset)
  }

  /**
   * 将光标定位于node节点的相对索引处，offset<0定位到外开头，=0定位到内开头，=Infinity定位到外末尾 \
   * 若node为Text节点，则始终定位于Text文本内
   * * 此方法不主动更新上下文, 但会导致浏览器触发一个 selectionchange 事件, 但不是同步的
   * * 若后续行为依赖最新的上下文或光标选区信息, 必须手动调用 ctx.forceUpdate
   * @returns 是否成功更新光标位置
   */
  caretTo(node: Et.Node, offset: number): boolean {
    const sel = this.selection
    if (!sel || !node || !node.isConnected || !this._body.isNodeInBody(node)) {
      return false
    }

    const r = document.createRange() as Et.Range
    if (offset < 0) {
      r.selectNode(node)
      r.collapse(true)
    }
    else if (offset === Infinity || offset > dom.nodeLength(node)) {
      r.selectNode(node)
      r.collapse(false)
    }
    else {
      r.setStart(node, offset)
    }
    sel.removeAllRanges()
    sel.addRange(r)
    return true
  }

  /**
   * 扩展当前选区至某位置\
   * 若Node是Text节点，则 `0 <= offset <= node.length`
   * 若Node不是Text，则 `0 <= offset <= node.childNodes.length`
   * * 此方法不主动更新上下文, 但会导致浏览器触发一个 selectionchange 事件, 但不是同步的
   * * 若后续行为依赖最新的上下文或光标选区信息, 必须手动调用 ctx.forceUpdate
   * @returns 是否成功扩展选区
   */
  rangeTo(node: Et.Node, offset: number): boolean {
    const sel = this.selection
    const originR = this.range
    if (!sel || !originR || !this._body.isNodeInBody(node)) {
      return false
    }
    const destR = originR.cloneRange()
    if (!this.isValidPosition(node, offset)) {
      return false
    }
    destR.setEnd(node, offset)
    if (destR.collapsed) {
      // 范围坍缩，说明文档树中node在 focusNode 前面
      destR.setEnd(originR.endContainer, originR.endOffset)
    }
    sel.removeAllRanges()
    sel.addRange(destR)
    return true
  }

  isValidPosition(node: Et.Node, offset: number) {
    if (!node.isConnected) return false
    if (dom.isText(node)) {
      return offset >= 0 && offset <= node.length
    }
    return offset >= 0 && offset <= node.childNodes.length
  }

  /**
   * 判断一个目标范围是否在编辑区内
   */
  isValidRange(sr: Et.StaticRange) {
    return this._body.isNodeInBody(sr.startContainer) && this._body.isNodeInBody(sr.endContainer)
  }

  /**
   * 调用Selection.modify方法, 修改当前选区\
   * * 此方法不主动更新上下文, 但会导致浏览器触发一个 selectionchange 事件, 但不是同步的
   * * 若后续行为依赖最新的上下文或光标选区信息, 必须手动调用 ctx.forceUpdate
   * @param alter 操作类型
   * @param direction 操作方向
   * @param granularity 操作粒度
   * @param reveal 移动光标后, 若终点不在视口内, 是否移动页面让光标显示在视口内, 默认 true;
   *    且默认使用 auto 的 behavior 来滚动; 若要smooth滚动, 可设置为 false, 手动调用
   *    revealSelection 方法, 并设置 scrollBehavior 为 'smooth'
   */
  modify(
    alter: ModifyAlter, direction: ModifyDirection, granularity: ModifyGranularity, reveal = true,
  ) {
    if (this.selection) {
      (this._selection as Selection).modify(alter, direction, granularity)
    }
    if (reveal) {
      this.revealSelection(['backward', 'left'].includes(direction))
    }
    return true
  }

  /**
   * 调用Selection.modify方法, 修改当前选区, 用于 extend 一次性扩展多个方向\
   * * 此方法不主动更新上下文, 但会导致浏览器触发一个 selectionchange 事件, 但不是同步的
   * * 若后续行为依赖最新的上下文或光标选区信息, 必须手动调用 ctx.forceUpdate
   * @param actions 一个二维数组, 每个子数组是调用modify的参数
   */
  modifyMulti(actions: Parameters<Selection['modify']>[]) {
    const sel = this.selection
    if (!sel) {
      return false
    }
    for (const action of actions) {
      sel.modify(...action)
    }
    return true
  }

  /**
   * 让光标位置显示在视口内, 若已经在视口内, 则什么也不做
   * @param toStart 当选区为 range 时, 通过该参数决定是保证range起点
   *    在视口内, 还是优先保证range终点在视口内
   */
  revealSelection(toStart = true, scrollBehavior: ScrollBehavior = 'auto') {
    if (this._revealIdleCallbackId) {
      cancelIdleCallbackPolyByEffitor(this._revealIdleCallbackId)
    }
    requestIdleCallbackPolyByEffitor(() => this.revealSelectionSync(toStart, scrollBehavior))
  }

  /**
   * 同 {@link revealSelection}, 但是同步执行
   * @param range 指定 Range, 即滚动编辑区, 让该 range 对应矩形框显示在视口内, 缺省或为 null 时, 使用当前选区 Range
   */
  revealSelectionSync(toStart = true, scrollBehavior: ScrollBehavior = 'auto', range?: Range | null) {
    if (this._rawEl && !range) {
      // 光标在原生编辑节点 (input/textarea) 内时, range.getBoundingClientRect返回的 rect 全为 0
      // 无法通过 Selection/Range API 来获取光标位置, 只能通过原生编辑节点的 scrollTop 来实现
      this._revealSelectionInRawEl(this._rawEl, toStart, scrollBehavior)
      return
    }
    this._revealIdleCallbackId = 0
    if (range && !this._body.isNodeInBody(range.commonAncestorContainer)) {
      return
    }
    if (!range) {
      range = this.range
      if (!range) {
        return
      }
    }
    const rects = range.getClientRects()
    // 正常情况下, rect 是一行文本(css软换行)的边框
    let rect = rects[toStart ? 0 : rects.length - 1]
    if (!rect) {
      // fixed. 若光标collapsed在节点边缘(类似光标在input/textarea 内的情况), rects 可能为空 ()
      let anchorEl = range.endContainer.childNodes.item(range.endOffset) as Et.NodeOrNull
      if (!anchorEl) {
        anchorEl = range.endContainer.hasChildNodes()
          ? range.endContainer.lastChild as Et.Node
          : range.endContainer as Et.Element
      }
      if (!dom.isElement(anchorEl)) {
        anchorEl = anchorEl.parentElement as Et.Element
      }
      if (!anchorEl) {
        return
      }
      rect = anchorEl.getBoundingClientRect()
    }
    this._body.scrollToReveal(rect, {
      toStart,
      scrollBehavior,
    })
    // const scrollContainer = this._body.scrollContainer
    // const { scrollLeft, scrollTop } = scrollContainer
    // let offsetTop, offsetBottom, offsetLeft, offsetRight
    // if (scrollContainer === document.documentElement) {
    //   offsetTop = 0
    //   offsetBottom = window.innerHeight
    //   offsetLeft = 0
    //   offsetRight = window.innerWidth
    // }
    // else {
    //   const offsetRect = scrollContainer.getBoundingClientRect()
    //   offsetTop = Math.min(0, offsetRect.top)
    //   offsetBottom = Math.max(window.innerHeight, offsetRect.bottom)
    //   offsetLeft = Math.min(0, offsetRect.left)
    //   offsetRight = Math.max(window.innerWidth, offsetRect.right)
    // }

    // let left = scrollLeft, top = scrollTop
    // if (rect.top < offsetTop) {
    //   top += rect.top - 20 // rect.top < 0, 多减 20 不至于紧贴边缘
    // }
    // if (rect.left < offsetLeft) {
    //   left += rect.left - 20
    // }
    // // 正常情况下, rect 是一行文本(css软换行)的边框, 高度理论上远小于scrollContainer的高度
    // if (rect.bottom > offsetBottom) {
    //   top += rect.bottom - offsetBottom + 20
    // }
    // if (rect.right > offsetRight) {
    //   left += rect.right - offsetRight + 20
    // }
    // if (left === scrollLeft && top === scrollTop) {
    //   return
    // }
    // this._body.scrollContainer.scroll({
    //   left,
    //   top,
    //   behavior: scrollBehavior,
    // })
  }

  private _revealSelectionInRawEl(
    rawEl: Et.HTMLRawEditElement, toStart = true, scrollBehavior: ScrollBehavior = 'auto',
  ) {
    let top: number | undefined = 0,
      left: number | undefined = 0,
      el: HTMLInputElement | HTMLTextAreaElement,
      dummy: HTMLInputElement | HTMLTextAreaElement
    const leadingText = rawEl.value.slice(0, toStart ? rawEl.selectionStart : rawEl.selectionEnd)
    const renderDummy = (el: HTMLElement, model: HTMLElement, isWrap: boolean) => {
      // 清空cssText以去掉索引属性, style 不允许 assign 索引属性
      const cssText = model.style.cssText
      model.style.cssText = ''
      Object.assign(el.style, {
        ...model.style,
        // 这里直接设置 textWrapMode 无效, 而设置 whiteSpace 得到的结果是 text-wrap-mode
        whiteSpace: isWrap ? 'pre-wrap' : 'pre',
        position: 'fixed',
        top: '0px',
        left: '0px',
        visibility: 'hidden',
      })
      model.style.cssText = cssText
      document.body.appendChild(el)
    }
    if (rawEl.localName === 'input') {
      el = rawEl as unknown as HTMLInputElement
      dummy = document.createElement('input')
      dummy.value = leadingText
      renderDummy(dummy, el, false)
      dummy.scrollLeft = 99999 // 滚动到最右
      left = dummy.scrollLeft
    }
    else {
      el = rawEl as unknown as HTMLTextAreaElement
      dummy = document.createElement('textarea')
      dummy.value = leadingText
      const textWrapMode = getComputedStyle(el).textWrapMode as 'wrap' | 'nowrap'
      dummy.wrap = el.wrap
      renderDummy(dummy, el, textWrapMode === 'wrap')
      dummy.scrollTop = 99999 // 滚到最后
      top = dummy.scrollTop
      if (textWrapMode === 'nowrap') {
        // 非 wrap 时, 还要计算左右滚动
        let lineStart = leadingText.lastIndexOf('\n')
        if (lineStart === -1) {
          lineStart = 0
        }
        dummy.value = leadingText.slice(lineStart)
        dummy.scrollLeft = 99999
        left = dummy.scrollLeft
      }
    }

    // const { clientHeight: height, clientWidth: width, scrollTop, scrollLeft } = rawEl
    // const { scrollHeight, scrollWidth } = dummy
    // const { fontSize, lineHeight } = window.getComputedStyle(el)
    // let fs = 13, lh = 16
    // if (lineHeight.endsWith('px')) {
    //   lh = Number(lineHeight.slice(0, -2))
    // }
    // else {
    //   if (fontSize.endsWith('px')) {
    //     fs = Number(fontSize.slice(0, -2))
    //     lh = fs * 1.2
    //   }
    // }

    // 向上滚 top < scrollTop, 仅当当前光标在第个完全可见行时需要, 即未来光标所在行上边缘高于可见区域上边缘时
    //  <=> dummy.scrollHeight - lineHeight <= rawEl.scrollTop
    // 向下滚 top > scrollTop, 仅当当前光标在最后一个完全可见行时需要, 即未来光标所在行下边缘低于可见区域下边缘时
    //  <=> dummy.scrollHeight >= rawEl.scrollTop + height
    // 当文本两不足height 或 width, 时, scrollHeight 或 scrollWidth 等于 height 或 width

    // if (scrollHeight > height && scrollTop < scrollHeight - lh && scrollTop + height > scrollHeight) {
    //   top = void 0
    // }
    // if (scrollWidth > width && scrollLeft < scrollWidth - fs && scrollLeft + width > scrollWidth) {
    //   left = void 0
    // }
    // if (top === void 0 && left === void 0) {
    //   return
    // }
    rawEl.scrollTo({
      left,
      top,
      behavior: scrollBehavior,
    })
    dummy.remove()
  }

  /**
   * 扩展选区至选中当前行, 若调用时选区非 collapsed, 可能选中多行
   */
  selectSoftLine() {
    if (this._rawEl) {
      const { selectionStart: start, selectionEnd: end, value } = this._rawEl
      const len = value.length
      let i = start, j = end
      for (; i > 0; i--) {
        if (value[i - 1] === '\n') {
          break
        }
      }
      for (; j < len; j++) {
        if (value[j] === '\n') {
          break
        }
      }
      if (value[j] === '\n') {
        j++
      }
      this._rawEl.setSelectionRange(i, j, 'forward')
      return true
    }
    return !!this._selection && selectSoftLine(this._selection)
  }

  /**
   * 扩展选区至选中当前段落, 调用时若选区非 collapsed, 可能选中多个段落
   */
  selectParagraph() {
    const tr = this.getTargetRange()
    if (tr && tr.startParagraph && tr.endParagraph) {
      const r = document.createRange() as Et.Range
      tr.startParagraph.innerStartEditingBoundary().adoptToRange(r, true, false)
      tr.endParagraph.innerEndEditingBoundary().adoptToRange(r, false, true)
      return this.selectRange(r)
    }
    return false
  }

  /**
   * 扩展选区至全选当前编辑区文档内容
   * * 即 Range 范围为: et-body,0 -> et-body,et-body.childNodes.length
   */
  selectDocument() {
    if (this._body.el.childNodes.length === 0) {
      return false
    }
    const r = document.createRange() as Et.Range
    // FIXME chrome shadowDOM 内, selection 端点会自动亲和到最近的文本节点,
    // 即最终选区范围为, 首段落内开头 ~ 末段落内末尾
    // FIXME chrome 和 Safari 下, 如果首尾段落不可编辑, 则全选的::selection 样式会丢失(实际上已经全选了)
    // 在 Safari 下, 首尾段落任意一个不可编辑, 也会如此
    // 暂时用给 et-body 添加背景的方式来模拟全选的::selection
    r.setStart(this._body.el, 0)
    r.setEnd(this._body.el, this._body.el.childNodes.length)
    return this.selectRange(r)
  }

  /**
   * 渐进式全选: 光标 -> 当前行 -> 当前段落 -> 当前顶层节点 -> 文档
   */
  selectAllGradually() {
    if (this._rawEl) {
      return this._selectAllInRawEl(this._rawEl)
    }
    const tr = this.getTargetRange()
    if (!tr || this.isRangingBody) {
      return true
    }
    let level
    if (tr.collapsed) {
      if (tr.startParagraph && dom.isEmptyContentNode(tr.startParagraph)) {
        level = SelectAllLevel.Select_Paragraph
      }
      else {
        level = SelectAllLevel.No_Select_All
      }
    }
    else {
      const startP = tr.startParagraph
      const endP = tr.endParagraph
      if (startP === endP && endP) {
        if (dom.isEmptyContentNode(endP)) {
          level = SelectAllLevel.Select_Paragraph
        }
        else {
          const rects = tr.DOMRange.getClientRects()
          if (rects.length <= 1) {
            if (endP.getClientRects().length <= 1) {
              level = SelectAllLevel.Select_Paragraph
            }
            else {
              level = SelectAllLevel.Select_Soft_Line
            }
          }
          else {
            // 第一个矩形框和最后一个矩形框垂直距离小于 10px 时, 视为选中一行, 否则视为选中多行
            // 因为在同一行内有其他行内元素时, 矩形框会存在多个
            if (Math.abs(rects[0].y - rects[rects.length - 1].y) < 10) {
              level = SelectAllLevel.Select_Soft_Line
            }
            else {
              level = SelectAllLevel.Select_Paragraph
            }
          }
        }
      }
      else {
        level = SelectAllLevel.Select_Paragraph
      }
    }
    if (level === SelectAllLevel.No_Select_All) {
      return this.selectSoftLine()
    }
    if (level === SelectAllLevel.Select_Soft_Line) {
      return this.selectParagraph()
    }
    if (level === SelectAllLevel.Select_Paragraph) {
      return this.selectDocument()
    }
    return false
  }

  private _selectAllInRawEl(el: Et.HTMLRawEditElement) {
    const { selectionStart: start, selectionEnd: end, value } = el
    const len = value.length
    if (start === 0 && end === len) {
      const r = document.createRange()
      // rawEl在可编辑节点内部, 则选择 rawEl, 否则选择第一个可编辑效应父节点
      if (el.isContentEditable) {
        r.selectNode(el)
        this.selectRange(r)
        this.dispatchChange()
        return true
      }
      else {
        let etEl = this._body.findInclusiveEtParent(el)
        while (etEl && !etEl.isContentEditable) {
          etEl = this._body.findInclusiveEtParent(etEl)
        }
        if (etEl) {
          r.selectNode(etEl)
          this.selectRange(r)
          this.dispatchChange()
          return true
        }
        return false
      }
    }
    const selectedText = value.slice(start, end)
    if (selectedText.includes('\n')
      || value[start - 1] === '\n' || value[end] === '\n'
    ) {
      el.setSelectionRange(0, len, 'forward')
      return true
    }
    return this.selectSoftLine()
  }

  cloneContents() {
    if (this.isCollapsed || !this.range) {
      return document.createDocumentFragment() as Et.Fragment
    }
    return this.range.cloneContents()
  }

  /**
   * 派发 selectionchange 事件;
   * * selectionchange事件不是同步触发的, 若需要立即更新上下文, 应使用 ctx.forceUpdate方法
   */
  dispatchChange() {
    document.dispatchEvent(new Event('selectionchange'))
  }
}

// firefox 的 selectionmodify 在Range 状态下按 lineboundary 扩展选区时, 会先 collapse 到对应方向边缘, 再 extend
// 据 mdn 的说法, 早期 webkit 也是这么做的, 但后来改了, 现在是从指定方向远端开始扩展, 即'backward', 'forward'一来一回
// 就能选中当前行, 为对齐 chrome 和 Safari, 我们这里对 firefox 单独处理
const selectSoftLine = platform.isFirefox
  ? (sel: Selection) => {
      sel.modify('extend', 'backward', 'lineboundary')
      sel.collapseToStart()
      sel.modify('extend', 'forward', 'lineboundary')
      return true
    }
  : (sel: Selection) => {
      sel.modify('extend', 'backward', 'lineboundary')
      sel.modify('extend', 'forward', 'lineboundary')
      return true
    }

/**
 * 光标/选区历史记录
 */
class SelectionHistory {
  private pos = 0
  private stack: CaretRange[] = []
  constructor(
    private _sel: EtSelection,
  ) { }

  record(caretRange: CaretRange) {
    this.stack[this.pos++] = caretRange
    this.stack.length = this.pos
  }

  backward() {
    if (this.pos <= 0) {
      return
    }
    const r = this.stack[--this.pos].toRange()
    if (!r) {
      this.stack.splice(this.pos, 1)
      return
    }
    this._sel.selectRange(r)
  }

  forward() {
    if (this.pos >= this.stack.length) {
      return
    }
    const r = this.stack[this.pos++].toRange()
    if (!r) {
      this.stack.splice(this.pos - 1, 1)
      return
    }
    this._sel.selectRange(r)
  }
}
