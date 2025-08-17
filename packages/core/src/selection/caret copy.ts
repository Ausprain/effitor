// import type * as Et from '@/effitor/@types'

// import { BuiltinElName } from './@types/constant'
// import cr from './caretRange'
// import { EtParagraphElement } from './element'
// import { dom } from './utils'

// /**
//  * 光标上下文 只读对象
//  */
// export type CaretContext = Readonly<_CaretContext>
// class _CaretContext {
//   /** 光标所在文本节点，range状态或无文本节点时为null */
//   public text: Text | null = null
//   /** 光标在文本节点内的偏移量 */
//   public offset = 0
//   /** 光标停止时落点所属节点 */
//   public focusNode: Et.HTMLNode = null as any
//   public staticRange: StaticRange = null as any
//   public isCollapsed = true

//   /** 是否使用shadowDOM */
//   private isShadow = false
//   /** 获取selection对象的方法 */
//   private __getSelection: () => Selection | null
//   private __selection: Selection = null as any
//   private __range: Range = null as any

//   constructor(_getSelection?: () => Selection | null) {
//     if (_getSelection) {
//       this.__getSelection = _getSelection
//       this.isShadow = true
//     }
//     else {
//       this.__getSelection = window.getSelection.bind(window)
//     }
//   }

//   /** 获取选区文本 */
//   get selectedString() {
//     return this.isCollapsed ? '' : this.__range.toString()
//   }

//   get selection(): null | Readonly<Selection> {
//     return this.__selection
//   }

//   get range(): null | Readonly<Range> {
//     return this.__range
//   }

//   /** 选区是否是向前选择的, collapsed时始终返回true */
//   get isForward() {
//     if (this.isCollapsed) {
//       return true
//     }
//     // 使用shift+方向键 选择内容时 direction="forward"|"backward"; 使用鼠标划选时, direction="none"
//     if (this.__selection && this.__selection.direction !== 'none') {
//       return this.__selection.direction === 'forward'
//     }
//     const r = this.__range, s = this.__selection
//     return r && s && r.startContainer === s.anchorNode && r.startOffset === s.anchorOffset
//   }

//   /** 光标是否在同一节点内 */
//   get isCaretInSameNode() { return this.__range.startContainer === this.__range.endContainer }
//   /** 光标是否在节点末尾 */
//   get isCaretTailing() {
//     return this.isCollapsed && (
//       this.text
//         ? this.text.length === this.offset
//         : this.focusNode && this.focusNode.childNodes.length === this.offset
//     )
//   }

//   /** 光标是否在节点开头 */
//   get isCaretHeading() {
//     return this.isCollapsed && (
//       this.text
//         ? this.offset === 0
//         : this.focusNode && this.offset === 0
//     )
//   }

//   /** 选区是否刚好包含整个节点的内容 */
//   get isSelectWholeNodeContents() {
//     const r = this.staticRange
//     const len = r.startContainer.childNodes.length
//     return !this.isCollapsed
//       && r.startContainer === r.endContainer
//       && r.startOffset === 0 && r.endOffset === len
//   }

//   /**
//      * 更新光标信息
//      */
//   update(sel?: Selection): boolean {
//     if (!sel) {
//       sel = this.__selection || this.__getSelection()
//       if (!sel || !sel.focusNode) {
//         console.warn('selection or focusNode is null', sel)
//         return false
//       }
//       this.__selection = sel
//     }
//     if (!sel.rangeCount) {
//       import.meta.env.DEV && console.error('caret update failed: no range')
//       return false
//     }
//     const r = sel.getRangeAt(0)
//     if (cr.isEqual(r, this.staticRange)) {
//       return true
//     }
//     this.__range = r
//     this.text = dom.isTextNode(sel.focusNode) ? sel.focusNode : null
//     this.offset = sel.focusOffset
//     this.focusNode = sel.focusNode as Et.HTMLNode
//     this.staticRange = cr.fromRange(r)
//     // selection.isCollapsed 在shadowDOM内不准（chromium 120）
//     // this.isCollapsed = sel.isCollapsed
//     this.isCollapsed = r.collapsed
//     return true
//   }

//   /**
//      * 使用Selection.modify方法移动光标，该方法会触发selectionchange
//      * 该方法内会自动update更新当前光标信息
//      * @param argsArr Selection.modify参数元组; 传入多个元组则调整多次光标
//      *
//      * ref. [Selection.modify](https://developer.mozilla.org/zh-CN/docs/Web/API/Selection/modify) with `ctx.selection` and `ctx.forceUpdate`
//     */
//   modify(...argsArr: Parameters<Selection['modify']>[]) {
//     const sel = this.__selection || this.__getSelection()
//     if (!sel || !Array.isArray(argsArr[0])) return false
//     for (const args of argsArr) {
//       sel.modify(...args)
//     }
//     this.update()
//     return true
//   }

//   /** 仅选区状态下执行 */
//   collapse(toStart = true) {
//     if (this.isCollapsed) return
//     if (this.isShadow) {
//       //* shadow内会产生 selection.getRangeAt(0) !== selection.getRangeAt(0) 的现象, 因此使用range.collapse会无效
//       if (this.__selection) {
//         toStart ? this.__selection.collapseToStart() : this.__selection.collapseToEnd()
//         this.update()
//       }
//     }
//     else {
//       this.__range.collapse(toStart)
//       this.update()
//     }
//   }

//   /**
//      * 将光标定位于node节点的相对索引处，offset<0定位到外开头，=0定位到内开头，=Infinity定位到外末尾 \
//      * 若node为Text节点，则始终定位于Text文本内 \
//      * * 调用此方法会导致selectionchange, 在selchange中会更新ctx和caret; 而此处会默认更新caret;
//      *  而selchange是防抖的, 若希望调用此方法后立即更新ctx; 则须将update参数设置为false, 并主动调用ctx.forceUpdate()
//      * @param [update=true] 是否立即更新caret
//      */
//   collapseTo(node: Et.NullableNode, offset: number, update = true): void {
//     const sel = this.__selection
//     const r = sel.rangeCount && sel.getRangeAt(0)
//     if (!node || !r || !node.parentNode) return
//     if (offset < 0) {
//       r.selectNode(node)
//       r.collapse(true)
//     }
//     else if (offset > (node.nodeType === Node.TEXT_NODE ? (node as Text).length : node.childNodes.length)) {
//       r.selectNode(node)
//       r.collapse(false)
//     }
//     else {
//       sel.collapse(node, offset)
//       if (update) this.update()
//       return
//     }
//     sel.removeAllRanges()
//     sel.addRange(r)
//     if (update) this.update()
//   }

//   /**
//      * 返回一个选择了node的range，select=true时更新selection \
//      * fixme shadowRoot内 selection, 会在选择一个Range时, 会拷贝一份并自动将startContainer转移到最近一个等价的#text节点内边界
//      */
//   selectNode<S extends boolean>(node: Node, select: S): S extends false ? Range : Range | null {
//     const r = document.createRange()
//     r.selectNode(node)
//     console.log('select node: ', r)
//     if (!select) {
//       return r
//     }
//     const sel = this.__selection
//     if (!sel) return null as any
//     const __r = this.__range
//     try {
//       sel.removeAllRanges()
//       sel.addRange(r)
//       this.update(sel)
//       return r
//     }
//     catch (error) {
//       import.meta.env.DEV && console.error(error)
//       sel.removeAllRanges()
//       sel.addRange(__r)
//       return null as any
//     }
//   }

//   /** 返回一个选择了node内容的range，select=true时更新selection */
//   selectNodeContents<S extends boolean>(node: Node, select: S): S extends false ? Range : Range | null {
//     const r = document.createRange()
//     r.selectNodeContents(node)
//     if (!select) {
//       return r
//     }
//     const sel = this.__selection
//     if (!sel) return null as any
//     const __r = this.__range
//     try {
//       sel.removeAllRanges()
//       sel.addRange(r)
//       this.update(sel)
//       return r
//     }
//     catch (error) {
//       import.meta.env.DEV && console.error(error)
//       sel.removeAllRanges()
//       sel.addRange(__r)
//       return null as any
//     }
//   }

//   /**
//      * 根据range, 改变光标位置,
//      * * 若range对应节点不在dom上，则什么也不做
//      * @param anyRange 指定新的光标位置, 可以是`Range, StaticRange, Dynamic`
//      * @param update 是否立即更新Caret上下文信息
//      * @returns 是否改变了光标位置
//      */
//   selectRange(anyRange: AbstractRange, update = true): boolean {
//     const sel = this.__selection
//     if (!sel) return false
//     const r = cr.toRange(anyRange)
//     if (!r) return false
//     sel.removeAllRanges()
//     sel.addRange(r) // 若range在可编辑#text节点边缘, 则selection会自动定位到该#text节点
//     if (update) {
//       this.update(sel)
//     }
//     return true
//   }

//   cloneRange() {
//     return this.__range.cloneRange()
//   }

//   cloneContents() {
//     return this.__range.cloneContents()
//   }

//   extractContents() {
//     return this.__range.extractContents()
//   }

//   /**
//      * 选区起始位置的顶层节点
//      */
//   get startTopElement(): EtParagraphElement {
//     let node = this.staticRange.startContainer
//     while (node && node.parentElement?.nodeName !== BuiltinElName.ET_BODY_UPPER) {
//       node = node.parentElement as any
//     }
//     return node as EtParagraphElement
//   }

//   /**
//      * 选区结束位置的顶层节点
//      */
//   get endTopElement(): EtParagraphElement {
//     let node = this.staticRange.endContainer
//     while (node && node.parentElement?.nodeName !== BuiltinElName.ET_BODY_UPPER) {
//       node = node.parentElement as any
//     }
//     return node as EtParagraphElement
//   }

//   /** 光标前文本，当光标不在Text节点上时，返回null */
//   get precedingText(): string | null {
//     return this.text ? this.text.data.slice(0, this.offset) : null
//   }

//   /** 光标后文本，同precedingText */
//   get followingText(): string | null {
//     return this.text ? this.text.data.slice(this.offset) : null
//   }

//   /** 获取光标在文档树前一个节点(可能包含不可编辑节点), 选区状态下返回null */
//   get prevNode(): Et.HTMLNode | null {
//     if (!this.isCollapsed) return null
//     let prevNode
//     if (this.text) {
//       prevNode = this.text.previousSibling
//       prevNode = prevNode ? dom.innermostEndingNode(prevNode) : dom.treePrevNode(this.text)
//     }
//     else if (this.offset) {
//       prevNode = this.focusNode.childNodes.item(this.offset - 1)
//       prevNode = dom.innermostEndingNode(prevNode)
//     }
//     else {
//       prevNode = dom.treePrevNode(this.focusNode)
//     }
//     return prevNode as Et.HTMLNode
//   }

//   /** 获取光标在文档树后一个节点(可能包含不可编辑节点), 选区状态下返回null */
//   get nextNode(): Et.HTMLNode | null {
//     if (!this.isCollapsed) return null
//     let nextNode
//     if (this.text) {
//       nextNode = this.text.nextSibling
//       nextNode = nextNode ? dom.innermostStartingNode(nextNode) : dom.treeNextNode(this.text)
//     }
//     else if (this.offset < this.focusNode.childNodes.length - 1) {
//       nextNode = this.focusNode.childNodes.item(this.offset + 1)
//       nextNode = dom.innermostStartingNode(nextNode)
//     }
//     else {
//       nextNode = dom.treeNextNode(this.focusNode)
//     }
//     return nextNode as Et.HTMLNode
//   }

//   /**
//      * 判断当前选区级别
//      * ```ts
//      * 0: 光标或同一段落内
//      * 1: 跨段落, 但同一顶层节点
//      * 2: 不同顶层节点
//      * ```
//      */
//   get rangeLevel() {
//     if (this.isCollapsed) {
//       return 0
//     }
//     if (dom.findParagraph(this.staticRange.startContainer) === dom.findParagraph(this.staticRange.endContainer)) {
//       return 0
//     }
//     else if (this.startTopElement === this.endTopElement) {
//       return 1
//     }
//     return 2
//   }
// }
// export const createCaretContext = (...args: ConstructorParameters<typeof _CaretContext>) => {
//   return new _CaretContext(...args) as CaretContext
// }
