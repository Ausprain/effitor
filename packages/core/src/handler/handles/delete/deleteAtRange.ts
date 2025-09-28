import type { Et } from '../../../@types'
import { cr } from '../../../selection'
import { dom } from '../../../utils'
import { cmd } from '../../command'
import { fragmentUtils } from '../../utils'
import { checkTargetRangePosition, tryToMoveNodes, tryToRemoveNodesBetween } from '../shared'
import { expandRemoveInsert, removeNodesAndChildlessAncestorAndMergeSiblings } from './delete.shared'

/**
 * 检查并移除指定范围内容, 若collapsed, 则直接使用光标位置
 * @param ctx 编辑器上下文
 * @param tr 目标范围
 * @param fn 处理函数, 接受一个参数, 即处理后的目标光标位置
 */
export const checkRemoveTargetRange = (
  ctx: Et.EditorContext, tr: Et.ValidTargetSelection, fn: (caret: Et.ValidTargetCaret) => boolean,
) => {
  if (!tr.collapsed) {
    if (removeByTargetRange(ctx, tr) && ctx.commandManager.handle()) {
      const lastCaretRange = ctx.commandManager.lastCaretRange
      if (!lastCaretRange) {
        return false
      }
      tr = ctx.selection.createTargetRange(lastCaretRange) as Et.ValidTargetRange
      if (!tr) {
        return false
      }
    }
    else {
      return false
    }
  }
  return fn(tr.toTargetCaret())
}

/**
 * 移除指定范围内容; collapsed 时不执行, 返回 false; 该行为会自动commit 先前命令,
 * 并标记下一个handle 需要 commit, 即删除范围会作为一个撤回栈事务 (除非在命令事务内)
 * @param ctx 更新后的编辑器上下文
 * @param targetRange 目标范围
 * @returns 是否成功移除内容
 */
export const removeByTargetRange = (
  ctx: Et.EditorContext, targetRange: Et.TargetRange | Et.ValidTargetRange,
) => {
  if (targetRange.collapsed) {
    return false
  }
  if (checkTargetRangePosition(
    ctx, targetRange,
    removeInSameTextNode,
    removeInSameParagraph,
    removeSpanningParagraphs,
  )) {
    ctx.commandManager.commit()
    ctx.commandManager.commitNextHandle()
    return true
  }
  return false
}

/** 同一 #text 内删除 */
export const removeInSameTextNode = (
  ctx: Et.EditorContext,
  targetRange: Et.ValidTargetRange,
  currP: Et.Paragraph, textNode: Et.Text,
) => {
  // targetRange 必定在 node 上
  // 删除文本片段
  if (targetRange.startOffset > 0 || targetRange.endOffset < textNode.length) {
    ctx.commandManager.push(
      cmd.removeText(textNode, targetRange.startOffset, targetRange.endOffset),
    )
    return true
  }
  // 删除整个#text节点, 连带删除以其为唯一子节点的祖先
  return removeNodesAndChildlessAncestorAndMergeSiblings(ctx, textNode, textNode, currP)
}
/** 同一段落内删除 */
export const removeInSameParagraph = (
  ctx: Et.EditorContext,
  targetRange: Et.ValidTargetRange,
  currP: Et.Paragraph,
) => {
  if (targetRange.isTextCommonAncestor() || !targetRange.isRangeCommonAncestorHasChildNodes()) {
    return false
  }
  // 选择范围在同一节点下跨度, 即 <p>AA^<b>BB</b>CC|</p> 时,
  // 可以直接删除 ^ 到 | 之间的内容, 并合并前后可合并内容
  if (targetRange.startNode === targetRange.endNode) {
    // 上游判断已经判断, 此处不会是 #text
    // 必有子节点, 否则 range 是 collapsed 的, 不会执行到这里
    const startNode = targetRange.startNode.childNodes.item(targetRange.startOffset)
    const endNode = targetRange.endNode.childNodes.item(targetRange.endOffset - 1) // endOffset 必定大于 0
    if (!startNode || !endNode) {
      return false
    }
    return removeNodesAndChildlessAncestorAndMergeSiblings(
      ctx,
      startNode,
      endNode,
      currP,
    )
  }
  // 扩大删除范围, 让range边缘的节点整体删除, 否则破坏 DOM 结构, 无法撤回
  let startExpandNode = targetRange.startAncestor
  let endExpandNode = targetRange.endAncestor
  // 选区公共祖先不是段落, 且选区无前后兄弟, 删除公共祖先
  if (currP !== targetRange.commonAncestor
    && !startExpandNode.previousSibling && !endExpandNode.nextSibling
  ) {
    startExpandNode = endExpandNode = targetRange.commonAncestor
  }
  return expandRemoveInsert(
    ctx, targetRange, startExpandNode, endExpandNode, null, true, true,
  )
}
/** 跨段落删除 */
export const removeSpanningParagraphs = (
  ctx: Et.EditorContext,
  targetRange: Et.ValidTargetRange,
  startP: Et.Paragraph,
  endP: Et.Paragraph,
) => {
  // 光标不在段落里, 返回false
  // 作为 checkTargetRangePosition 的回调函数, 光标必定在段落里
  // if (!ctx.body.isNodeContainsOther(startP, targetRange.startContainer)
  //   || !ctx.body.isNodeContainsOther(endP, targetRange.endContainer)
  // ) {
  //   return false
  // }
  if (targetRange.isTextCommonAncestor() || !targetRange.isRangeCommonAncestorHasChildNodes()) {
    return false
  }
  const { startAncestor, endAncestor } = targetRange
  if (!startAncestor || !endAncestor) {
    if (import.meta.env.DEV) {
      throw new Error('handler.[removeSpanningParagraphs]: startAncestor or endAncestor is null')
    }
    return false
  }
  if (startAncestor === startP && endAncestor === endP) {
    // startP, endP 同层
    return removeSpanningSimpleParagraph(ctx, targetRange, startP, endP)
  }
  // startP, endP 不同层
  return removeSpanningComplexParagraph(
    ctx, targetRange, startP, endP,
    startAncestor as Et.HTMLElement, // 跨段落选区祖先必定是元素
    endAncestor as Et.HTMLElement,
  )
}

const removeSpanningSimpleParagraph = (
  ctx: Et.EditorContext,
  targetRange: Et.ValidTargetRange,
  startP: Et.Paragraph, endP: Et.Paragraph,
) => {
  const startPartial = targetRange.getStartPartialNode('paragraph')
  const endPartial = targetRange.getEndPartialNode('paragraph')
  const [startUnselected, endUnselected] = cloneUnselectedContentsOfPartial(
    targetRange, startPartial, endPartial,
  )
  const isEndUnselectedContentsEmpty = !endUnselected.hasChildNodes()
  const cmds: Et.Command[] = []

  // 移除 startPartial 至 startP末尾节点
  addCmdsToRemoveStartPartiallyContained(cmds, startPartial, startP, startP)
  // 移除 endP 开头 至 endPartial 节点
  // 若 endP 无剩余节点, 且无插回内容, 移除 enP
  const isEndParagraphRemoved = !addCmdsToRemoveEndPartiallyContained(
    cmds, endPartial, endP, endP, isEndUnselectedContentsEmpty,
  )
  // 移除中间节点
  tryToRemoveNodesBetween(cmds, startP, endP)

  let destCaretRange = startPartial ? cr.caretOutStart(startPartial) : cr.caretInEndNow(startP)
  // endP被移除, 插回前半内容即可
  if (isEndParagraphRemoved) {
    if (startUnselected.hasChildNodes()) {
      cmds.push(cmd.insertContent({
        content: startUnselected,
        execAt: destCaretRange,
      }))
      destCaretRange = cr.caretEndAuto(startUnselected.lastChild as Et.Node)
    }
    cmds[cmds.length - 1].destCaretRange = destCaretRange
    ctx.commandManager.push(...cmds)
    return true
  }

  // 考虑合并段落
  if (startP.isEqualTo(endP)) {
    destCaretRange = addCmdsToMergeEqualParagraph(
      cmds, startP, endP,
      startPartial, endPartial,
      startUnselected, endUnselected,
      ctx.affinityPreference,
    ) as Et.EtCaret
    if (!destCaretRange) {
      return false
    }
    cmds[cmds.length - 1].destCaretRange = destCaretRange
    ctx.commandManager.push(...cmds)
    return true
  }

  // 不合并, 插回各自内容
  if (startUnselected && startUnselected.hasChildNodes()) {
    cmds.push(cmd.insertContent({
      content: startUnselected,
      execAt: destCaretRange,
    }))
    destCaretRange = cr.caretEndAuto(startUnselected.lastChild as Et.Node)
  }
  if (endUnselected && endUnselected.hasChildNodes()) {
    cmds.push(cmd.insertContent({
      content: endUnselected,
      execAt: cr.caretInStart(endP),
    }))
  }
  cmds[cmds.length - 1].destCaretRange = destCaretRange
  ctx.commandManager.push(...cmds)
  return true
}
const removeSpanningComplexParagraph = (
  ctx: Et.EditorContext,
  targetRange: Et.ValidTargetRange,
  startP: Et.Paragraph, endP: Et.Paragraph,
  startAncestor: Et.HTMLElement, endAncestor: Et.HTMLElement,
) => {
  const startPartial = targetRange.getStartPartialNode('paragraph')
  const endPartial = targetRange.getEndPartialNode('paragraph')
  const [startUnselected, endUnselected] = cloneUnselectedContentsOfPartial(
    targetRange, startPartial, endPartial,
  )
  const startInsertAt = startPartial ? cr.caretOutStart(startPartial) : cr.caretInEndNow(startP)
  const isEndUnselectedContentsEmpty = !endUnselected.hasChildNodes()
  const cmds: Et.Command[] = []

  // 移除 startAncestor下被选区覆盖的后代, 获取 startAncestor 下最外层节点
  const startPartialOuter = addCmdsToRemoveStartPartiallyContained(
    cmds, startPartial, startP, startAncestor,
  )
  // 移除 endAncestor下被选区覆盖的后代, 获取 endAncestor 下最外层节点,
  // 若 endAncestor被移除, 则为 null
  let endPartialOuter = addCmdsToRemoveEndPartiallyContained(
    cmds, endPartial, endP, endAncestor, isEndUnselectedContentsEmpty,
  )
  // 移除中间节点
  tryToRemoveNodesBetween(cmds, startAncestor, endAncestor)

  // endAncestor 被移除, 插回开始内容
  // const isEndAncestorWouldBeRemoved = !endPartialOuter
  if (!endPartialOuter) {
    let destCaretRange = startInsertAt
    if (startUnselected.hasChildNodes()) {
      cmds.push(cmd.insertContent({
        content: startUnselected,
        execAt: startInsertAt,
      }))
      destCaretRange = cr.caretEndAuto(startUnselected.lastChild as Et.Node)
    }
    cmds[cmds.length - 1].destCaretRange = destCaretRange
    ctx.commandManager.push(...cmds)
    return true
  }
  const endNext = endPartial ? endPartial.nextSibling : endP.firstChild
  const isAncestorEqual = dom.isEqualElement(startAncestor, endAncestor)
  const isAnyRestInEndP = !isEndUnselectedContentsEmpty || endNext
  // 考虑段落合并, 当 endP 有剩余内容, 且段落相同
  // 且 (顶层祖先相同 或 endP是顶层祖先) 时才合并段落
  const needMergeParagraph = (
    isAnyRestInEndP
    && (isAncestorEqual || endAncestor === endP)
    && startP.isEqualTo(endP)
  )
  let destCaretRange
  if (needMergeParagraph) {
    destCaretRange = addCmdsToMergeEqualParagraph(
      cmds, startP, endP,
      startPartial, endPartial,
      startUnselected, endUnselected,
      ctx.affinityPreference,
    )
  }
  // 不合并, 各自插回内容
  else {
    if (!isEndUnselectedContentsEmpty) {
      cmds.push(cmd.insertContent({
        content: endUnselected,
        execAt: cr.caretInStart(endP),
      }))
    }
    if (startUnselected.hasChildNodes()) {
      cmds.push(cmd.insertContent({
        content: startUnselected,
        execAt: startInsertAt,
      }))
      destCaretRange = cr.caretEndAuto(startUnselected.lastChild as Et.Node)
    }
    else {
      destCaretRange = startInsertAt
    }
  }
  // 考虑顶层合并
  if (isAncestorEqual) {
    cmds.push(cmd.removeNode({ node: endAncestor }))
    // 将endAncestor 中未被选区覆盖(未被删除)的节点移动到 startAncestor, 以实现合并
    // 若段落发生合并, 且移动开始节点是 endP, 则须跳过 endP
    if (needMergeParagraph && endPartialOuter === endP) {
      endPartialOuter = endP.nextSibling
    }
    tryToMoveNodes(cmds, endPartialOuter, endAncestor.lastChild, cr.caretOutEnd(startPartialOuter))
  }
  cmds[cmds.length - 1].destCaretRange = destCaretRange
  ctx.commandManager.push(...cmds)
  return true
}

/**
 * 根据目标范围, 克隆部分选择节点中未被选择的内容
 * @param targetRange 目标选区
 * @param startPartial 开始位置所在段落下的部分选择节点
 * @param endPartial 结束位置所在段落下的部分选择节点
 * @returns 一个片段二元组
 */
export const cloneUnselectedContentsOfPartial = (
  targetRange: Et.StaticRange,
  startPartial: Et.NodeOrNull,
  endPartial: Et.NodeOrNull,
): [Et.Fragment, Et.Fragment] => {
  const r = document.createRange() as Et.Range
  let startDf, endDf
  if (startPartial) {
    r.setStartBefore(startPartial)
    r.setEnd(targetRange.startContainer, targetRange.startOffset)
    startDf = fragmentUtils.cleanEtFragment(r.cloneContents())
  }
  else {
    startDf = document.createDocumentFragment() as Et.Fragment
  }
  if (endPartial) {
    r.setStart(targetRange.endContainer, targetRange.endOffset)
    r.setEndAfter(endPartial)
    endDf = fragmentUtils.cleanEtFragment(r.cloneContents())
  }
  else {
    endDf = document.createDocumentFragment() as Et.Fragment
  }
  return [startDf, endDf]
}

/**
 * 添加一组命令, 用于移除选区开始端部分选择节点下被选区完全包含的节点,
 * 以及段落下第一个被部分包含的子节点(如果有)
 * @param startPartial 必须是 startP 的直接子节点
 * @param startP 选区开始位置所在段落
 * @param startAncestor 选区开始位置在 commonAncestor下的最外层祖先
 * @returns 选区开始位置在 startAncestor 下的最外层祖先, 若 startP 就是 startAncestor, 那么返回 startP
 */
export const addCmdsToRemoveStartPartiallyContained = (
  cmds: Et.CommandQueue,
  startPartial: Et.NodeOrNull,
  startP: Et.Paragraph,
  startAncestor: Et.Node,
) => {
  let removeRange
  if (startAncestor === startP) {
    removeRange = cr.spanRange(startPartial, startP.lastChild)
    if (removeRange) {
      cmds.push(cmd.removeContent({ removeRange }))
    }
    return startP
  }

  let startNext = startPartial
  startPartial = startP
  while (startPartial) {
    if (startNext) {
      removeRange = cr.spanRange(startNext, startPartial.lastChild)
      if (removeRange) {
        cmds.push(cmd.removeContent({ removeRange }))
      }
    }
    if (startPartial === startAncestor) {
      startPartial = startNext
        ? startNext.previousSibling as Et.Node
        : startPartial.lastChild as Et.Node
      break
    }
    startNext = startPartial.nextSibling
    startPartial = startPartial.parentNode as Et.HTMLElement
  }
  return startPartial
}

/**
 * 添加一组命令, 用于移除选区结束端部分选择节点下被选区完全包含的节点,
 * 以及段落下第一个被部分包含的子节点(如果有)
 * @param endPartial 必须是 endP 的直接子节点
 * @param endP 选区结束位置所在段落
 * @param endAncestor 选区结束位置在 commonAncestor下的最外层祖先
 * @param isPartialUnselectedContentsEmpty endP 的插回内容是否为空,
 *    结束端删除与开始端不同, 需要判断是否有剩余节点, 若无剩余且插回内容为空, 需要连带删除空祖先
 * @returns
 *  null, 当 endAncestor 被删除\
 *  endP, 当 endP 就是 endAncestor\
 *  否则, 返回选区结束位置在 endAncestor 下的最外层祖先
 */
export const addCmdsToRemoveEndPartiallyContained = (
  cmds: Et.CommandQueue,
  endPartial: Et.NodeOrNull,
  endP: Et.Paragraph,
  endAncestor: Et.Node,
  isPartialUnselectedContentsEmpty: boolean,
) => {
  let removeRange
  let endNext = endPartial ? endPartial.nextSibling : endP.firstChild
  if (endAncestor === endP) {
    if (!endNext && isPartialUnselectedContentsEmpty) {
      cmds.push(cmd.removeNode({ node: endP }))
      return null
    }
    else {
      removeRange = cr.spanRange(endP.firstChild, endPartial)
      if (removeRange) {
        cmds.push(cmd.removeContent({ removeRange }))
      }
    }
    return endP
  }

  let endPrev = endPartial
  endPartial = endP

  // 插回内容为空, 剩余节点为空, 连带删除空祖先
  if (isPartialUnselectedContentsEmpty && !endNext) {
    while (endPartial && !endNext) {
      if (endPartial === endAncestor) {
        cmds.push(cmd.removeNode({ node: endAncestor }))
        return null
      }
      endPrev = endPartial
      endNext = endPartial.nextSibling
      endPartial = endPartial.parentNode
    }
  }

  while (endPartial) {
    if (endPrev) {
      removeRange = cr.spanRange(endPartial.firstChild, endPrev)
      if (removeRange) {
        cmds.push(cmd.removeContent({ removeRange }))
      }
    }
    if (endPartial === endAncestor) {
      endPartial = endPrev
        ? endPrev.nextSibling as Et.Node
        : endPartial.firstChild as Et.Node
      break
    }
    endPrev = endPartial.previousSibling
    endPartial = endPartial.parentNode as Et.HTMLElement
  }
  return endPartial
}

/**
 * 合并俩相同段落, 该方法只能在判定 startP 和 endP 可合并后调用
 * @param cmds 命令数组
 * @param startP 选区范围开始段落
 * @param endP 选区范围结束段落
 * @param startPartial 选区开始位置在 startP 下的最外层祖先
 * @param endPartial 选区结束位置在 endP 下的最外层祖先
 * @param startUnselected startPartial 中未被选区范围包含的内容的克隆片段
 * @param endUnselected endPartial 中未被选区范围包含的内容的克隆片段
 * @returns 命令结束光标位置
 */
const addCmdsToMergeEqualParagraph = (
  cmds: Et.CommandQueue,
  startP: Et.Paragraph, endP: Et.Paragraph,
  startPartial: Et.NodeOrNull, endPartial: Et.NodeOrNull,
  startUnselected: Et.Fragment, endUnselected: Et.Fragment,
  affinityPreference?: boolean,
) => {
  const startPrev = startPartial ? startPartial.previousSibling : startP.lastChild
  const endNext = endPartial ? endPartial.nextSibling : endP.firstChild
  let startInsertAt = startPartial ? cr.caretOutStart(startPartial) : cr.caretInEndNow(startP)
  let mergedContents: Et.Fragment | null = null, destCaretRange
  const out = fragmentUtils.getMergedEtFragmentAndCaret(
    startUnselected, endUnselected, false, false, affinityPreference ?? true, // 若为定义, 优先亲和到前者
  )
  if (out) {
    mergedContents = out[0]
    destCaretRange = out[1]
  }
  // 插回内容为空, 须要考虑合并前后节点
  else {
    if (startPrev && endNext && dom.isEqualNode(startPrev, endNext)) {
      cmds.push(
        cmd.removeNode({ node: startPrev }),
        cmd.removeNode({ node: endNext }),
      )
      const out = fragmentUtils.cloneAndMergeNodesToEtFragmentAndCaret(
        startPrev, endNext, false,
      )
      if (!out) { // 理论上不可能为null
        return null
      }
      mergedContents = out[0]
      destCaretRange = out[1]
      startInsertAt = cr.caretOutStart(startPrev)
    }
    else {
      destCaretRange = startPrev ? cr.caretEndAuto(startPrev) : cr.caretInStart(startP)
    }
  }
  // 插回内容
  if (mergedContents) {
    cmds.push(cmd.insertContent({
      content: mergedContents,
      execAt: startInsertAt,
      destCaretRange,
    }))
    startInsertAt = cr.caretMoved(startInsertAt, mergedContents.childNodes.length)
  }
  // 移除 endP
  cmds.push(cmd.removeNode({ node: endP }))
  // 移动剩余节点
  if (endNext) {
    tryToMoveNodes(cmds, endNext, endP.lastChild, startInsertAt)
  }
  return destCaretRange
}

/**
 * @deprecated 该方法已被 {@link removeSpanningParagraphs} 取代
 */
export const removeInDifferentParagraphWithSameParent = (
  ctx: Et.EditorContext,
  targetRange: Et.ValidTargetRange,
  startP: Et.Paragraph, endP: Et.Paragraph,
) => {
  // return removeInDifferentParagraph(ctx, targetRange, startP, endP)
  return removeSpanningParagraphs(ctx, targetRange, startP, endP)
}
/**
 * @deprecated 该方法已被 {@link removeSpanningParagraphs} 取代
 */
export const removeInDifferentParagraphWithSameTopElement = (
  ctx: Et.EditorContext,
  targetRange: Et.ValidTargetRange,
  startP: Et.Paragraph, endP: Et.Paragraph,
) => {
  // return removeInDifferentParagraph(ctx, targetRange, startP, endP)
  return removeSpanningParagraphs(ctx, targetRange, startP, endP)
}
/**
 * @deprecated 该方法已被 {@link removeSpanningParagraphs} 取代
 */
export const removeInDifferentTopElement = (
  ctx: Et.EditorContext,
  targetRange: Et.ValidTargetRange,
  startP: Et.Paragraph, endP: Et.Paragraph,
) => {
  // return removeInDifferentParagraph(ctx, targetRange, startP, endP)
  return removeSpanningParagraphs(ctx, targetRange, startP, endP)
}
