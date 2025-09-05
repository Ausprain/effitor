import type { Et } from '../@types'
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

  /**
   * 选区是否被冻结, 冻结后, 执行命令将不会更新选区
   */
  // private _isFrozen = false
  private _isForward: boolean | undefined
  private _commonEtElement: Et.EtElement | null | undefined
  private _focusEtElement: Et.EtElement | null | undefined
  private _focusParagraph: Et.Paragraph | null | undefined
  private _focusTopElement: Et.Paragraph | null | undefined
  /** 光标若在原生 input/textarea 内, 则该属性为该 input/textarea 节点; 否则为 null */
  private _rawEl: HTMLInputElement | HTMLTextAreaElement | null = null
  private _revealIdleCallbackId = 0

  /**
   * 全选等级, 1 全选当前行, 2 全选当前段落, 3 全选文档,
   */
  private _selectAllLevel: SelectAllLevel = 0

  /** 选区是否在 shadowDOM 内 */
  public inShadow: boolean
  /** 选区历史记录 */
  public history = new SelectionHistory(this)
  /** 当前选择的 Range 列表; 仅在多选区场景非空, 最后一项恒等于 range; */
  public ranges: Et.TargetRange[] = []
  /** 当前选区对应的 Range */
  public range: Et.Range | null = null
  public isCollapsed = true

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
    if (this._targetRange && this._targetRange.isTextCommonAncestor()) {
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
    // console.warn('et sel update')
    const sel = this.selection
    if (!sel || sel.rangeCount === 0) {
      return false
    }
    const oldText = this.anchorText
    this.range = sel.getRangeAt(0) as Et.Range
    // 使用 range.collapsed 而非 selection.isCollapsed; 后者在 ShadowDOM 内不准（chromium 120)
    this.isCollapsed = this.range.collapsed
    this._caretRange = null
    this._targetRange = this.TargetRange.fromRange(this.range)

    this._isForward = void 0
    if (!oldText || oldText !== this.anchorText) {
      this._commonEtElement = void 0
      this._focusEtElement = void 0
      this._focusParagraph = void 0
      this._focusTopElement = void 0
    }
    return true
  }

  /**
   * 获取当前选区范围内的文本内容
   */
  get selectedTextContent() {
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

  /**
   * 获取光标位置对应的 CaretRange 对象, 获取时会创建一个缓存,
   * 该缓存在下一次 update 之前存活
   * @returns 一个 CaretRange 对象; 若 this.isCollapsed==true, 返回的是 EtCaret, 否则 EtRange
   */
  getCaretRange() {
    let caret = this._caretRange
    if (caret) {
      return caret
    }
    caret = cr.fromRange(this.range ?? {
      collapsed: true,
      startContainer: this._body.el,
      startOffset: 0,
      endContainer: this._body.el,
      endOffset: 0,
    })
    this._caretRange = caret
    caret.markValid()
    return caret
  }

  /**
   * 从 EtCaretRange 构建一个 EtTargetCaret 实例, 若不存在或不合法, 返回 null
   * @param caretRange EtCaretRange 实例
   */
  createTargetCaret(caretRange: Et.CaretRange): ValidTargetCaret | null
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
  createTargetCaret(target: Et.HTMLNode | Et.CaretRange | Range, offset?: number): ValidTargetCaret | null {
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
  createTargetRange(caretRange: Et.CaretRange): ValidTargetRange | null
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
    rangeOrStartNode: Et.HTMLNode | Range | Et.CaretRange, startOffset?: number,
    endNode?: Et.HTMLNode, endOffset?: number,
  ): Et.ValidTargetRange | null {
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
   * 获取当前选区目标光标对象; 若选区非collapsed 或光标位置不存在或不合法, 返回 null
   */
  getTargetCaret() {
    const range = this.getTargetRange()
    if (!range || !range.collapsed) {
      return null
    }
    return range.toTargetCaret()
  }

  /**
   * 获取当前选区目标范围对象; 若选区范围不存在或不合法, 返回 null
   * * 该选区可能是 collapsed 的; 可通过其.toTargetCaret()方法获取对应合法光标位置
   */
  getTargetRange() {
    if (!this._targetRange || !this._targetRange.isValid()) {
      return null
    }
    if (!this.isForward) {
      this._targetRange.isBackward = true
    }
    return this._targetRange
  }

  /**
   * 检查一个选区目标是合法的光标还是范围, 并执行相应的回调函数
   * @param target 选区目标
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
   * 因此, 当光标落入此类原生编辑节点时, 须通过该方法手动标记选区为 raw; 并通过
   * this.rawEl 是否为空来判断选区是否在原生编辑节点内
   *
   * 该方法在 selectionchange 内调用, 通过 event.target 来判断光标是否落入原生编辑节点内
   */
  setInRaw(el: HTMLInputElement | HTMLTextAreaElement | null = null) {
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
   * @param [reveal=true] 是否保证光标显示在视口内
   */
  collapse(toStart = true, reveal = true) {
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
      // 范围坍缩，说明文档树中node在this.focusNode前面
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
  isValidRange(tr: Et.StaticRange) {
    return this._body.isNodeInBody(tr.startContainer) && this._body.isNodeInBody(tr.endContainer)
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
    return true
  }

  /**
   * 同 {@link revealSelection}, 但是同步执行
   */
  revealSelectionSync(toStart = true, scrollBehavior: ScrollBehavior = 'auto') {
    this._revealIdleCallbackId = 0
    // 光标在原生编辑节点 (input/textarea) 内时, range.getBoundingClientRect返回的 rect 全为 0
    if (!this.range || this._rawEl) {
      return
    }
    const rects = this.range.getClientRects()
    let rect = rects[toStart ? 0 : rects.length - 1]
    if (!rect) {
      // fixed. 若光标collapsed在节点边缘(类似光标在input/textarea 内的情况), rects 可能为空 ()
      let anchorEl = this.range.endContainer.childNodes.item(this.range.endOffset)
      if (!anchorEl) {
        anchorEl = this.range.endContainer.hasChildNodes()
          ? this.range.endContainer.lastChild as Et.Node
          : this.range.endContainer
      }
      if (!dom.isElement(anchorEl)) {
        anchorEl = anchorEl.parentElement as Et.Element
      }
      if (!anchorEl) {
        return
      }
      rect = anchorEl.getBoundingClientRect()
    }
    const scrollContainer = this._body.scrollContainer
    const { scrollLeft, scrollTop } = scrollContainer
    let offsetTop, offsetBottom, offsetLeft, offsetRight
    if (scrollContainer === document.documentElement) {
      offsetTop = 0
      offsetBottom = window.innerHeight
      offsetLeft = 0
      offsetRight = window.innerWidth
    }
    else {
      const offsetRect = scrollContainer.getBoundingClientRect()
      offsetTop = Math.min(0, offsetRect.top)
      offsetBottom = Math.max(window.innerHeight, offsetRect.bottom)
      offsetLeft = Math.min(0, offsetRect.left)
      offsetRight = Math.max(window.innerWidth, offsetRect.right)
    }

    let left = scrollLeft, top = scrollTop
    if (rect.top < offsetTop) {
      top += rect.top - 20 // 多加 20 不至于紧贴边缘
    }
    if (rect.left < offsetLeft) {
      left += rect.left - 20
    }
    if (rect.bottom > offsetBottom) {
      top += rect.bottom - offsetBottom + 20
    }
    if (rect.right > offsetRight) {
      left += rect.right - offsetRight + 20
    }
    if (left === scrollLeft && top === scrollTop) {
      return
    }
    this._body.scrollContainer.scroll({
      left,
      top,
      behavior: scrollBehavior,
    })
    return true
  }

  /**
   * 扩展选区至选中当前行, 若调用时选区非 collapsed, 可能选中多行
   */
  selectSoftLine() {
    return this.modifyMulti([
      ['extend', 'backward', 'lineboundary'],
      ['extend', 'forward', 'lineboundary'],
    ])
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
   */
  selectDocument() {
    const firstParagraph = this._body.firstParagraph
    const lastParagraph = this._body.lastParagraph
    if (firstParagraph && lastParagraph) {
      const r = document.createRange() as Et.Range
      firstParagraph.innerStartEditingBoundary().adoptToRange(r, true, false)
      lastParagraph.innerEndEditingBoundary().adoptToRange(r, false, true)
      return this.selectRange(r)
    }
    return false
  }

  /**
   * 渐进式全选: 光标 -> 当前行 -> 当前段落 -> 当前顶层节点 -> 文档
   */
  selectAllGradually() {
    const tr = this.getTargetRange()
    if (!tr) {
      return false
    }
    if (tr.collapsed) {
      this._selectAllLevel = SelectAllLevel.No_Select_All
    }
    else {
      const startP = tr.startParagraph
      const endP = tr.endParagraph
      if (startP === endP && endP) {
        if (tr.DOMRange.getClientRects().length > 1
          && this._selectAllLevel < SelectAllLevel.Select_Soft_Line
        ) {
          this._selectAllLevel = SelectAllLevel.Select_Soft_Line
        }
        else if (endP.getClientRects().length === 1) {
          this._selectAllLevel = SelectAllLevel.Select_Paragraph
        }
      }
      else if (this._selectAllLevel < SelectAllLevel.Select_Soft_Line) {
        this._selectAllLevel = SelectAllLevel.Select_Soft_Line
      }
    }
    if (this._selectAllLevel === SelectAllLevel.Select_Document) {
      return true
    }
    if (this._selectAllLevel === SelectAllLevel.No_Select_All) {
      this._selectAllLevel++
      return this.selectSoftLine()
    }
    if (this._selectAllLevel === SelectAllLevel.Select_Soft_Line) {
      this._selectAllLevel++
      return this.selectParagraph()
    }
    if (this._selectAllLevel === SelectAllLevel.Select_Paragraph) {
      this._selectAllLevel++
      return this.selectDocument()
    }
    return false
  }

  /**
   * 在 selectionchange 事件中调用, 清除全选等级
   */
  clearSelectAllLevel() {
    this._selectAllLevel = 0
  }

  cloneContents() {
    if (this.isCollapsed || !this.range) {
      return document.createDocumentFragment() as Et.Fragment
    }
    return this.range.cloneContents()
  }
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
