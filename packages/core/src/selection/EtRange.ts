import type { Et } from '~/core/@types'

import type { AnchorOffset } from './config'
import { CaretRange } from './config'
import { EtCaret } from './EtCaret'

/**
 * 选区范围, 用于编辑器命令标识一个编辑器内容范围
 */
export class EtRange extends CaretRange {
  public readonly start: EtCaret
  public readonly end: EtCaret
  constructor(
    startAnchor: Et.Node,
    startOffset: AnchorOffset,
    endAnchor: Et.Node,
    endOffset: AnchorOffset,
  ) {
    super()
    this.start = new EtCaret(startAnchor, startOffset)
    this.end = new EtCaret(endAnchor, endOffset)
  }

  get isCollapsed() {
    return this.start.isEqualTo(this.end)
  }

  get isValid() {
    if (this.__valid) {
      return true
    }
    // connected 的节点必定有 parentNode, 无需判断 parentNode !== null
    return (this.__valid = (this.start.isValid && this.end.isValid))
  }

  /**
   * 通过 Range 更新当前 EtRange 对象
   */
  fromRange(range: Et.AbstractRange) {
    this.start.fromRange(range, true)
    this.end.fromRange(range, false)
  }

  toCaret(toStart = true): Et.EtCaret {
    return toStart
      ? this.start.toCaret()
      : this.end.toCaret()
  }

  toRange() {
    if (!this.isValid) {
      return null
    }
    const r = document.createRange() as Et.Range
    this.start.adoptToRange(r, true, false)
    this.end.adoptToRange(r, false, true)
    return r
  }

  markValid(): void {
    this.__valid = true
    this.start.markValid()
    this.end.markValid()
  }
}
