import type { Et } from '../@types'
import { CaretRange } from './CaretRange'
import { EtCaret } from './EtCaret'

export class EtInRaw extends CaretRange {
  protected override __isInRaw = true

  constructor(
    public readonly rawEl: Et.HTMLRawEditElement,
    /**
     * 范围在 rawEl 中的起始位置, 相当于 rawEl.selectionStart; 但此对象仅标记位置，不改变rawEl实际选区状态
     */
    public readonly start: number,
    /**
     * 范围在 rawEl 中的结束位置, 相当于 rawEl.selectionEnd; 但此对象仅标记位置，不改变rawEl实际选区状态
     */
    public readonly end: number,
  ) {
    super()
  }

  override isInRaw(): this is EtInRaw {
    return true
  }

  override isCaret(): this is EtCaret {
    return false
  }

  override toRange(): Et.Range | null {
    if (!this.rawEl.isConnected) {
      return null
    }
    const range = document.createRange()
    range.setStart(this.rawEl, 0)
    range.setEnd(this.rawEl, 0)
    return range as Et.Range
  }

  override toCaret(toStart = true): Et.EtCaret {
    if (toStart) {
      return new EtCaret(this.rawEl, this.start)
    }
    return new EtCaret(this.rawEl, this.end)
  }

  override isEqualTo(other: CaretRange): boolean {
    return other.isInRaw() && this.rawEl === other.rawEl && this.start === other.start && this.end === other.end
  }
}
