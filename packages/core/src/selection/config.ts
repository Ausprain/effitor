import type { Et } from '../@types'

/**
 * 描述一个 DOM 位置
 */
export interface EtPosition<T extends Et.Node = Et.Node> {
  container: T
  offset: number
}

/**
 * 选区锚点偏移量, 用于标识光标/范围边缘位于锚点的位置; \
 * 可能为负数, -Infinity 表示节点外开头, Infinity 表示节点外结尾\
 * ```html
 * <div>AA^<b>BB</b>|CC</div>
 * 若 anchor 为 <b>, 则 ^ 位置为 -Infinity, | 位置为 Infinity
 * ```
 */
export type AnchorOffset = number
