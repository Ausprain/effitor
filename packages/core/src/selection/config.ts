import type { Et } from '..'

/**
 * 描述一个 DOM 位置
 */
export interface EtPosition {
  node: Et.Node
  offset: number
}

export abstract class CaretRange {
  protected __valid = false
  /** Range 缓存 */
  protected __range?: Et.Range = void 0
  abstract fromRange(range: Et.AbstractRange): void
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
   * 标记该 CaretRange 对象为合法的; 当从 Range 对象构建 CaretRange 时,
   * 可标记为 valid, 以提高效率
   */
  markValid() {
    this.__valid = true
  }
}

export const enum AnchorOutOffset {
  Before = -2,
  After = -1,
}
/**
 * 选区锚点偏移量, 用于标识光标/范围边缘位于锚点的位置; \
 * 可能为负数, -2 表示节点外开头, -1 表示节点外结尾\
 * ```html
 * <div>AA^<b>BB</b>|CC</div>
 * 若 anchor 为 <b>, 则 ^ 位置为 -2, | 位置为 -1
 * ```
 */
export type AnchorOffset = AnchorOutOffset | number
