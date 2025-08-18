import type { Et } from '~/core/@types'

import { dom } from '../utils'
import { EtCaret } from './EtCaret'

/**
 * 同层跨度范围, 用于 removeContent 命令描述一个移除内容范围;
 * startNode 和 endNode 必定在同一层级(父节点相同)
 */
export class SpanRange {
  constructor(
    public readonly startNode: NodeHasParent<Et.Node>,
    public readonly endNode: NodeHasParent<Et.Node>,
  ) {}

  toRange(): Et.Range {
    const range = document.createRange() as Et.Range
    range.setStartBefore(this.startNode)
    range.setEndAfter(this.endNode)
    return range
  }

  /**
   * 提取跨度范围内容到指定片段
   * @param extractAt 是否获取提取位置, 即 startNode 外开头对应的光标位置
   * @returns 一个光标位置 若extractAt为 true, 否则返回 undefined
   */
  extractToFragment<T extends boolean>(
    fragment: Et.Fragment, extractAt: T): T extends true ? Et.EtCaret : undefined {
    let caret
    if (extractAt) {
      caret = new EtCaret(this.startNode.parentNode, dom.nodeIndex(this.startNode))
    }
    if (this.startNode === this.endNode) {
      fragment.appendChild(this.startNode)
      return caret as T extends true ? Et.EtCaret : undefined
    }
    let next = this.startNode.nextSibling
    while (next) {
      fragment.appendChild(next)
      if (next === this.endNode) {
        break
      }
      next = next.nextSibling
    }
    fragment.prepend(this.startNode)
    return caret as T extends true ? Et.EtCaret : undefined
  }
}

export type SpanRangeOmitCmdMethods = Omit<SpanRange, 'extractToFragment'>
