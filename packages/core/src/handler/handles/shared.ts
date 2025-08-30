/* eslint-disable @stylistic/max-len */
import type { Et } from '~/core/@types'
import { dom } from '~/core/utils'

import { fragmentUtils } from '../utils'

/**
 * Selection为Range时, 判断目标选区的位置: 同一#text内, 同段落内, 跨段落;
 * 若选区 collapsed , 不执行, 直接返回
 * @param ctx
 * @param targetRange 目标选区范围, 若不合法, 则返回 false, 不执行回调
 * @param inTheSameTextFn 同#text回调 arg2: 该目标选区所在段落, arg3: 文本节点
 * @param inTheSameParagraphFn 同段落回调 arg2: 该目标选区所在段落
 * @param inSpanningParagraphFn 跨段落回调 arg2: 选区起点所在段落, arg3: 选区终点所在段落
 */
export const checkTargetRangePosition = (
  ctx: Et.EditorContext,
  targetRange: Et.TargetRange | Et.ValidTargetRange,
  inTheSameTextFn: (ctx: Et.EditorContext, targetRange: Et.ValidTargetRange, currP: Et.Paragraph, textNode: Et.Text) => boolean,
  inTheSameParagraphFn: (ctx: Et.EditorContext, targetRange: Et.ValidTargetRange, currP: Et.Paragraph) => boolean,
  inSpanningParagraphFn: (ctx: Et.EditorContext, targetRange: Et.ValidTargetRange, startP: Et.Paragraph, endP: Et.Paragraph) => boolean,
) => {
  if (targetRange.collapsed || !targetRange.isValid()) {
    return false
  }
  // 选区位于同一个#text节点内
  if (targetRange.isTextCommonAncestor()) {
    return inTheSameTextFn(ctx, targetRange, targetRange.startParagraph, targetRange.commonAncestor)
  }

  const p1 = targetRange.startParagraph
  const p2 = targetRange.endParagraph
  // 段落内跨节点
  if (p1 === p2) {
    return inTheSameParagraphFn(ctx, targetRange, p1) // 此处公共祖先必定是元素
  }
  // 跨段落
  else {
    return inSpanningParagraphFn(ctx, targetRange, p1, p2)
  }
}

/**
 * 获取当前选区在扩大节点内的未选区内容的克隆片段
 * * 若`currRange`在同一段落内 那么`startExpandContainer`和`endExpandContainer`
 *   必须在同一段落内 或 指向同一段落, 否则会导致意料之外的情况
 * @param staticRange 目标选区
 * @param startExpandContainer 选区起始节点的扩大节点
 * (通常是 commonAncestor 或 开始端[partial_contained](https://dom.spec.whatwg.org/#partially-contained)节点)
 * @param endExpandContainer 选区终止节点的扩大节点
 * (通常是 commonAncestor 或 结束端[partial_contained](https://dom.spec.whatwg.org/#partially-contained)节点)
 * @param includeExpandContainer 克隆是否包含扩大节点边缘, 否则只克隆扩大节点内
 * @param clean 返回前 是否使用cleanFragment清理片段
 * @returns [前半未选择内容片段, 后半未选择内容片段]
 */
export const cloneRangeUnselectedContents = (
  staticRange: Et.StaticRange,
  startExpandContainer: Node,
  endExpandContainer: Node,
  includeExpandContainer: boolean,
  clean = true,
): [Et.Fragment, Et.Fragment] => {
  const r1 = document.createRange()
  const r2 = document.createRange()

  r1.setEnd(staticRange.startContainer, staticRange.startOffset)
  r2.setStart(staticRange.endContainer, staticRange.endOffset)
  if (includeExpandContainer) {
    r1.setStartBefore(startExpandContainer)
    r2.setEndAfter(endExpandContainer)
  }
  else {
    r1.setStart(startExpandContainer, 0)
    r2.setEnd(endExpandContainer, dom.isText(endExpandContainer)
      ? endExpandContainer.length
      : endExpandContainer.childNodes.length)
  }
  const f1 = r1.cloneContents() as Et.Fragment
  const f2 = r2.cloneContents() as Et.Fragment
  if (clean) {
    fragmentUtils.cleanEtFragment(f1)
    fragmentUtils.cleanEtFragment(f2)
  }
  return [f1, f2]
}
