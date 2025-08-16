/* eslint-disable @stylistic/max-len */
import { Et } from '@effitor/core'

import { dom } from '~/core/utils'

import { cleanFragment } from './fragment'

/**
 * Selection为Range时, 判断目标选区的位置: 同一#text内, 同段落内, 跨段落;
 * 若选区 collapsed , 不执行, 直接返回
 * @param ctx
 * @param targetRange 目标选区范围, 若为空, 则使用当前 selection 范围
 * @param inTheSameTextFn 同#text回调 arg1: 该目标选区所在段落, arg2: 文本节点
 * @param inTheSameParagraphFn 同段落回调 arg1: 该目标选区所在段落, arg2: 选区公共祖先节点
 * @param inDifferentParagraphWithSameParentFn 同层不同段落回调 arg1: 选区起始段落, arg2: 选区结束段落
 * @param inDifferentParagraphWithSameTopElementFn 同顶层节点, 但段落不同层
 * @param inDifferentTopElementFn 不同顶层节点, 此时 commanAncestor 理论上是 ctx.body
 */
export const checkTargetRangePosition = (
  ctx: Et.UpdatedContext,
  targetRange: Et.StaticRange | null,
  inTheSameTextFn: (ctx: Et.UpdatedContext, targetRange: Et.StaticRange, currP: Et.Paragraph, textNode: Et.Text) => boolean,
  inTheSameParagraphFn: (ctx: Et.UpdatedContext, targetRange: Et.StaticRange, currP: Et.Paragraph, commonAncestor: Et.NullableHTMLNode) => boolean,
  inDifferentParagraphWithSameParentFn: (ctx: Et.UpdatedContext, targetRange: Et.StaticRange, startP: Et.Paragraph, endP: Et.Paragraph) => boolean,
  inDifferentParagraphWithSameTopElementFn: (ctx: Et.UpdatedContext, targetRange: Et.StaticRange, startP: Et.Paragraph, endP: Et.Paragraph, topEl: Et.Paragraph, commonAncestor: Et.HTMLElement) => boolean,
  inDifferentTopElementFn: (ctx: Et.UpdatedContext, targetRange: Et.StaticRange, startP: Et.Paragraph, endP: Et.Paragraph, startTop: Et.Paragraph, endTop: Et.Paragraph, commonAncestor: Et.HTMLElement) => boolean,
) => {
  let isCurrentSelection = false
  if (!targetRange) {
    targetRange = ctx.selection.range
    isCurrentSelection = true
  }
  if (!targetRange || targetRange.collapsed) {
    return false
  }
  // 选区位于同一个#text节点内
  if (targetRange.startContainer === targetRange.endContainer
    && dom.isText(targetRange.endContainer)
  ) {
    const currP = isCurrentSelection
      ? ctx.paragraphEl
      : ctx.findParagraph(targetRange.startContainer)
    if (!currP) {
      if (import.meta.env.DEV) {
        throw new Error('[error] at checkTargetRangePosition]: 当前段落不存在')
      }
      return false
    }
    return inTheSameTextFn(ctx, targetRange, currP, targetRange.endContainer)
  }

  let p1, p2
  if (isCurrentSelection) {
    p1 = ctx.selection.startParagraph
    p2 = ctx.selection.endParagraph
  }
  else {
    p1 = ctx.findParagraph(targetRange.startContainer)
    p2 = ctx.findParagraph(targetRange.endContainer)
  }
  if (!p1 || !p2) {
    if (import.meta.env.DEV) {
      throw Error('[error] at checkTargetRangePosition]: 选区所属段落不存在')
    }
    return false
  }

  // 段落内跨节点
  if (p1 === p2) {
    return inTheSameParagraphFn(ctx, targetRange, p1, isCurrentSelection
      ? ctx.selection.commonAncestor
      : ctx.selection.findCommonAncestor(targetRange.startContainer, targetRange.endContainer),
    )
  }
  // 同层跨段落
  else if (p1.parentNode === p2.parentNode) {
    return inDifferentParagraphWithSameParentFn(ctx, targetRange, p1, p2)
  }
  let top1, top2, commonAncestor
  if (isCurrentSelection) {
    top1 = ctx.selection.startTopElement
    top2 = ctx.selection.endTopElement
    commonAncestor = ctx.selection.commonAncestor as Et.HTMLElement // 此处公共祖先必定是元素
  }
  else {
    top1 = ctx.findTopElement(p1)
    top2 = ctx.findTopElement(p2)
    commonAncestor = ctx.selection.findCommonAncestor(p1, p2) as Et.HTMLElement // 此处公共祖先必定是元素
  }
  if (!top1 || !top2 || !commonAncestor) {
    return false
  }
  // 同顶层节点, 但段落不同层
  if (top1 === top2) {
    return inDifferentParagraphWithSameTopElementFn(ctx, targetRange, p1, p2, top1, commonAncestor)
  }
  // 不同顶层节点
  else {
    return inDifferentTopElementFn(ctx, targetRange, p1, p2, top1, top2, commonAncestor)
  }
}

/**
 * 获取当前选区在扩大节点内的未选区内容的克隆片段
 * * 若`currRange`在同一段落内 那么`startExpandContainer`和`endExpandContainer`
 *   必须在同一段落内 或 指向同一段落, 否则会导致意料之外的情况
 * @param targetRange 目标选区
 * @param startExpandContainer 选区起始节点的扩大节点
 * (通常是 commonAncestor 或 开始端[partial_contained](https://dom.spec.whatwg.org/#partially-contained)节点)
 * @param endExpandContainer 选区终止节点的扩大节点
 * (通常是 commonAncestor 或 结束端[partial_contained](https://dom.spec.whatwg.org/#partially-contained)节点)
 * @param includeExpandContainer 克隆是否包含扩大节点边缘, 否则只克隆扩大节点内
 * @param clean 返回前 是否使用cleanFragment清理片段
 * @returns [前半未选择内容片段, 后半未选择内容片段]
 */
export const cloneRangeUnselectedContents = (
  targetRange: Et.StaticRange,
  startExpandContainer: Node,
  endExpandContainer: Node,
  includeExpandContainer: boolean,
  clean = true,
): [Et.Fragment, Et.Fragment] => {
  const r1 = document.createRange()
  const r2 = document.createRange()

  r1.setEnd(targetRange.startContainer, targetRange.startOffset)
  r2.setStart(targetRange.endContainer, targetRange.endOffset)
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
    cleanFragment(f1)
    cleanFragment(f2)
  }
  return [f1, f2]
}

// export const removeRangingContentsInsert
