import { type Et, traversal } from '@effitor/core'

import { MarkEnum, MarkType } from './config'
import type { EtMarkElement } from './EtMarkElement'

// TODO 这里似乎不用这么复杂, 直接判断祖先有无同类 mark 元素即可
// 或许当初有别的考量, 待考证

/**
```
h: 01 00 00 00
b: 00 01 00 00
i: 00 00 01 00
d: 00 00 00 01

s: 01 01 01 01
x: 10 10 10 10

s & x == 0
```
*/
const NestedCheck = {
  [MarkType.CODE]: -1, //
  [MarkType.HIGHLIGHT]: 1 << 6, // 64
  [MarkType.BOLD]: 1 << 4, // 16
  [MarkType.ITALIC]: 1 << 2, // 4
  [MarkType.DELETE]: 1, // 1

  checker: 0b10101010,
} as const

/**
 * mark节点嵌套检查器
 */
export const nestedChecker = {
  /**
   * @returns false: 禁止插入该mark, true: 对于嵌套规则而言允许插入该mark
   */
  check(currEl: Et.HTMLElement, newMark: MarkType): boolean {
    const markEls: EtMarkElement[] = traversal.outerElements(currEl, MarkEnum.ElName)
    let point = 0
    for (const el of markEls) {
      if (el.markType === MarkType.CODE) {
        point = -1
        break
      }
      point |= el.markType ? NestedCheck[el.markType] : 0
    }
    // 有code节点，禁止嵌套
    if (point === -1) return false
    // 若插入新mark节点后，在父子节点链上产生相同的mark节点，禁止嵌套
    if (point & NestedCheck[newMark] || point & NestedCheck.checker) return false
    return true
  },
}
