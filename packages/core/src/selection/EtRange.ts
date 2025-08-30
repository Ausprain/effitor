import type { Et } from '~/core/@types'

import { dom } from '../utils'
import { CaretRange } from './CaretRange'
import { type AnchorOffset, AnchorOutOffset } from './config'
import { EtCaret } from './EtCaret'

/**
 * 选区范围, 用于编辑器命令标识一个编辑器内容范围
 */
export class EtRange extends CaretRange {
  constructor(
    public readonly startAnchor: Et.Node,
    public readonly startOffset: AnchorOffset,
    public readonly endAnchor: Et.Node,
    public readonly endOffset: AnchorOffset,
  ) {
    super()
  }

  get isCollapsed() {
    return this.startAnchor === this.endAnchor
      && this.startOffset === this.endOffset
  }

  get isValid() {
    if (this.__valid) {
      return true
    }
    // connected 的节点必定有 parentNode, 无需判断 parentNode !== null
    if (!this.startAnchor.isConnected || !this.endAnchor.isConnected) {
      return (this.__valid = false)
    }
    if (this.startOffset > 0) {
      this.__valid = this.startOffset <= dom.nodeLength(this.startAnchor)
    }
    if (this.endOffset > 0) {
      this.__valid = this.endOffset <= dom.nodeLength(this.endAnchor)
    }
    return this.__valid
  }

  toCaret(toStart = true): Et.EtCaret {
    return toStart
      ? new EtCaret(this.startAnchor, this.startOffset)
      : new EtCaret(this.endAnchor, this.endOffset)
  }

  toRange() {
    if (!this.isValid) {
      return null
    }
    const r = document.createRange() as Et.Range
    if (this.startOffset >= 0) {
      r.setStart(this.startAnchor, this.startOffset)
    }
    else if (this.startOffset === AnchorOutOffset.Before) {
      r.setStartBefore(this.startAnchor)
    }
    else {
      r.setStartAfter(this.startAnchor)
    }
    if (this.endOffset >= 0) {
      r.setEnd(this.endAnchor, this.endOffset)
    }
    else if (this.endOffset === AnchorOutOffset.Before) {
      r.setEndBefore(this.endAnchor)
    }
    else {
      r.setEndAfter(this.endAnchor)
    }
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

  markValid(): void {
    this.__valid = true
  }
}
