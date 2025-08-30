import type { Et } from '../@types'
import type { EtCaret } from './EtCaret'

export abstract class CaretRange {
  protected __valid = false
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
  abstract isEqualTo(other: CaretRange): boolean
  /**
   * 当前对象是否为 EtCaret 实例
   */
  abstract isCaret(): this is EtCaret
  /**
   * 标记该 CaretRange 对象为合法的; 当从 Range 对象构建 CaretRange 时,
   * 可标记为 valid, 以提高效率
   */
  markValid() {
    this.__valid = true
  }
}
