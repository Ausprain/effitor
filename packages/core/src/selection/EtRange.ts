import type { Et } from '../@types'
import { CaretRange } from './CaretRange'
import { type AnchorOffset } from './config'
import { EtCaret } from './EtCaret'

/**
 * 选区范围, 用于编辑器命令标识一个编辑器内容范围
 */
export class EtRange extends CaretRange {
  private _startCaret: EtCaret
  private _endCaret: EtCaret
  constructor(
    startAnchor: Et.Node,
    startOffset: AnchorOffset,
    endAnchor: Et.Node,
    endOffset: AnchorOffset,
  ) {
    super()
    this._startCaret = new EtCaret(startAnchor, startOffset)
    this._endCaret = new EtCaret(endAnchor, endOffset)
  }

  get startAnchor() {
    return this._startCaret.anchor
  }

  get startOffset() {
    return this._startCaret.offset
  }

  get endAnchor() {
    return this._endCaret.anchor
  }

  get endOffset() {
    return this._endCaret.offset
  }

  get isCollapsed() {
    return this.startAnchor === this.endAnchor
      && this.startOffset === this.endOffset
  }

  get isConnected() {
    if (this.__connected) {
      return true
    }
    // connected 的节点必定有 parentNode, 无需判断 parentNode !== null
    return (this.__connected = this._startCaret.isConnected && this._endCaret.isConnected)
  }

  toCaret(toStart = true): Et.EtCaret {
    return toStart
      ? this._startCaret
      : this._endCaret
  }

  toRange() {
    if (!this.isConnected) {
      return null
    }
    const r = document.createRange() as Et.Range
    this._startCaret.adoptToRange(r, true, false)
    this._endCaret.adoptToRange(r, false, true)
    return r
  }

  isCaret(): this is EtCaret {
    return false
  }

  isEqualTo(other: EtCaret | EtRange): boolean {
    return !other.isCaret()
      && this.startAnchor === other.startAnchor
      && this.startOffset === other.startOffset
      && this.endAnchor === other.endAnchor
      && this.endOffset === other.endOffset
  }
}
