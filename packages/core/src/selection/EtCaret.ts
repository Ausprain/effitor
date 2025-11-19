/**
 * 在 DOM 中"脱字符"caret只能落在可编辑的文本内或节点边缘;
 * 这里使用 EtCaret 来代指编辑器内的选区collapsed 时的光标位置
 */

import { HtmlCharEnum } from '@effitor/shared'

import type { Et } from '../@types'
import { dom, traversal } from '../utils'
import { CaretRange } from './CaretRange'
import { type AnchorOffset } from './config'
import type { EtRange } from './EtRange'

/**
 * 选区光标
 */
export class EtCaret extends CaretRange {
  /**
   * 光标锚点
   */
  private _anchor: Et.Node
  /**
   * 光标偏移量
   */
  private _offset: AnchorOffset
  /**
   * 构建一个基于锚点偏移的 EtCaret 光标位置
   */
  constructor(
    anchor: Et.Node,
    offset: AnchorOffset,
    /**
     * 是否调用过或由 toTextAffinity 方法转换过; 避免一个光标对象重复调用此方法
     */
    private _isTextAffinity?: boolean,
  ) {
    super()
    this._anchor = anchor
    this._offset = offset
  }

  get anchor() {
    return this._anchor
  }

  get offset() {
    return this._offset
  }

  /**
   * 光标是否落在节点内
   */
  get isAnchorIn() {
    return Number.isFinite(this.offset)
  }

  /**
   * 光标是否落在节点外, 且在节点前
   */
  get isAnchorBefore() {
    return this.offset === -Infinity
  }

  /**
   * 光标是否落在文本节点中间
   */
  get isSurroundText() {
    return dom.isText(this.anchor) && this.offset > 0 && this.offset < this.anchor.length
  }

  /**
   * 当前指定光标位置是否已连接(在页面上), 访问该属性时,
   * 在页面上的相对光标位置会被转换为绝对位置
   */
  get isConnected() {
    if (this.__connected) {
      return true
    }
    if (this._anchor.isConnected) {
      this.toReality()
      return this.__connected = true
    }
    return this.__connected = false
  }

  private toReality() {
    if (this.isAnchorIn) {
      this._offset = Math.max(0, Math.min(this.offset, dom.nodeLength(this._anchor)))
      return
    }
    if (!this._anchor.parentNode) {
      return
    }
    const anchor = this._anchor
    this._anchor = this._anchor.parentNode
    if (this.isAnchorBefore) {
      this._offset = dom.prevSiblingCount(anchor)
    }
    else {
      this._offset = dom.prevSiblingCount(anchor) + 1
    }
  }

  /**
   * 返回一个新的光标位置, 为移动当前光标位置后的结果;
   * 若 offset 为 0, 返回caret自身
   * 若 offset 为负数, 则返回当前光标位置之前的 offset 个位置;
   * 若 offset 为正数, 则返回当前光标位置之后的 offset 个位置;
   * 若 offset 超出了当前光标锚点的范围, 则使用锚点内开头或结尾位置;
   */
  moved(offset: number): EtCaret {
    if (offset === 0) {
      return this
    }
    let newOffset = this.offset + offset
    if (newOffset < 0) {
      newOffset = 0
    }
    else if (newOffset > (offset = dom.nodeLength(this.anchor))) {
      newOffset = offset
    }
    return new EtCaret(this.anchor, newOffset)
  }

  toCaret(): Et.EtCaret {
    return this
  }

  toRange() {
    if (!this.isConnected) {
      return null
    }
    const r = document.createRange() as Et.Range
    // r初始位置在 Document 开头, 只设置开始位置即可
    // toReality 已经保证 offset位置合法
    r.setStart(this.anchor, this.offset)
    return r
  }

  /** 让一个 range应用这个光标位置 */
  adoptToRange(r: Range, setToStart = true, setToEnd = true) {
    if (!this.isConnected) {
      return
    }
    if (setToStart) r.setStart(this.anchor, this.offset)
    if (setToEnd) r.setEnd(this.anchor, this.offset)
  }

  /**
   * 对比两个光标位置, 相同返回 0 , 当前caret 在文档树位置靠前返回 负数, 否则返回 正数
   */
  compareTo(other: EtCaret) {
    if (this.anchor === other.anchor) {
      return this.offset - other.offset
    }
    let thisNode = dom.isText(this.anchor) ? this.anchor : this.anchor.childNodes.item(this.offset)
    let otherNode = dom.isText(other.anchor)
      ? other.anchor
      : other.anchor.childNodes.item(other.offset)
    if (!thisNode) {
      thisNode = this.anchor
    }
    if (!otherNode) {
      otherNode = other.anchor
    }
    return (thisNode.compareDocumentPosition(otherNode) & 2 /** Node.DOCUMENT_POSITION_PRECEDING */)
      ? -1
      : 1
  }

  isCaret(): this is EtCaret {
    return true
  }

  isEqualTo(other: EtCaret | EtRange) {
    return other.isCaret()
      && this.anchor === other.anchor
      && this.offset === other.offset
  }

  /**
   * 判断与另一个光标位置是否位于同一亲和位置;\
   * 亲和位置: 若 range 从一个光标位置开始到另一个光标位置结束,
   * 该 range 选择的文本内容为空, 或完全选择的节点数量为 0, 则称这两个光标位置"亲和(Affinity)"(位于同一亲和位置);
   * * 该 Affinity 与 Blink 中的概念不全相同; 在 blink 中, 当前块节点内开头和前一块节点内末尾不会被视为同一位置;
   *    并且会考虑 css dispaly table 等其他布局问题, 非常复杂; 此处只在文档树层面上,
   *    依据两位置之间是否有文本或节点来判断是否属于同一位置
   * @example
   * <div>AA^<b>|<i>I</i>BB</b>CC</div>
   * ^ 和 | 被视为同一亲和位置; | 和 I 不是亲和位置
   */
  isAffinityTo(other: EtCaret) {
    // 同一节点位置, 返回 true
    if (this.isEqualTo(other)) {
      return true
    }
    if (this.anchor === other.anchor && this.anchor.textContent === HtmlCharEnum.ZERO_WIDTH_SPACE) {
      return true
    }
    // 不在同一节点位置, 却在文本节点中间, 返回 false
    if (this.isSurroundText || other.isSurroundText) {
      return false
    }
    /**
     * 亲和位置判断算法:
     * @example
     * <div>
     *  <p1>AA</p1>
     *  <p2>BB<b>CC</b>DD</p2>
     *  <p3><i>EE</i>FF<br></p3>
     * </div>
     *
     * `->`代表`traversal.innermostPosition`的过程
     * `=>`代表`traversal.treeNextSibling`的过程
     *
     * 亲和组1: (BB, 0)
     *    (div, 1) -> (p2, 0) -> (BB, 0)
     *    (p2, 0) -> (BB, 0)
     *    (BB, 0)
     *    (p1, 1) -> (AA, 2) => (p2, 0) -> (BB, 0)
     *    (AA, 2) => (BB, 0)
     *
     * 亲和组2: (EE, 0)
     *    (div, 2) -> (p3, 0) -> (i, 0) -> (EE, 0)
     *    (p2, 3) -> (DD, 2) => (p3, 0) -> (i, 0) -> (EE, 0)
     *    (p3, 0) -> (i, 0) -> (EE, 0)
     *    (i, 0) -> (EE, 0)
     *    (EE, 0)
     *
     * 亲和组3: (br, 0)
     *    (FF, 2) => (br, 0)
     *    (br, 0)
     *    (p3, 2) -> (br, 0)
     *    // 非亲和
     *    (p3, 3) -> (br, 1)
     *
     */
    // 1. 将定位到节点外的位置, 转为节点内的亲和位置
    const { container: thisNode, offset: thisOffset } = traversal.innermostPosition(this.anchor,
      this.isAnchorIn
        ? this.offset
        : this.isAnchorBefore
          ? 0
          : dom.nodeLength(this.anchor),
    )
    const { container: otherNode, offset: otherOffset } = traversal.innermostPosition(other.anchor,
      other.isAnchorIn
        ? other.offset
        : other.isAnchorBefore
          ? 0
          : dom.nodeLength(other.anchor),
    )
    // 2. 比较两个光标位置是否位于同一亲和位置
    if (thisNode === otherNode) {
      if (thisNode.textContent === HtmlCharEnum.ZERO_WIDTH_SPACE) {
        return true
      }
      return thisOffset === otherOffset
    }
    // 3. 同时在各自锚点开头或结尾, 返回 false
    let former, latter
    if (thisOffset === 0) {
      if (otherOffset === 0) {
        // 都在开头
        return false
      }
      former = otherNode
      latter = thisNode
    }
    else {
      if (otherOffset !== 0) {
        // 都在末尾
        return false
      }
      former = thisNode
      latter = otherNode
    }
    // 4. 找光标位于末尾的节点的下一文档树兄弟的最内起始亲和位置
    former = traversal.treeNextSibling(former)
    if (!former) {
      return false
    }
    former = traversal.innermostPosition(former, 0).container
    return former === latter
  }

  /**
   * 返回与该光标位置等价的文本亲和位置
   * * 若锚点尚未在页面上, 则返回自身
   * * 若本身在文本节点内部, 则返回自身
   * * 锚点是 br, 若定位到 br 内或 br 前, 则亲和到 br 前兄弟末尾; 否则后兄弟开头; 无该兄弟则以父节点定位
   * * 若锚点不可编辑, 则不会进入锚点内部, 并向外查找最近的可编辑祖先
   * @example
   * <p>AA<b>BB</b>|</p>  ->  <p>AA<b>BB|</b></p>
   */
  toTextAffinity() {
    if (this._isTextAffinity) {
      return this
    }
    // 光标在#text上的情况占大多数, 此项判断放最前
    if (dom.isText(this.anchor)) {
      if (this.offset >= 0) {
        this._isTextAffinity = true
        return this
      }
      if (this.isAnchorBefore) {
        return new EtCaret(this.anchor, 0, true)
      }
      return new EtCaret(this.anchor, this.anchor.length, true)
    }
    if (!this.anchor.isConnected) {
      // this._isTextAffinity = true
      return this
    }
    // 定位到节点外, 则优先判断是否接壤文本节点
    if (!this.isAnchorIn) {
      if (this.isAnchorBefore) {
        // 定位到节点外开头, 判断前一个节点是否为#text
        const prev = this.anchor.previousSibling
        if (prev && dom.isText(prev)) {
          return new EtCaret(prev, prev.length, true)
        }
      }
      // 定位到节点外结尾, 判断后一个节点是否为#text或 br
      const next = this.anchor.nextSibling
      if (next) {
        if (dom.isText(next)) {
          return new EtCaret(next, 0, true)
        }
        if (dom.isBrElement(next)) {
          // isConnected 必定存在父节点
          return new EtCaret(next.parentNode as Et.Node, dom.prevSiblingCount(next), true)
        }
      }
    }
    // 基于可编辑 html元素, 向内查找
    let anchor, offset = 0
    if (dom.isHTMLElement(this.anchor) && this.anchor.isContentEditable) {
      const len = dom.nodeLength(this.anchor)
      if (this.anchor.hasChildNodes()) {
        if (this.offset <= 0) {
          anchor = traversal.innermostEditableFirstChild(this.anchor)
          offset = 0
        }
        else if (this.offset >= len) {
          anchor = traversal.innermostEditableLastChild(this.anchor)
          offset = dom.nodeLength(anchor)
        }
        else {
          anchor = traversal.innermostEditableFirstChild(this.anchor.childNodes.item(this.offset))
          offset = 0
        }
      }
      else {
        anchor = this.anchor
        offset = this.offset
      }
      if (anchor.localName === 'br') {
        // 只有明确在br 后, 才亲和到 br 后节点, 否则均向 br 前看齐
        if (this._offset === Infinity) {
          if (!anchor.nextSibling) {
            // connected 必定存在父节点
            return new EtCaret(anchor.parentNode as Et.HTMLElement, dom.prevSiblingCount(anchor) + 1, true)
          }
          // 下一个节点是br, 定位到下一个br 前, 即当前br 后
          if (dom.isBrElement(anchor.nextSibling)) {
            return new EtCaret(anchor.parentNode as Et.Node, dom.prevSiblingCount(anchor) + 1, true)
          }
          anchor = traversal.innermostEditableFirstChild(anchor.nextSibling)
          offset = 0
        }
        // 在 br 内部或在 br 前
        else /** if (offset >= 0 || offset === AnchorOutOffset.Before) */ {
          if (!anchor.previousSibling) {
            return new EtCaret(anchor.parentNode as Et.HTMLElement, dom.prevSiblingCount(anchor), true)
          }
          anchor = traversal.innermostEditableLastChild(anchor.previousSibling)
          offset = dom.nodeLength(anchor)
        }
      }
      if (dom.isText(anchor)) {
        return new EtCaret(anchor, offset, true)
      }
      if ((anchor as HTMLElement).isContentEditable) {
        return new EtCaret(anchor, offset, true)
      }
      return new EtCaret(anchor, offset === 0 ? -Infinity : Infinity, true)
    }
    // 不可编辑, 按文档树顺序找最近可编辑的文本节点
    if (this._offset > 0) {
      anchor = traversal.treeNextEditableText(this._anchor)
      if (anchor) {
        offset = 0
      }
      else {
        anchor = traversal.treePrevEditableText(this._anchor)
        if (anchor) {
          offset = anchor.length
        }
      }
    }
    else {
      anchor = traversal.treePrevEditableText(this._anchor)
      if (anchor) {
        offset = anchor.length
      }
      else {
        anchor = traversal.treeNextEditableText(this._anchor)
        if (anchor) {
          offset = 0
        }
      }
    }
    // TODO 这里需要优化，如果找不到可编辑的文本节点，说明整个编辑区都不可编辑，这种极端情况尚未处理
    if (!anchor) {
      return this
    }
    return new EtCaret(anchor, offset, true)
  }

  /**
   * 在光标位置插入节点或片段 返回 true;  若光标位置非法 或在文本节点中间, 则不执行, 返回 false;
   * * 该方法不具备撤销能力, 只能在命令内部执行, 依赖命令进行撤销
   */
  insertNode(node: Et.Node | Et.Fragment) {
    if (!this.__connected) {
      this.toReality()
    }
    const offset = this.offset
    let anchor = this.anchor
    let beforeNode: Et.NodeOrNull
    if (dom.isText(anchor)) {
      if (offset > 0 && offset < anchor.length) {
        return false
      }
      beforeNode = offset <= 0 ? anchor : anchor.nextSibling
      anchor = anchor.parentNode as Et.HTMLElement
    }
    else {
      beforeNode = anchor.childNodes.item(offset)
    }
    if (!anchor) {
      return false
    }
    anchor.insertBefore(node, beforeNode)
    return true
  }
}
