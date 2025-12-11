import type { Et } from '../@types'
import type { EtCaret } from './EtCaret'
import type { EtInRaw } from './EtInRaw'
import type { EtRange } from './EtRange'

export abstract class CaretRange {
  protected __isInRaw = false
  protected __connected = false

  /**
   * 获取对应的Range对象, 若位置不合法(节点不在 DOM 上), 返回 null
   */
  abstract toRange(): Et.Range | null
  /**
   * 获取对应的 EtCaret 对象
   * @param toStart 若为范围, 是否collapsed 到开头
   */
  abstract toCaret(toStart?: boolean): Et.EtCaret
  /**
   * 检查是否与另一个 CaretRange 对象相等
   * @param other 另一个 CaretRange 对象
   */
  abstract isEqualTo(other: EtCaret | EtRange | EtInRaw): boolean
  /**
   * 当前对象是否为 EtCaret 实例
   */
  abstract isCaret(): this is EtCaret
  isInRaw(): this is EtInRaw {
    return false
  }

  /**
   * 标记该 CaretRange 对象为已连接的; 当从 Range 对象构建 CaretRange 时,
   * 可标记为 connected, 以提高效率
   */
  markConnected() {
    this.__connected = true
    return this
  }

  /**
   * 返回自身, 由 EtCaret 具体实现
   */
  toTextAffinity(this: CaretRange | EtCaret): this extends EtCaret ? EtCaret : CaretRange {
    return this as this extends EtCaret ? EtCaret : CaretRange
  }
}
