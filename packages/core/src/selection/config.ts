import type { Et } from '~/core/@types'

/**
 * 描述一个 DOM 位置
 */
export interface EtPosition {
  container: Et.Node
  offset: number
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
