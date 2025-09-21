/**
 * TargetRange 表示编辑区内的某个光标或范围, 是一个不可变的静态类型,
 * 若所对应位置的 DOM 内容发生改变, 这该位置对应信息将失效.
 * 为提高性能并降低内存压力, 采用 getter 方式获取位置所在的效应元素/段落等,
 * 并通过私有成员来缓存第一次的查询结果, 避免多次调用时重复查询
 */

import type { Et } from '../@types'
import { EtCaret } from './EtCaret'
import { EtRange } from './EtRange'

// 以别名方式导出内部class类型
export type EtTargetCaret = TargetCaret
export type EtTargetRange = TargetRange
export interface ValidTargetCaret extends EtTargetCaret {
  readonly collapsed: true
  readonly anchorEtElement: Et.EtElement
}
export interface ValidTargetRange extends EtTargetRange {
  readonly collapsed: boolean
  readonly startEtElement: Et.EtElement
  readonly endEtElement: Et.EtElement
}
interface _SelectionTarget {
  isCaret: () => boolean
}
export type TargetSelection = TargetRange | TargetCaret | ValidTargetCaret | ValidTargetRange
export type ValidTargetSelection = ValidTargetCaret | ValidTargetRange

class TargetCaret implements _SelectionTarget {
  declare private readonly body: Readonly<Et.EditorBody>

  // 私有缓存成员
  private _etCaret?: EtCaret
  private _anchorEtElement?: Et.EtElement | null
  private _anchorParagraph?: Et.Paragraph | null
  private _anchorTopElement?: Et.Paragraph | null
  private _isCaretAtParagraphStart?: boolean
  private _isCaretAtParagraphEnd?: boolean
  private _isCaretAtBodyStart?: boolean
  private _isCaretAtBodyEnd?: boolean
  private _isValid?: boolean

  // 兼容 StaticRange
  get startContainer() {
    return this.container
  }

  get startOffset() {
    return this.offset
  }

  get endContainer() {
    return this.container
  }

  get endOffset() {
    return this.offset
  }

  // eslint-disable-next-line @typescript-eslint/class-literal-property-style
  get collapsed() {
    return true
  }

  constructor(
    public readonly container: Et.HTMLNode,
    public readonly offset: number,
  ) { }

  isCaret(): this is TargetCaret {
    return true
  }

  /**
   * 判断当前 TargetCaret 是否为编辑区内有效的光标位置, 有效的光标位置必定有段落
   */
  isValid(): this is ValidTargetCaret {
    if (this._isValid !== void 0) {
      return this._isValid
    }
    this._isValid = this.body.isNodeInBody(this.container) && !!this.anchorEtElement
    return this._isValid
  }

  isAtText(): this is this & { container: Et.Text } {
    return this.container.nodeType === 3 /** Node.TEXT_NODE */
  }

  isAtEnd() {
    return this.offset === (this.container.nodeType === 3
      ? (this.container as Text).length
      : this.container.childNodes.length
    )
  }

  toTargetCaret(): TargetCaret extends this ? TargetCaret : ValidTargetCaret {
    return this as TargetCaret extends this ? TargetCaret : ValidTargetCaret
  }

  get etCaret(): EtCaret {
    if (!this._etCaret) {
      this._etCaret = new EtCaret(this.container, this.offset)
    }
    return this._etCaret
  }

  /**
   * 光标位置的前一个节点, 若 container 不是元素节点, 或光标在该节点内开头, 则返回 null\
   * 相当于在次光标位置按下 Backspace 键时要删除的节点
   */
  get prevNode(): Et.NodeOrNull {
    return this.container.nodeType !== 1 /** Node.ELEMENT_NODE */ // || this.offset === 0
      ? null
      : this.container.childNodes.item(this.offset - 1)
  }

  /**
   * 光标位置的后一个节点, 若 container 不是元素节点, 或光标在该节点内末尾, 则返回 null\
   * 相当于在次光标位置按下 Delete 键时要删除的节点
   */
  get nextNode(): Et.NodeOrNull {
    return this.container.nodeType !== 1 /** Node.ELEMENT_NODE */ // || this.offset === this.container.childNodes.length
      ? null
      : this.container.childNodes.item(this.offset)
  }

  /**
   * 光标所在节点(container)在`指定效应节点`下的最外层祖先 (即`指定效应节点`子节点)\
   * 若 container 就是`指定效应节点`, 则 partialNode 为其 anchorOffset 索引的子节点
   *  (仅当`指定效应节点`无子节点或选中`指定效应节点`末尾时为 null)
   */
  getPartialNode(underWhich: 'paragraph' | 'etelement' | 'topelement') {
    let underNode
    if (underWhich === 'etelement') {
      underNode = this.anchorEtElement
    }
    else if (underWhich === 'topelement') {
      underNode = this.anchorTopElement
    }
    else {
      underNode = this.anchorParagraph
    }
    return underNode
      ? this.container === underNode
        ? this.container.childNodes.item(this.offset)
        : this.body.outerNodeUnder(this.container, underNode)
      : null
  }

  /**
   * 光标所在的效应元素
   */
  get anchorEtElement(): Et.EtElement | null {
    if (this._anchorEtElement !== void 0) {
      return this._anchorEtElement
    }
    this._anchorEtElement = this.body.findInclusiveEtParent(this.container)
    return this._anchorEtElement
  }

  /**
   * 光标所在的段落, 此项非空, 则`anchorEtElement`必定非空
   */
  get anchorParagraph(): Et.Paragraph | null {
    if (this._anchorParagraph !== void 0) {
      return this._anchorParagraph
    }
    this._anchorParagraph = this.body.findInclusiveParagraph(this.anchorEtElement ?? this.container)
    return this._anchorParagraph
  }

  /**
   * 光标所在的段落, 此项非空, 则`anchorParagraph`必定非空
   */
  get anchorTopElement(): Et.Paragraph | null {
    if (this._anchorTopElement !== void 0) {
      return this._anchorTopElement
    }
    this._anchorTopElement = this.body.findTopElement(this.anchorParagraph ?? this.container)
    return this._anchorTopElement
  }

  /** 光标是否在段落内开头 */
  isCaretAtParagraphStart(): this is this & { anchorParagraph: Et.Paragraph } {
    if (this._isCaretAtParagraphStart !== void 0) {
      return this._isCaretAtParagraphStart
    }
    this._isCaretAtParagraphStart = (this.isAtText() ? this.offset === 0 : true)
      && !!this.anchorParagraph
      && this.anchorParagraph.innerStartEditingBoundary().isAffinityTo(this.etCaret)
    return this._isCaretAtParagraphStart

    // TODO check and remove
    // // 选区 collapsed 下:
    // // 1. anchorOffset==0 && focusNode 是段落
    // // 2. anchorOffset==0 && focusNode 是段落的间接 firstChild
    // if (this._caretAtParagraphStart !== void 0) {
    //   return this._caretAtParagraphStart
    // }
    // if (!this.isCollapsed || this.anchorOffset > 0 || !this.focusNode || !this._ctx.paragraphEl) {
    //   return (this._caretAtParagraphStart = false)
    // }
    // if (this._ctx.paragraphEl === this.focusNode) {
    //   return (this._caretAtParagraphStart = true)
    // }
    // if (dom.isWithinFirst(this.focusNode, this._ctx.paragraphEl)) {
    //   return (this._caretAtParagraphStart = true)
    // }
  }

  /** 光标是否在段落内结尾 */
  isCaretAtParagraphEnd(): this is this & { anchorParagraph: Et.Paragraph } {
    if (this._isCaretAtParagraphEnd !== void 0) {
      return this._isCaretAtParagraphEnd
    }
    this._isCaretAtParagraphEnd = (this.isAtText() ? this.offset === this.container.length : true)
      && !!this.anchorParagraph
      && this.anchorParagraph.innerEndEditingBoundary().isAffinityTo(this.etCaret)
    return this._isCaretAtParagraphEnd
    // TODO check and remove
    // // 1. focusNode 是段落, 且
    // //    1) anchorOffset==focusNode.childNodes.length.
    // //    2) 或anchorOffset==focusNode.childNodes.length 且.lastChild 是一个 br
    // // 2. focusNode 到段落末尾之间无其他节点, 或有且只有一个 br
    // if (this._caretAtParagraphEnd !== void 0) {
    //   return this._caretAtParagraphEnd
    // }
    // if (!this.isCollapsed || !this.focusNode || !this._ctx.paragraphEl) {
    //   return (this._caretAtParagraphEnd = false)
    // }
    // const currP = this._ctx.paragraphEl
    // if (this.focusNode === currP) {
    //   if (this.anchorOffset === currP.childNodes.length) {
    //     return (this._caretAtParagraphEnd = true)
    //   }
    //   if (this.anchorOffset === currP.childNodes.length - 1
    //     && dom.isBrElement(currP.lastChild as Et.Node)
    //   ) {
    //     return (this._caretAtParagraphEnd = true)
    //   }
    //   return (this._caretAtParagraphEnd = false)
    // }
    // if (this.anchorOffset !== dom.nodeLength(this.focusNode)) {
    //   return (this._caretAtParagraphEnd = false)
    // }
    // let brCount = 0
    // let node: Et.NullableNode = this.focusNode
    // while (node) {
    //   if (node.nextSibling) {
    //     if (dom.isBrElement(node.nextSibling)) {
    //       brCount++
    //       if (brCount > 1) {
    //         return (this._caretAtParagraphEnd = false)
    //       }
    //       node = node.nextSibling
    //       continue
    //     }
    //     else {
    //       return (this._caretAtParagraphEnd = false)
    //     }
    //   }
    //   else {
    //     node = node.parentNode
    //   }
    //   if (node === currP) {
    //     return (this._caretAtParagraphEnd = (brCount <= 1))
    //   }
    // }
    // return (this._caretAtParagraphEnd = false)
  }

  /** 光标是否在编辑区开头 */
  isCaretAtBodyStart(): boolean {
    // 获取顶层段落的 innerStartEditingBoundary 再判断一次 affinity
    // 如光标在组件节点中,
    // 组件节点的可编辑区开头到 body 开头, 可能有其他用于修饰的(不可编辑)节点
    // EtCaret.isAffinityTo 已经解决了段落内修饰节点的问题; 但尚未解决嵌套段落
    // 内存在修饰节点的问题, 即顶层节点到段落节点之间, 尚未判断
    // 如: <comp><span>标题(不可编辑)</span><p>段落</p></comp>
    // comp 是一个段落, p 也是一个段落, 而 ctx.paragraphEl 是 p
    if (this._isCaretAtBodyStart !== void 0) {
      return this._isCaretAtBodyStart
    }
    if (this.container === this.body.el && this.offset === 0) {
      return (this._isCaretAtBodyStart = true)
    }
    this._isCaretAtBodyStart = this.isCaretAtParagraphStart()
      && !!this.anchorTopElement && this.anchorTopElement === this.body.firstParagraph
      && (this.anchorTopElement === this.anchorParagraph
        || this.anchorTopElement.innerStartEditingBoundary().isAffinityTo(this.etCaret)
      )
    return this._isCaretAtBodyStart
  }

  /** 光标是否在编辑区结尾 */
  isCaretAtBodyEnd(): boolean {
    if (this._isCaretAtBodyEnd !== void 0) {
      return this._isCaretAtBodyEnd
    }
    if (this.container === this.body.el && this.offset === this.body.el.childNodes.length) {
      return (this._isCaretAtBodyEnd = true)
    }
    this._isCaretAtBodyEnd = this.isCaretAtParagraphEnd()
      && !!this.anchorTopElement && this.anchorTopElement === this.body.lastParagraph
      && (this.anchorTopElement === this.anchorParagraph
        || this.anchorTopElement.innerEndEditingBoundary().isAffinityTo(this.etCaret)
      )
    return this._isCaretAtBodyEnd
  }
}

class TargetRange implements _SelectionTarget {
  declare private readonly body: Readonly<Et.EditorBody>
  declare private readonly _TargetCaret: typeof TargetCaret
  /** 是否是后向选择 */
  // 我们在 EtSelection.getTargetRange 时使用Selection.direction来确定范围方向
  declare public isBackward: boolean | undefined

  // 私有缓存成员
  private _range?: Range
  private _etRange?: EtRange
  private _startCaret?: TargetCaret
  private _endCaret?: TargetCaret
  private _startAncestor?: Et.HTMLNodeOrNull
  private _endAncestor?: Et.HTMLNodeOrNull
  private _commonEtElement?: Et.EtElement | null
  private _startEtElement?: Et.EtElement | null
  private _endEtElement?: Et.EtElement | null
  private _startParagraph?: Et.Paragraph | null
  private _endParagraph?: Et.Paragraph | null
  private _startTopElement?: Et.Paragraph | null
  private _endTopElement?: Et.Paragraph | null
  private _isValid?: boolean

  // 兼容 StaticRange
  get startContainer() {
    return this.startNode
  }

  get endContainer() {
    return this.endNode
  }

  protected constructor(
    public readonly startNode: Et.HTMLNode,
    public readonly startOffset: number,
    public readonly endNode: Et.HTMLNode,
    public readonly endOffset: number,
    public readonly collapsed: boolean,
    public readonly commonAncestor: Et.HTMLNode,
  ) { }

  /**
   * 创建一个 EtTargetCaret 实例
   * @param container 光标所在节点
   * @param offset 光标所在节点偏移量
   */
  static createCaret(container: Et.HTMLNode, offset: number) {
    offset = Math.max(0, Math.min(offset, container.nodeType === 3
      ? (container as Text).length
      : container.childNodes.length,
    ))
    return new this.prototype._TargetCaret(container, offset)
  }

  /**
   * 创建一个 EtTargetRange 实例, 若偏移量超过节点长度, 会自适应调整到最近的合法位置;
   */
  static createRange(
    startNode: Et.HTMLNode, startOffset: number,
    endNode: Et.HTMLNode, endOffset: number,
  ) {
    const r = document.createRange()
    const isCaret = startNode === endNode && startOffset === endOffset
    startOffset = Math.max(0, Math.min(startOffset, startNode.nodeType === 3
      ? (startNode as Text).length
      : startNode.childNodes.length,
    ))
    if (isCaret) {
      r.setStart(startNode, startOffset)
      return this.fromRange(r)
    }
    endOffset = Math.max(0, Math.min(endOffset, endNode.nodeType === 3
      ? (endNode as Text).length
      : endNode.childNodes.length,
    ))
    if (startNode === endNode) {
      if (startOffset > endOffset) {
        const tmp = startOffset
        startOffset = endOffset
        endOffset = tmp
      }
    }
    else {
      r.setStart(startNode, startOffset)
      if (r.comparePoint(endNode, endOffset) < 0) {
        const tmpNode = startNode
        const tmpOffset = startOffset
        startNode = endNode
        startOffset = endOffset
        endNode = tmpNode
        endOffset = tmpOffset
      }
    }
    r.setStart(startNode, startOffset)
    r.setEnd(endNode, endOffset)
    return this.fromRange(r)
  }

  static fromRange(range: Range) {
    if (!range.commonAncestorContainer) {
      return null
    }
    const tr = new this(
      range.startContainer as Et.HTMLNode, range.startOffset,
      range.endContainer as Et.HTMLNode, range.endOffset,
      range.collapsed, range.commonAncestorContainer as Et.HTMLNode,
    )
    tr._range = range
    return tr
  }

  isCaret(): this is TargetCaret {
    return false
  }

  /**
   * 判断该 TargetRange 实例是否是编辑区内有效的范围; 有效的范围必定存在段落;
   * 在 handler 中使用 TargetRange 时, 必须先判定其 isValid 为 true, 才能使用;
   */
  isValid(): this is ValidTargetRange {
    if (this._isValid !== void 0) {
      return this._isValid
    }
    let value = this.startCaret.isValid()
    if (value && this.startNode !== this.endNode) {
      value &&= this.endCaret.isValid()
    }
    this._isValid = value
    return this._isValid
  }

  isStartAtText(): this is this & { startNode: Et.Text } {
    return this.startNode.nodeType === 3 /** Node.TEXT_NODE */
  }

  isEndAtText(): this is this & { endNode: Et.Text } {
    return this.endNode.nodeType === 3 /** Node.TEXT_NODE */
  }

  toTargetCaret(toStart = true): this extends ValidTargetRange ? ValidTargetCaret : TargetCaret {
    if (toStart) {
      return this.startCaret as this extends ValidTargetRange ? ValidTargetCaret : TargetCaret
    }
    return this.endCaret as this extends ValidTargetRange ? ValidTargetCaret : TargetCaret
  }

  get DOMRange(): Range {
    if (this._range) {
      return this._range
    }
    const r = document.createRange()
    r.setStart(this.startNode, this.startOffset)
    r.setEnd(this.endNode, this.endOffset)
    return r
  }

  /**
   * 返回该 TargetRange 实例对应的 唯一 EtRange 实例
   */
  get etRange(): EtRange {
    if (!this._etRange) {
      this._etRange = new EtRange(this.startNode, this.startOffset, this.endNode, this.endOffset)
    }
    return this._etRange
  }

  /**
   * 返回该 TargetRange 实例开始位置的 TargetCaret 对象
   */
  private get startCaret(): TargetCaret {
    if (this._startCaret) {
      return this._startCaret
    }
    if (this.collapsed && this._endCaret) {
      return this._endCaret
    }
    this._startCaret = new this._TargetCaret(this.startNode, this.startOffset)
    return this._startCaret
  }

  /**
   * 返回该 TargetRange 实例结束位置的 TargetCaret 对象
   */
  private get endCaret(): TargetCaret {
    if (this._endCaret) {
      return this._endCaret
    }
    if (this.collapsed && this._startCaret) {
      return this._startCaret
    }
    this._endCaret = new this._TargetCaret(this.endNode, this.endOffset)
    return this._endCaret
  }

  isTextCommonAncestor(): this is this & {
    commonAncestor: Et.Text
    startAncestor: Et.Text
    endAncestor: Et.Text
  } {
    return this.commonAncestor.nodeType === 3 /** Node.TEXT_NODE */
  }

  isRangeCommonAncestorHasChildNodes(): this is this & {
    commonAncestor: Et.HTMLElement
    startAncestor: Et.HTMLNode
    endAncestor: Et.HTMLNode
  } {
    return !this.collapsed && this.commonAncestor.hasChildNodes()
  }

  /**
   * 范围开端节点(startNode)在`指定效应节点`下的最外层祖先 (即`指定效应节点`子节点)\
   * 若 startNode 就是`指定效应节点`, 则 startPartialNode 为其 anchorOffset 索引的子节点
   *  (仅当`指定效应节点`无子节点或范围开端在`指定效应节点`内末尾时为 null)
   * * 该方法内部无缓存, 不要重复调用
   */
  getStartPartialNode(underWhich: 'paragraph' | 'etelement' | 'topelement') {
    return this.startCaret.getPartialNode(underWhich)
  }

  /**
   * 范围末端节点(endNode)在`指定效应节点`下的最外层祖先 (即`指定效应节点`子节点)\
   * 若 endNode 就是`指定效应节点`, 则 endPartialNode 为其 endOffset-1 索引的子节点
   *  (仅当`指定效应节点`无子节点或范围末端在`指定效应节点`内开头时为 null)
   * * 该方法内部无缓存, 不要重复调用
   */
  getEndPartialNode(underWhich: 'paragraph' | 'etelement' | 'topelement') {
    let underNode
    if (underWhich === 'etelement') {
      underNode = this.endEtElement
    }
    else if (underWhich === 'topelement') {
      underNode = this.endTopElement
    }
    else {
      underNode = this.endParagraph
    }
    // 结尾处索引值是要-1的, 因此不能直接用 endCaret.anchorPartial
    return underNode
      ? this.endNode === underNode
        ? this.endNode.childNodes.item(this.endOffset - 1)
        : this.body.outerNodeUnder(this.endNode, underNode)
      : null
  }

  /**
   * startNode 在 commonAncestor 下最外层祖先 (即 commonAncestor 的子节点) ;
   * * 当且仅当 collapsed 为 true 时, 该值为 null
   * 可通过 `isRangeCommonAncestorHasChildNodes` 来断言该值非 null
   */
  get startAncestor(): Et.HTMLNodeOrNull {
    if (this._startAncestor !== void 0) {
      return this._startAncestor
    }
    if (this.collapsed) {
      this._startAncestor = null
      return null
    }
    this._startAncestor = this.isTextCommonAncestor()
      ? this.commonAncestor
      : this.startNode === this.commonAncestor
        ? this.commonAncestor.childNodes.item(this.startOffset) as Et.HTMLNodeOrNull
        : this.body.outerNodeUnder(this.startNode, this.commonAncestor) as Et.HTMLNode
    return this._startAncestor
  }

  /**
   * 类似 startAncestor, 但表示 endNode 在 commonAncestor 下的最外层祖先;
   * * 当且仅当 collapsed 为 true 时, 该值为 null
   * 可通过 `isRangeCommonAncestorHasChildNodes` 来断言该值非 null
   */
  get endAncestor(): Et.HTMLNodeOrNull {
    if (this._endAncestor !== void 0) {
      return this._endAncestor
    }
    if (this.collapsed) {
      this._endAncestor = null
      return null
    }
    this._endAncestor = this.isTextCommonAncestor()
      ? this.commonAncestor
      : this.endNode === this.commonAncestor
        ? this.commonAncestor.childNodes.item(this.endOffset - 1) as Et.HTMLNodeOrNull
        : this.body.outerNodeUnder(this.endNode, this.commonAncestor) as Et.HTMLNode
    return this._endAncestor
  }

  /**
   * 公共效应元素祖先
   */
  get commonEtElement(): Et.EtElement | null {
    if (this._commonEtElement !== void 0) {
      return this._commonEtElement
    }
    this._commonEtElement = this.body.findInclusiveEtParent(this.commonAncestor)
    return this._commonEtElement
  }

  get startEtElement(): Et.EtElement | null {
    if (this._startEtElement !== void 0) {
      return this._startEtElement
    }
    if (this.startNode === this.endNode && this._endEtElement !== void 0) {
      this._startEtElement = this._endEtElement
      return this._startEtElement
    }
    this._startEtElement = this.startCaret.anchorEtElement
    return this._startEtElement
  }

  get endEtElement(): Et.EtElement | null {
    if (this._endEtElement !== void 0) {
      return this._endEtElement
    }
    if (this.startNode === this.endNode && this._startEtElement !== void 0) {
      this._endEtElement = this._startEtElement
      return this._endEtElement
    }
    this._endEtElement = this.endCaret.anchorEtElement
    return this._endEtElement
  }

  get startParagraph(): Et.Paragraph | null {
    if (this._startParagraph !== void 0) {
      return this._startParagraph
    }
    if (this.startNode === this.endNode && this._endParagraph !== void 0) {
      this._startParagraph = this._endParagraph
      return this._startParagraph
    }
    this._startParagraph = this.startCaret.anchorParagraph
    return this._startParagraph
  }

  get endParagraph(): Et.Paragraph | null {
    if (this._endParagraph !== void 0) {
      return this._endParagraph
    }
    if (this.startNode === this.endNode && this._startParagraph !== void 0) {
      this._endParagraph = this._startParagraph
      return this._endParagraph
    }
    this._endParagraph = this.endCaret.anchorParagraph
    return this._endParagraph
  }

  get startTopElement(): Et.Paragraph | null {
    if (this._startTopElement !== void 0) {
      return this._startTopElement
    }
    if (this.startNode === this.endNode && this._endTopElement !== void 0) {
      this._startTopElement = this._endTopElement
      return this._startTopElement
    }
    this._startTopElement = this.startCaret.anchorTopElement
    return this._startTopElement
  }

  get endTopElement(): Et.Paragraph | null {
    if (this._endTopElement !== void 0) {
      return this._endTopElement
    }
    if (this.startNode === this.endNode && this._startTopElement !== void 0) {
      this._endTopElement = this._startTopElement
      return this._endTopElement
    }
    this._endTopElement = this.endCaret.anchorTopElement
    return this._endTopElement
  }

  isCaretAtParagraphStart(): this is this & { startParagraph: Et.Paragraph, endParagraph: Et.Paragraph } {
    return this.collapsed && this.startCaret.isCaretAtParagraphStart()
  }

  isCaretAtParagraphEnd(): this is this & { startParagraph: Et.Paragraph, endParagraph: Et.Paragraph } {
    return this.collapsed && this.startCaret.isCaretAtParagraphEnd()
  }

  isCaretAtBodyStart(): boolean {
    return this.collapsed && this.startCaret.isCaretAtBodyStart()
  }

  isCaretAtBodyEnd(): boolean {
    return this.collapsed && this.startCaret.isCaretAtBodyEnd()
  }
}

/**
 * 获取 TargetRange 构造函数\
 * 为在 TargetRange 实例原型上绑定其对应的编辑区, 这里使用内部类
 * @param etBody 当前编辑器编辑区实例
 */
export const getTargetRangeCtor = (etBody: Et.EditorBody) => {
  class _TargetCaret extends TargetCaret {
    constructor(
      public readonly container: Et.HTMLNode,
      public readonly offset: number,
    ) {
      super(container, offset)
    }
  }
  class _TargetRange extends TargetRange {
    private constructor(
      public readonly startNode: Et.HTMLNode,
      public readonly startOffset: number,
      public readonly endNode: Et.HTMLNode,
      public readonly endOffset: number,
      public readonly collapsed: boolean,
      public readonly commonAncestor: Et.HTMLNode,
    ) {
      super(startNode, startOffset, endNode, endOffset, collapsed, commonAncestor)
    }
  }
  Object.defineProperty(_TargetCaret.prototype, 'body', {
    value: etBody,
  })
  Object.defineProperty(_TargetRange.prototype, 'body', {
    value: etBody,
  })
  Object.defineProperty(_TargetRange.prototype, '_TargetCaret', {
    value: _TargetCaret,
  })

  // fixed.Error TS(4094): 直接导出匿名内部类不允许private/protected 成员,
  // 于是将两个类的基本实现放外部, 内部派生新的匿名类与上下文编辑区绑定
  // 导出时再转为外部类(父类)类型
  // TODO 可用 interface 替代, 性能会稍好些, 但需要编写完整的接口类型, 否则
  // 消费端无法获取良好的类型提示
  return _TargetRange as typeof TargetRange
}
