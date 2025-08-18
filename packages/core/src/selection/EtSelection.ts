import type { Et } from '~/core/@types'

import { dom } from '../utils'
import { CaretRange } from './config'
import { cr } from './cr'

/**
 * 编辑器选区
 */
export class EtSelection {
  private _selection: Selection | null = null
  private _getSelection: () => Selection | null
  private readonly _ctx: Et.UpdatedContext

  // 使用本地语言字符串分段器, 用于计算光标位置要删除的字符/单词的长度
  private _locale: string
  private _graphemeSegmenter: Intl.Segmenter
  private _wordSegmenter: Intl.Segmenter

  /**
   * 光标位置缓存
   * 编辑器 focusout 时, 缓存光标位置; 当主动调用编辑器的 focus方法时,
   * 说明由脚本聚焦编辑器, 此时通过缓存恢复选区位置\
   * 非脚本聚焦编辑器时, 由浏览器处理新的选区位置
   */
  private _caretRange: CaretRange | null = null
  private _caretAtParagraphStart?: boolean = void 0
  private _caretAtParagraphEnd?: boolean = void 0
  private _caretAtBodyStart?: boolean = void 0
  private _caretAtBodyEnd?: boolean = void 0
  private _startEtElement: Et.EtElement | null = null
  private _endEtElement: Et.EtElement | null = null
  private _startParagraph: Et.Paragraph | null = null
  private _endParagraph: Et.Paragraph | null = null
  private _startTopElement: Et.Paragraph | null = null
  private _endTopElement: Et.Paragraph | null = null

  /** 光标是否在原生 input/textarea 内 */
  public inRaw = false
  /** 选区是否在 shadowDOM 内 */
  public inShadow: boolean
  /** 选区历史记录 */
  public history = new SelectionHistory(this)
  /** 当前选择的 Range 列表; 仅在多选区场景非空, 最后一项恒等于 range; */
  public ranges: Et.EtRange[] = []
  /** 当前选区对应的 Range */
  public range: Et.Range | null = null
  public isCollapsed = true
  /**
   * 文本锚点, 只有两种情况下非空\
   * 1. 选区 collapsed 且光标落在文本节点上\
   * 2. 选区非 collapsed, 且 range起止节点是同一文本节点
   */
  public anchorText: Et.NullableText = null
  /**
   * 当前光标基于 anchorText 节点的偏移量;\
   * 当 anchorText 为空, 且选区 collapsed 时, 该值等于 selection.focusOffset;\
   * 当 anchorText 非空, 且选区非 collapsed 时, 该值等于 range.startOffset.
   */
  public anchorOffset = 0
  /**
   * 选区终止节点, 即 selection 停下时所在节点\
   * 当选区 collapsed 且光标落在文本节点时, 该值等于 anchorText
   */
  public focusNode: Et.NullableNode = null

  /**
   * 创建一个编辑器选区对象, 当编辑器使用 ShadowDOM 时, 必须在编辑器 mount 之后调用 setSelectionGetter\
   * getSelection 函数需要 bind 在 ShadowRoot或 Document 上, 否则调用时报错
   */
  constructor(ctx: Et.EditorContext, locale = 'en-US') {
    this._ctx = ctx as Et.UpdatedContext
    this.inShadow = false
    this._getSelection = document.getSelection.bind(document)
    try {
      this._locale = locale
      this._graphemeSegmenter = new Intl.Segmenter(this._locale, { granularity: 'grapheme' })
      this._wordSegmenter = new Intl.Segmenter(this._locale, { granularity: 'word' })
    }
    catch (_e) {
      this._locale = 'en-US'
      this._graphemeSegmenter = new Intl.Segmenter(this._locale, { granularity: 'grapheme' })
      this._wordSegmenter = new Intl.Segmenter(this._locale, { granularity: 'word' })
    }
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
   * 更新选区信息, 除输入法会话内, 该方法不可单独调用, 只能通过 ctx.updateUpdate() 间接调用
   */
  update(sel?: Selection) {
    this._caretAtBodyEnd = void 0
    this._caretAtBodyStart = void 0
    this._caretAtParagraphEnd = void 0
    this._caretAtParagraphStart = void 0

    if (!sel) {
      sel = this.selection as Selection
      if (!sel || sel.rangeCount === 0) {
        this._ctx.editor.blur()
        return false
      }
    }
    const oldText = this.anchorText
    this._caretRange = null
    this.range = sel.getRangeAt(0) as Et.Range
    this.focusNode = sel.focusNode as Et.NullableNode
    this.anchorOffset = sel.focusOffset
    // 使用 range.collapsed 而非 selection.isCollapsed; 后者在 ShadowDOM 内不准（chromium 120)
    this.isCollapsed = this.range.collapsed
    if (dom.isText(this.range.endContainer)) {
      // 选区非 collapsed, 且不在同一#text上时, 让anchorText为null
      this.anchorText = this.range.startContainer === this.range.endContainer
        ? this.range.endContainer
        : null
      this.anchorOffset = this.range.startOffset
    }
    else {
      this.anchorText = null
    }

    if (!oldText || oldText !== this.anchorText) {
      this._startEtElement = null
      this._endEtElement = null
      this._startParagraph = null
      this._endParagraph = null
      this._startTopElement = null
      this._endTopElement = null
    }
    this._ctx.skipNextSelChange()
    return true
  }

  /** 选区是否是向前选择的, collapsed时始终返回true */
  get isForward() {
    if (this.isCollapsed) {
      return true
    }
    const s = this._selection
    // 使用shift+方向键 选择内容时 direction="forward"|"backward"; 使用鼠标划选时, direction="none"
    if (s && s.direction !== 'none') {
      return s.direction === 'forward'
    }
    const r = this.range
    return r && s && r.startContainer === s.anchorNode && r.startOffset === s.anchorOffset
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
   * 获取当前光标左侧(Backspace方向)的第一个“视觉字符” (双码点字符会视为一个视觉字符, 四码点字符会被视为两个视觉字符)
   * @returns 若anchorText为空, 或anchorOffset=0, 返回 undefined
   */
  get precedingChar(): string | undefined {
    if (!this.anchorText || this.anchorOffset === 0) {
      return void 0
    }
    // return [
    //   ...this.anchorText.data.slice(Math.max(0, this.anchorOffset - 4), this.anchorOffset),
    // ].pop()
    const segs = this._graphemeSegmenter.segment(this.anchorText.data.slice(0, this.anchorOffset))
    return segs.containing(this.anchorOffset - 1)?.segment
  }

  /**
   * 获取当前光标右侧(Delete方向)的第一个“视觉字符”
   * @returns 若anchorText为空, 或anchorOffset=anchorText.length, 返回 undefined
   */
  get followingChar(): string | undefined {
    if (!this.anchorText || this.anchorText.length === this.anchorOffset) {
      return void 0
    }
    // return [
    //   ...this.anchorText.data.slice(this.anchorOffset, this.anchorOffset + 4),
    // ].shift()
    const segs = this._graphemeSegmenter.segment(this.anchorText.data.slice(this.anchorOffset))
    return segs.containing(0)?.segment
  }

  /**
   * 获取当前光标左侧(Backspace方向)的1个单词; 使用当前`locale`语言分词
   */
  get precedingWord(): string | undefined {
    if (!this.anchorText || this.anchorOffset === 0) {
      return void 0
    }
    const segs = this._wordSegmenter.segment(this.anchorText.data.slice(0, this.anchorOffset))
    let prev = segs.containing(this.anchorOffset - 1)
    if (!prev) {
      return void 0
    }
    let word = prev.segment
    prev = segs.containing(prev.index - 1)
    while (prev) {
      // 将空白符与当前单词合并; Intl 分词默认将空白符单独为一个word
      // 在按住`Ctrl+Backspace`快速连续删除单词时, 会在删除`空白符word`时明显感觉到卡顿
      // 于是将空白符与附近的真实 word 合并一齐删除, 以获取视觉连贯性, 同时缩减连续删除的总耗时
      // 事实上, 在浏览器原生的deleteWordBackward 行为会在遇到空白符时, 连同空白符的左侧单词
      // 视为一个word并一齐删除; 以下代码就是模拟这一行为, 不过我们更激进一些, 将单词左右的空白符
      // 都算进去, 并且对连续递增的相同 word 也进行合并删除, 如 "空白删除删除|", 在`|`位置向左
      // 删除一个word, 会将"删除删除"一齐删除, 得到 "空白|".
      if (/\s+/.test(prev.segment) || prev.segment === word) {
        word = prev.segment + word
        prev = segs.containing(prev.index - 1)
        continue
      }
      break
    }
    return word
  }

  /**
   * 获取当前光标右侧(Delete方向)的1个单词; 使用当前`locale`语言分词
   */
  get followingWord(): string | undefined {
    if (!this.anchorText || this.anchorText.length === this.anchorOffset) {
      return void 0
    }
    const segs = this._wordSegmenter.segment(this.anchorText.data.slice(this.anchorOffset))
    let next = segs.containing(0)
    if (!next) {
      return void 0
    }
    let word = next.segment
    next = segs.containing(next.index + next.segment.length)
    while (next) {
      if (/\s+/.test(next.segment) || next.segment === word) {
        word += next.segment
        next = segs.containing(next.index + next.segment.length)
        continue
      }
      break
    }
    return word
  }

  get startEffectElement(): Et.EtElement | null {
    if (this._startEtElement) {
      return this._startEtElement
    }
    if (!this.range) {
      return null
    }
    this._startEtElement = this._ctx.findEffectParent(this.range.startContainer)
    if (this.isCollapsed) {
      this._endEtElement = this._startEtElement
    }
    return this._startEtElement
  }

  get endEffectElement(): Et.EtElement | null {
    if (this._endEtElement) {
      return this._endEtElement
    }
    if (!this.range) {
      return null
    }
    this._endEtElement = this._ctx.findEffectParent(this.range.endContainer)
    if (this.isCollapsed) {
      this._startEtElement = this._endEtElement
    }
    return this._endEtElement
  }

  get startParagraph(): Et.Paragraph | null {
    if (this._startParagraph) {
      return this._startParagraph
    }
    if (!this.range) {
      return null
    }
    this._startParagraph = this._ctx.findParagraph(
      this._startEtElement ?? this.range.startContainer,
    )
    if (this.isCollapsed) {
      this._endParagraph = this._startParagraph
    }
    return this._startParagraph
  }

  get endParagraph(): Et.Paragraph | null {
    if (this._endParagraph) {
      return this._endParagraph
    }
    if (!this.range) {
      return null
    }
    this._endParagraph = this._ctx.findParagraph(
      this._endEtElement ?? this.range.endContainer,
    )
    if (this.isCollapsed) {
      this._startParagraph = this._endParagraph
    }
    return this._endParagraph
  }

  /**
   * 选区起始位置的顶层节点
   */
  get startTopElement(): Et.Paragraph | null {
    if (this._startTopElement) {
      return this._startTopElement
    }
    if (!this.range) {
      return null
    }
    let node = this._startParagraph ?? this.range.startContainer as Et.Paragraph
    node = this._ctx.findTopElement(node)
    this._startTopElement = node
    if (this.isCollapsed) {
      this._endTopElement = node
    }
    return node
  }

  /**
   * 选区结束位置的顶层节点
   */
  get endTopElement(): Et.Paragraph | null {
    if (this._endTopElement) {
      return this._endTopElement
    }
    if (!this.range) {
      return null
    }
    let node = this._endParagraph ?? this.range.endContainer as Et.Paragraph
    node = this._ctx.findTopElement(node)
    this._endTopElement = node
    if (this.isCollapsed) {
      this._startTopElement = node
    }
    return node
  }

  /** 光标是否在段落内开头 */
  get isCaretAtParagraphStart() {
    if (this._caretAtParagraphStart !== void 0) {
      return this._caretAtParagraphStart
    }
    if (!this.isCollapsed || this.anchorOffset > 0 || !this.focusNode || !this._ctx.paragraphEl) {
      return (this._caretAtParagraphStart = false)
    }
    return (this._caretAtParagraphStart = (this.getCaretRange() as Et.EtCaret).isAffinityTo(
      this._ctx.paragraphEl.innerStartEditingBoundary())
    )

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
  get isCaretAtParagraphEnd() {
    if (this._caretAtParagraphEnd !== void 0) {
      return this._caretAtParagraphEnd
    }
    if (!this.isCollapsed || !this.focusNode || !this._ctx.paragraphEl) {
      return (this._caretAtParagraphEnd = false)
    }
    return (this._caretAtParagraphEnd = (this.getCaretRange() as Et.EtCaret).isAffinityTo(
      this._ctx.paragraphEl.innerEndEditingBoundary(),
    ))

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
  get isCaretAtBodyStart() {
    // TODO 优化, 目前的判断方式还不够完善; 如光标在组件节点中,
    // 而组件节点的可编辑区开头到 body 开头, 可能有其他用于修饰的(不可编辑)节点
    // EtCaret.isAffinityTo 已经解决了段落内修饰节点的问题; 但尚未解决嵌套段落
    // 内存在修饰节点的问题, 即顶层节点到段落节点之间, 尚未判断
    // 如: <comp><span>标题(不可编辑)</span><p>段落</p></comp>
    // comp 是一个段落, p 也是一个段落, 而 ctx.paragraphEl 是 p
    // TODO sol. 获取顶层段落的 innerStartEditingBoundary 再判断一次 affinity
    if (this._caretAtBodyStart !== void 0) {
      return this._caretAtBodyStart
    }
    if (!this.isCollapsed || !this._ctx.paragraphEl) {
      return (this._caretAtBodyStart = false)
    }
    return this._caretAtBodyStart = (
      this.isCaretAtParagraphStart
      && dom.isWithinFirst(this._ctx.paragraphEl, this._ctx.body)
    )
  }

  /** 光标是否在编辑区结尾 */
  get isCaretAtBodyEnd() {
    // TODO 优化, 目前的判断方式还不够完善
    if (this._caretAtBodyEnd !== void 0) {
      return this._caretAtBodyEnd
    }
    if (!this.isCollapsed || !this._ctx.paragraphEl) {
      return (this._caretAtBodyEnd = false)
    }
    return this._caretAtBodyEnd = (
      this.isCaretAtParagraphEnd
      && dom.isWithinLast(this._ctx.paragraphEl, this._ctx.body)
    )
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
      startContainer: this._ctx.body,
      startOffset: 0,
      endContainer: this._ctx.body,
      endOffset: 0,
    })
    this._caretRange = caret
    caret.markValid()
    return caret
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
   * 设置地区(语言)
   * @param locale 一个符合BCP 47规范的语言编码, 若不合法, 将不做改变(继续使用 platform.locale )
   * @returns 是否设置成功
   */
  setLocale(locale: string) {
    try {
      const graphemeSeg = new Intl.Segmenter(locale, { granularity: 'grapheme' })
      const wordSeg = new Intl.Segmenter(locale, { granularity: 'word' })
      this._graphemeSegmenter = graphemeSeg
      this._wordSegmenter = wordSeg
      this._locale = locale
      return true
    }
    catch (_e) {
      return false
    }
  }

  /**
   * 当光标落入input/textarea 内部, selection更新时, selection 不会包含
   * input/textarea 的内部信息; 通常情况下, selection.anchor/focus 节点
   * 是该 input/textarea节点; 但有时会是其 contenteditable=false 的祖先;
   * 因此, 当光标落入此类原生编辑节点时, 须通过该方法手动标记选区为 raw
   */
  setInRaw(inRaw: boolean) {
    this.inRaw = inRaw
  }

  /**
   * 将光标定位于node节点的相对索引处，offset<0定位到外开头，=0定位到内开头，=Infinity定位到外末尾 \
   * 若node为Text节点，则始终定位于Text文本内 \
   * * 调用此方法会导致selectionchange, 在selchange中会更新ctx和caret; 而此处会默认更新caret;
   *  而selchange是防抖的, 若希望调用此方法后立即更新ctx; 应将update参数设置为false, 并主动调用ctx.forceUpdate()
   * @param [update=true] 是否立即更新caret, 默认 true
   * @returns 是否成功更新光标位置
   */
  caretTo(node: Et.Node, offset: number, update = true): boolean {
    const sel = this.selection
    if (!sel || !node || !node.isConnected) return false

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
    return update ? this.update() : true
  }

  /**
   * 获取一个Range，其范围为从当前光标位置到目标节点; 当前光标为range，或失败返回null（如目标节点不在dom内）
   * 若Node是Text节点，则 `0 <= offset <= node.length`
   * 若Node不是Text，则 `0 <= offset <= node.childNodes.length`
   * @param update 是否同时更新选区 (选择这个range), 默认 false
   */
  rangeTo(node: Et.Node, offset: number, update = false): Et.Range | null {
    const sel = this.selection
    const originR = this.range
    if (!sel || !originR) {
      return null
    }
    const destR = originR.cloneRange()
    if (!this.isValidPosition(node, offset)) {
      return null
    }
    destR.setEnd(node, offset)
    if (destR.collapsed) {
      // 范围坍缩，说明文档树中node在this.focusNode前面
      destR.setEnd(originR.endContainer, originR.endOffset)
    }
    if (update) {
      sel.removeAllRanges()
      sel.addRange(destR)
      this.update(sel)
    }
    return destR
  }

  isValidPosition(node: Et.Node, offset: number) {
    if (!node.isConnected) return false
    if (dom.isText(node)) {
      return offset >= 0 && offset <= node.length
    }
    return offset >= 0 && offset <= node.childNodes.length
  }

  /** 选择一个范围更新到当前选区; 此方法不执行 EtSelection.update */
  selectRange(range: Range) {
    const sel = this.selection
    if (!sel) {
      return
    }
    sel.removeAllRanges()
    sel.addRange(range)
  }

  /**
   * 折叠选区, 使光标位置位于选区开头或结尾
   */
  collapse(toStart = true) {
    if (this.isCollapsed) {
      return
    }
    if (this.selection) {
      if (toStart) {
        this.selection.collapseToStart()
      }
      else {
        this.selection.collapseToEnd()
      }
      this.update()
    }
  }

  /**
   * 调用Selection.modify方法, 修改当前选区\
   * @param alter 操作类型
   * @param direction 操作方向
   * @param granularity 操作粒度
   */
  modify(alter: ModifyAlter, direction: ModifyDirection, granularity: ModifyGranularity) {
    if (this.selection) {
      (this._selection as Selection).modify(alter, direction, granularity)
    }
    if (this._ctx.forceUpdate()) {
      return this._ctx.skipNextSelChange()
    }
    return false
  }

  /**
   * 调用Selection.modify方法, 修改当前选区, 用于 extend 一次性扩展多个方向\
   * @param actions 一个二维数组, 每个子数组是调用modify的参数
   */
  modifyMulti(...actions: Parameters<Selection['modify']>[]) {
    const sel = this.selection
    if (!sel) {
      return false
    }
    for (const action of actions) {
      sel.modify(...action)
    }
    if (this._ctx.forceUpdate()) {
      return (this._ctx.skipNextSelChange())
    }
    return false
  }

  /**
   * 查找两个节点的最近公共祖先节点
   * @param stopNode 停止查找的节点, 默认为ctx.body, 即编辑器编辑区根节点
   */
  findCommonAncestor(
    oneNode: Et.HTMLNode,
    otherNode: Et.HTMLNode,
    stopNode: Et.NullableNode = this._ctx.body,
  ) {
    let node = oneNode as Et.NullableHTMLNode
    let startDepth = 0
    while (node && node !== stopNode) {
      if (node === otherNode) {
        return node
      }
      node = node.parentNode
      startDepth++
    }
    node = otherNode
    let endDepth = 0
    while (node && node !== stopNode) {
      if (node === oneNode) {
        return node
      }
      node = node.parentNode
      endDepth++
    }
    if (startDepth > endDepth) {
      for (let i = startDepth; i > endDepth; i--) {
        oneNode = oneNode.parentNode as Et.HTMLNode
      }
    }
    else if (endDepth > startDepth) {
      for (let i = endDepth; i > startDepth; i--) {
        otherNode = otherNode.parentNode as Et.HTMLNode
      }
    }
    while (oneNode && oneNode !== stopNode) {
      if (oneNode === otherNode) {
        return oneNode
      }
      oneNode = oneNode.parentNode as Et.HTMLNode
      otherNode = otherNode.parentNode as Et.HTMLNode
    }
    return null
  }

  cloneContents() {
    if (this.isCollapsed || !this.range) {
      return document.createDocumentFragment() as Et.Fragment
    }
    return this.range.cloneContents()
  }

  deleteContents() {
    if (this.isCollapsed || !this._ctx.isUpdated()) {
      return false
    }
    // return this._ctx.commonHandlers.removeRangingContents(this._ctx, true)
  }

  extractContents() {
    if (this.isCollapsed || !this.range || !this._ctx.isUpdated()) {
      return document.createDocumentFragment() as Et.Fragment
    }
    const df = this.range.cloneContents()
    // this._ctx.commonHandlers.removeRangingContents(this._ctx, true)
    return df
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
