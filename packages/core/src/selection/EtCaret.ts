/**
 * 在 DOM 中"脱字符"caret只能落在可编辑的文本内或节点边缘;
 * 这里使用 EtCaret 来代指编辑器内的选区collapsed 时的光标位置
 */

import type { Et } from '..'
import { dom, traversal } from '../utils'
import type { AnchorOffset } from './config'
import { AnchorOutOffset, CaretRange } from './config'

/**
 * 选区光标
 */
export class EtCaret extends CaretRange {
  private _anchor: Et.Node
  private _offset: AnchorOffset
  /**
   * 构建一个基于锚点偏移的 EtCaret 光标位置
   */
  constructor(
    anchor: Et.Node,
    offset: AnchorOffset,
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
    return this.offset >= 0
  }

  /**
   * 光标是否落在节点外, 且在节点前
   */
  get isAnchorBefore() {
    return this.offset === AnchorOutOffset.Before
  }

  /**
   * 光标是否落在文本节点上
   */
  get isSurroundText() {
    return dom.isText(this.anchor) && this.offset > 0 && this.offset < this.anchor.length
  }

  get isValid() {
    if (this.__valid) {
      return true
    }
    // connected 的节点必定有 parentNode
    return (this.__valid = (this.anchor.isConnected && (
      this.offset < 0 ? true : this.offset <= dom.nodeLength(this.anchor)
    )))
  }

  /**
   * 通过 Range 更新当前 EtCaret 对象
   */
  fromRange(range: Et.AbstractRange, fromStart = true) {
    // 清除旧的 range缓存
    this.__range = void 0
    if (fromStart) {
      this._anchor = range.startContainer
      this._offset = range.startOffset
    }
    else {
      this._anchor = range.endContainer
      this._offset = range.endOffset
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
    if (this.__range) {
      return this.__range
    }

    if (!this.isValid) {
      return null
    }
    const r = document.createRange() as Et.Range
    if (this.offset >= 0) {
      // r初始位置在 Document 开头, 只设置开始位置即可
      r.setStart(this.anchor, this.offset)
    }
    else {
      if (this.offset === AnchorOutOffset.Before) {
        r.setStartBefore(this.anchor)
      }
      else {
        r.setStartAfter(this.anchor)
      }
    }
    this.__range = r
    return r
  }

  /** 让一个 range应用这个光标位置 */
  adoptToRange(r: Range, setStart = true, setEnd = true) {
    if (!this.isValid) {
      return
    }
    if (this.isAnchorIn) {
      if (setStart) r.setStart(this.anchor, this.offset)
      if (setEnd) r.setEnd(this.anchor, this.offset)
    }
    else if (this.isAnchorBefore) {
      if (setStart) r.setStartBefore(this.anchor)
      if (setEnd) r.setEndBefore(this.anchor)
    }
    else {
      if (setStart) r.setStartAfter(this.anchor)
      if (setEnd) r.setEndAfter(this.anchor)
    }
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

  isEqualTo(caret: EtCaret) {
    return this.anchor === caret.anchor && this.offset === caret.offset
  }

  /**
   * 判断与另一个光标位置是否位于同一亲和位置;\
   * 亲和位置: 若 range 从一个光标位置开始到另一个光标位置结束,
   * 该 range 选择的文本内容为空, 或完全选择的节点数量为 0, 则称这两个光标位置"亲和(Affinity)"(位于同一亲和位置);
   * * 该 Affinity 与 Blink 的概念不全相同; 在 blink中, 当前块节点内开头和前一块节点内末尾不会被视为同一位置;
   *    并且会考虑 css dispaly table 等其他布局问题, 非常复杂; 此处只在文档树层面上,
   *    依据两位置之间是否有文本或完全包含的节点来判断是否属于同一位置
   * @example
   * <div>AA^<b>|<i>I</i>BB</b>CC</div>
   * ^ 和 | 被视为同一亲和位置; | 和 I 不是亲和位置
   */
  isAffinityTo(other: EtCaret) {
    // 同一节点位置, 返回 true
    if (this.isEqualTo(other)) {
      return true
    }
    // 不是同一文本节点, 却在文本节点中间, 返回 false
    if (this.isSurroundText || other.isSurroundText) {
      return false
    }
    /**
     * 算法:
     * @example
     * <div>
     *  <p1>AA</p1>
     *  <p2>BB<b>CC</b>DD</p2>
     *  <p3><i>EE</i>FF<br></p3>
     * </div>
     *
     * `->`代表`EtCaret.innerAffinity`的过程
     * `=>`代表`traversal.treeNextSibling`的过程
     *
     * 亲和组1:
     *    (div, 1) -> (p2, 0) -> (BB, 0)
     *    (p2, 0) -> (BB, 0)
     *    (BB, 0)
     *    (p1, 1) -> (AA, 2) => (p2, 0) -> (BB, 0)
     *    (AA, 2) => (BB, 0)
     *
     * 亲和组2:
     *    (div, 2) -> (p3, 0) -> (i, 0) -> (EE, 0)
     *    (p2, 3) -> (DD, 2) => (p3, 0) -> (i, 0) -> (EE, 0)
     *    (p3, 0) -> (i, 0) -> (EE, 0)
     *    (i, 0) -> (EE, 0)
     *    (EE, 0)
     *
     * 亲和组3:
     *    (FF, 2) => (br, 0)
     *    (br, 0)
     *    (p3, 2) -> (br, 0)
     *    // 非亲和
     *    (p3, 3) -> (br, 1)
     *
     */
    // 1. 将定位到节点外的位置, 转为节点内的亲和位置
    const { node: thisNode, offset: thisOffset } = traversal.innermostPosition(this.anchor,
      this.isAnchorIn
        ? this.offset
        : this.isAnchorBefore
          ? 0
          : dom.nodeLength(this.anchor),
    )
    const { node: otherNode, offset: otherOffset } = traversal.innermostPosition(other.anchor,
      other.isAnchorIn
        ? other.offset
        : other.isAnchorBefore
          ? 0
          : dom.nodeLength(other.anchor),
    )
    // 2. 比较两个光标位置是否位于同一亲和位置
    if (thisNode === otherNode) {
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
    former = traversal.innermostPosition(former, 0).node
    return former === latter
  }

  /**
   * 在光标位置插入节点或片段 返回 true;  若光标位置非法 或在文本节点中间, 则不执行, 返回 false;
   * * 该方法应只在命令内部执行
   */
  insertNode(node: Et.Node | Et.Fragment) {
    let anchor = this.anchor
    let beforeIndex = this.offset
    if (!anchor.isConnected) {
      return false
    }
    if (dom.isText(anchor)) {
      if (beforeIndex > 0 || beforeIndex < anchor.length) {
        return false
      }
      anchor = anchor.parentNode as Et.HTMLElement
      beforeIndex = dom.nodeIndex(anchor) + beforeIndex === 0 ? 0 : 1
    }
    else if (beforeIndex < 0) {
      anchor = anchor.parentNode as Et.HTMLElement
      beforeIndex = dom.nodeIndex(anchor) + beforeIndex === AnchorOutOffset.Before ? 0 : 1
    }
    anchor.insertBefore(node, anchor.childNodes.item(beforeIndex))
    return true
  }
}
