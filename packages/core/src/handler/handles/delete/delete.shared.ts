/**
 * 根据光标位置, 以及删除方向, 判断需要删除的内容;
 * blink 底层是通过 Selection.modify 方法根据删除粒度来获取删除范围, 在用范围删除内容的;
 * 使用 Selection.modify 来判断是最准确的, 而且能满足多码点字符需要整体删除的需求;
 * 但 Selection.modify 方法太重, 每次调用浏览器都要计算一次布局 (Document::UpdateStyleAndLayout)
 *
 * ref.
 * [EditorCommand::GetTargetRanges](github/chromium/third_party/blink/renderer/core/editing/commands/editor_command.cc:2224)
 */
import type { Et } from '~/core/@types'
import { cr } from '~/core/selection'
import { dom, traversal } from '~/core/utils'

import { cmd } from '../../command'
import { fragmentUtils } from '../../utils'
import { cloneRangeUnselectedContents } from '../shared'

/**
 * 判断俩段落是否相同, 相同则 添加智能删除命令并返回 true, 否则返回 false,
 * 用于段落开头 Backspace 或末尾 Delete;\
 * 智能删除: 智能处理边缘合并, 以及合并后的光标位置\
 * @param mergeTo 保留的段落
 * @param toRemoved 要移除的段落
 */
export const checkEqualParagraphSmartRemoveAndMerge = (
  ctx: Et.EditorContext,
  mergeTo: Et.Paragraph,
  toRemoved: Et.Paragraph,
): boolean => {
  if (!mergeTo.isEqualTo(toRemoved)) {
    return false
  }

  // 后为空, 删除后, 光标置于前末尾
  if (!toRemoved.hasChildNodes()) {
    ctx.commandManager.push(cmd.removeNode({
      node: toRemoved,
      destCaretRange: cr.caretInEnd(mergeTo),
    }))
    return true
  }
  // 前为空, 删除后, 将后内容移动到前末尾, 光标置于前末尾
  if (!mergeTo.hasChildNodes()) {
    const postLast = toRemoved.lastChild
    const destCaretRange = postLast
      ? cr.caretInEnd(postLast)
      : undefined
    ctx.commandManager.push(cmd.removeNode({
      node: toRemoved,
    }))
    moveParagraphChilNodesToOtherTail(ctx, mergeTo, toRemoved, destCaretRange)
    return true
  }

  // 俩段落均有至少一个子节点
  // 1. 移除 mergeTo段落 的末尾节点 和 toRemoved段落 的开头节点
  // 2. 克隆上述俩节点并合并插入到 mergeTo段落 末尾
  // 3. 提取 toRemoved段落 的剩余内容 (不克隆, 直接转移到 mergeTo段落 末尾)
  // 4. 移除 toRemoved段落
  // 5. 光标置于合并内容中间位置

  const prevLast = mergeTo.lastChild as Et.Node
  const nextFirst = toRemoved.firstChild as Et.Node

  const out = fragmentUtils.cloneAndMergeNodesToEtFragmentAndCaret(prevLast, nextFirst, false)
  // TODO 什么情况下会返回 null? 即什么情况会让 prevLast 和 nextFirst 合并结果为空?
  // 若为空, 则删除这俩节点之后, 还需要考虑 prevLast.prev, nextFirst.next是否可合并的问题
  if (!out) {
    return false
  }
  const [mergedNode, destCaretRange] = out
  const mergeInsertAt = cr.caretOutStart(prevLast)

  ctx.commandManager.push([
    cmd.removeNode({ node: prevLast }),
    cmd.removeNode({ node: nextFirst }),
    cmd.insertContent({
      content: mergedNode,
      execAt: mergeInsertAt,
    }),
  ])
  moveParagraphChilNodesToOtherTail(ctx, mergeTo, toRemoved)
  ctx.commandManager.push(cmd.removeNode({ node: toRemoved, destCaretRange }))
  return true
}
const moveParagraphChilNodesToOtherTail = (
  ctx: Et.EditorContext,
  mergeTo: Et.Paragraph,
  toRemoved: Et.Paragraph,
  destCaretRange?: Et.CaretRange,
) => {
  ctx.commandManager.push(cmd.functional({
    meta: {
      from: toRemoved,
      to: mergeTo,
      startChild: null as Et.NodeOrNull,
    },
    execCallback() {
      const { from, to } = this.meta
      let next = from.firstChild
      this.meta.startChild = next
      while (next) {
        to.appendChild(next)
        next = from.firstChild
      }
    },
    undoCallback() {
      const { from, startChild } = this.meta
      if (!startChild) {
        return
      }
      let next = startChild.nextSibling
      while (next) {
        from.appendChild(next)
        next = startChild.nextSibling
      }
      from.prepend(startChild)
    },
    destCaretRange,
  }))
}
/**
 * 移除一个段落, 并克隆段落内容(根据效应元素类型自动过滤)插入另一段落末尾;
 * 用于 toRemoved段落开头 Backspace 或mergeTo段落末尾 Delete;
 * * mergeTo 和 toRemoved 由调用者判断, 是不同的段落, 且 mergeTo 是 toRemoved 的前兄弟, 才会调用此方法
 * @param mergeTo 克隆内容插入到的段落
 * @param toRemoved 要移除的段落
 */
export const removeParagraphAndMergeCloneContentsToOther = (
  ctx: Et.EditorContext,
  mergeTo: Et.Paragraph,
  toRemoved: Et.Paragraph,
): boolean => {
  const r = document.createRange() as Et.Range
  r.selectNodeContents(toRemoved)
  const cloneDf = r.cloneContents()
  fragmentUtils.normalizeAndCleanEtFragment(cloneDf, mergeTo, true)

  const prevLast = mergeTo.lastChild
  const nextFirst = cloneDf.firstChild

  if (!nextFirst) {
    ctx.commandManager.push(cmd.removeNode({
      node: toRemoved,
    }))
    ctx.setCaretToAParagraph(mergeTo, false)
    return true
  }

  if (!prevLast) {
    ctx.commandManager.push(cmd.removeNode({ node: toRemoved }))
    ctx.commandManager.push(cmd.insertContent({
      content: cloneDf,
      execAt: cr.caretOutEnd(mergeTo),
    }))
    return true
  }

  // 前后都不为空, 要考虑是否合并的问题
  if (dom.isEqualNode(prevLast, nextFirst)) {
    const prevDf = document.createDocumentFragment() as Et.Fragment
    prevDf.appendChild(prevLast.cloneNode(true))
    const out = fragmentUtils.getMergedEtFragmentAndCaret(prevDf, cloneDf)
    if (!out) {
      return false
    }
    ctx.commandManager.push([
      cmd.removeNode({
        node: prevLast,
      }),
      cmd.insertContent({
        content: out[0],
        execAt: cr.caretOutStart(prevLast),
        destCaretRange: out[1],
      }),
    ])
  }
  return true
}

/**
 * 移除一个节点或多个同层节点, 并自动连带删除移除后没有子节点的祖先(包含自身, 若未提供ancestorUnder, 则不包括段落),
 * 并根据被删除节点是否有相邻节点, 自动判断是否合并相邻节点;
 * * 当且仅当 startNode 与 ancestorUnder 为同一节点时, 会删除 ancestorUnder;
 * @param startNode 开始节点, 包含在移除范围中
 * @param endNode 结束节点, 包含在移除范围中
 * @param ancestorUnder 祖先节点, 若未提供, 则向上连带删除的祖先不包括段落
 */
export const removeNodesAndChildlessAncestorAndMergeSiblings = (
  ctx: Et.EditorContext,
  startNode: Et.Node,
  endNode = startNode,
  ancestorUnder?: Et.Element | null,
) => {
  if (startNode === endNode) {
    startNode = ancestorUnder
      ? traversal.outermostAncestorWithSelfAsOnlyChildButUnder(startNode, ancestorUnder)
      : traversal.outermostAncestorWithSelfAsOnlyChild(startNode)
    return removeNodesAndMergeSiblingsIfCan(ctx, startNode, startNode)
  }
  if (!startNode.parentNode || startNode.parentNode !== endNode.parentNode) {
    return false
  }
  else {
    let parentNode = startNode.parentNode as Et.Node
    if (parentNode.firstChild !== startNode || parentNode.lastChild !== endNode
      || (ancestorUnder ? parentNode === ancestorUnder : ctx.isEtParagraph(parentNode))
    ) {
      return removeNodesAndMergeSiblingsIfCan(ctx, startNode, endNode)
    }
    else {
      // 连带删除空祖先
      parentNode = ancestorUnder
        ? traversal.outermostAncestorWithSelfAsOnlyChildButUnder(parentNode, ancestorUnder)
        : traversal.outermostAncestorWithSelfAsOnlyChild(parentNode)
      return removeNodesAndMergeSiblingsIfCan(ctx, parentNode, parentNode)
    }
  }
}
/**
 * 移除一个或多个同层节点, 并根据是否有前后兄弟节点, 自动判断是否合并相邻节点;
 * 若起止节点不在同一层(父节点不同), 则直接返回 false
 * @param startNode 开始节点, 包含在移除范围中
 * @param endNode 结束节点, 包含在移除范围中
 */
export const removeNodesAndMergeSiblingsIfCan = (
  ctx: Et.EditorContext,
  startNode: Et.Node,
  endNode = startNode,
) => {
  let needMerge = false
  const prevSibling = startNode.previousSibling
  const nextSibling = endNode.nextSibling
  if (prevSibling && nextSibling
    && dom.isEqualNode(prevSibling, nextSibling)
  ) {
    needMerge = true
  }
  // 不需要合并
  if (!needMerge) {
    if (startNode === endNode) {
      ctx.commandManager.push(cmd.removeNode({ node: startNode, setCaret: true }))
    }
    else {
      const removeRange = cr.spanRange(startNode, endNode)
      if (!removeRange) {
        return false
      }
      ctx.commandManager.push(cmd.removeContent({
        removeRange,
        destCaretRange: removeRange.removeAt(),
      }))
    }
    return true
  }
  // 需要合并, 连同前后兄弟一起删除
  const removeRange = cr.spanRange(prevSibling, nextSibling)
  if (!removeRange) {
    return false
  }
  const out = fragmentUtils.cloneAndMergeNodesToEtFragmentAndCaret(
    prevSibling as Et.Node,
    nextSibling as Et.Node,
    true,
  )
  if (!out) {
    // 合并结果为空, 仅删除
    ctx.commandManager.push(cmd.removeContent({
      removeRange,
      destCaretRange: removeRange.removeAt(),
    }),
    )
    return true
  }
  ctx.commandManager.push([
    cmd.removeContent({ removeRange }),
    cmd.insertContent({
      content: out[0],
      execAt: removeRange.removeAt(),
      destCaretRange: out[1],
    }),
  ])
  return true
}

/**
 * 扩大删除, 并根据选区范围, 克隆插回未选择的内容; 可选插入额外内容以及判定插回位置前后节点与
 * 插回片段是否需要合并;
 * * 跨段落使用该方法时, 不可启用合并, 否则可能会导致前后段落被合并, 而未被 range 选择的段落本不该合并
 * @param staticRange 目标选区
 * @param startExpandNode 扩大删除的起始节点
 * @param endExpandNode 扩大删除的结束节点
 * @param extraContents 额外内容, 若提供, 则会在删除范围前插入
 * @param includeExpandNode 克隆是否包含扩大节点
 * @param checkNeedMerge 是否需要检查合并
 * @returns 是否成功添加命令, 若 起始/结束 扩大节点不是同层节点, 或不在页面上, 返回 false
 */
export const expandRemoveInsert = (
  ctx: Et.EditorContext,
  staticRange: Et.StaticRange,
  startExpandNode: Et.Node,
  endExpandNode: Et.Node,
  extraContents: Et.Fragment | null,
  includeExpandNode: boolean,
  checkNeedMerge: boolean,
) => {
  // 使用 SpanRange 强制要求俩扩大节点必须同层且在页面上, 并且开始节点在结束节点前
  let removeRange = cr.spanRange(startExpandNode, endExpandNode)
  if (!removeRange) {
    return false
  }
  if (extraContents && !extraContents.hasChildNodes()) {
    extraContents = null
  }
  startExpandNode = removeRange.startNode as Et.Node
  endExpandNode = removeRange.endNode as Et.Node

  let [df1, df2] = cloneRangeUnselectedContents(
    staticRange, startExpandNode, endExpandNode, includeExpandNode, true,
  )

  // 插入内容为空, 仅删除, 同时判断是否连带删除空祖先
  if (!df1.hasChildNodes() && !df2.hasChildNodes() && !extraContents) {
    return removeNodesAndChildlessAncestorAndMergeSiblings(ctx, startExpandNode, endExpandNode)
  }

  // 检查是否有前后兄弟需要合并到插入的片段中
  if (checkNeedMerge) {
    // 复用变量, 用于后续判定是否需要合并
    checkNeedMerge = false
    const prevSibling = startExpandNode.previousSibling
    const nextSibling = endExpandNode.nextSibling
    // df1, df2 必定有一个非空, 若有一个为空, 则应使用另一个的近端节点做合并判断
    const dfFirst = df1.hasChildNodes()
      ? df1.firstChild
      : extraContents
        ? extraContents.firstChild
        : df2.firstChild
    const dfLast = df2.hasChildNodes()
      ? df2.lastChild
      : extraContents
        ? extraContents.lastChild
        : df1.lastChild
    const prevNeedMerge = prevSibling && dfFirst && dom.isEqualNode(prevSibling, dfFirst)
    const nextNeedMerge = nextSibling && dfLast && dom.isEqualNode(dfLast, nextSibling)
    if (prevNeedMerge) {
      checkNeedMerge = true
      startExpandNode = prevSibling
      const prevDf = ctx.createFragment()
      prevDf.appendChild(prevSibling.cloneNode(true))
      df1 = fragmentUtils.mergeEtFragments(prevDf, df1)
    }
    if (nextNeedMerge) {
      checkNeedMerge = true
      endExpandNode = nextSibling
      const nextDf = ctx.createFragment()
      nextDf.appendChild(nextSibling.cloneNode(true))
      df2 = fragmentUtils.mergeEtFragments(df2, nextDf)
    }
    // 重新划定删除范围
    if (checkNeedMerge) {
      removeRange = cr.spanRange(startExpandNode, endExpandNode)
    }
  }

  if (!removeRange) {
    return false
  }

  if (extraContents) {
    df1 = fragmentUtils.mergeEtFragments(df1, extraContents)
  }

  const out = checkNeedMerge
    ? fragmentUtils.getMergedEtFragmentAndCaret(df1, df2, false, true) // 需要合并时添加一个清理, 避免出现空节点
    : fragmentUtils.getMergedEtFragmentAndCaret(df1, df2, false, false) // 上面已经 clean, 这里不用再clean

  // 插入内容为空, 仅删除, 同时判断是否连带删除空祖先
  if (!out) {
    return removeNodesAndChildlessAncestorAndMergeSiblings(ctx, startExpandNode, endExpandNode)
  }

  ctx.commandManager.push([
    startExpandNode === endExpandNode
      ? cmd.removeNode({ node: startExpandNode })
      : cmd.removeContent({ removeRange }),
    cmd.insertContent({
      content: out[0],
      execAt: removeRange.removeAt(),
      destCaretRange: out[1],
    }),
  ])
  return true
}
