/**
 * 根据光标位置, 以及删除方向, 判断需要删除的内容;
 * blink 底层是通过 Selection.modify 方法根据删除粒度来获取删除范围, 在用范围删除内容的;
 * 使用 Selection.modify 来判断是最准确的, 而且能满足多码点字符需要整体删除的需求;
 * 但 Selection.modify 方法太重, 每次调用浏览器都要计算一次布局 (Document::UpdateStyleAndLayout)
 *
 * ref.
 * [EditorCommand::GetTargetRanges](github/chromium/third_party/blink/renderer/core/editing/commands/editor_command.cc:2224)
 */
import type { Et } from '../../../@types'
import { cr } from '../../../selection'
import { dom, traversal } from '../../../utils'
import { cmd } from '../../command'
import { fragmentUtils } from '../../utils'
import { cloneRangeUnselectedContents } from '../shared'

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
      ? traversal.outermostAncestorWithSelfAsOnlyChildButUnder(startNode, ancestorUnder, true)
      : traversal.outermostAncestorWithSelfAsOnlyChild(startNode, true)
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
        ? traversal.outermostAncestorWithSelfAsOnlyChildButUnder(parentNode, ancestorUnder, true)
        : traversal.outermostAncestorWithSelfAsOnlyChild(parentNode, true)
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
const removeNodesAndMergeSiblingsIfCan = (
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
  ctx.commandManager.push(
    cmd.removeContent({ removeRange }),
    cmd.insertContent({
      content: out[0],
      execAt: removeRange.removeAt(),
      destCaretRange: out[1],
    }),
  )
  return true
}

/**
 * 扩大删除, 并根据选区范围, 克隆插回未选择的内容; 可选插入额外内容 (会自动判定插回位置前后节点与
 * 插回片段是否需要合并);
 * * 此方法不判断插入内容在插入位置的合法性
 * * 跨段落使用该方法时, 不可启用合并, 否则可能会导致前后段落被合并, 而未被 range 选择的段落本不该合并
 * @param staticRange 目标选区
 * @param startExpandNode 扩大删除的起始节点
 * @param endExpandNode 扩大删除的结束节点
 * @param insertContents 额外插入内容, 若提供, 则会插入到 `staticRange` 的位置
 * @param includeExpandNode 克隆是否包含扩大节点
 * @param checkNeedMerge 是否需要检查合并插入片段与前后兄弟节点;
 *    这在 includeExpandNode 为 false, 时是有必要的; 因为扩大节点始终会被删除, 而如果
 *    插入内容不含扩大节点边缘, 则扩大节点前后兄弟与插入内容边缘节点可能存在可合并的情况.
 *    (正常情况下, startExpandNode与其前兄弟, endExpandNode与其后兄弟, 必定不同(不可合并))
 * @param destCaretRange 命令执行后光标位置, 缺省则使用片段合并位置
 * @returns 是否成功添加命令, 若 起始/结束 扩大节点不是同层节点, 或不在页面上, 返回 false
 */
export const expandRemoveInsert = (
  ctx: Et.EditorContext,
  staticRange: Et.StaticRange,
  startExpandNode: Et.Node,
  endExpandNode: Et.Node,
  insertContents: Et.Fragment | null,
  includeExpandNode: boolean,
  checkNeedMerge: boolean,
  destCaretRange?: Et.CaretRange,
) => {
  // 使用 SpanRange 强制要求俩扩大节点必须同层且在页面上, 并且开始节点在结束节点前
  let removeRange = cr.spanRange(startExpandNode, endExpandNode)
  if (!removeRange) {
    return false
  }
  if (insertContents && !insertContents.hasChildNodes()) {
    insertContents = null
  }
  startExpandNode = removeRange.startNode as Et.Node
  endExpandNode = removeRange.endNode as Et.Node

  let [df1, df2] = cloneRangeUnselectedContents(
    staticRange, startExpandNode, endExpandNode, includeExpandNode, true,
  )

  // 插入内容为空, 仅删除, 同时判断是否连带删除空祖先
  if (!df1.hasChildNodes() && !df2.hasChildNodes() && !insertContents) {
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
      : insertContents
        ? insertContents.firstChild
        : df2.firstChild
    const dfLast = df2.hasChildNodes()
      ? df2.lastChild
      : insertContents
        ? insertContents.lastChild
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

  if (insertContents) {
    df1 = fragmentUtils.mergeEtFragments(df1, insertContents)
  }

  // 合并内容, 结束光标位置优先亲和到前者末尾
  // 需要合并时添加一个清理, 避免出现空节点
  let content: Et.Fragment | undefined
  if (destCaretRange) {
    content = fragmentUtils.mergeEtFragments(df1, df2, false, checkNeedMerge)
  }
  else {
    const out = fragmentUtils.getMergedEtFragmentAndCaret(df1, df2, false, checkNeedMerge, ctx.affinityPreference)
    content = out?.[0]
    destCaretRange = out?.[1]
  }

  // 插入内容为空, 仅删除, 同时判断是否连带删除空祖先
  if (!content) {
    return removeNodesAndChildlessAncestorAndMergeSiblings(ctx, startExpandNode, endExpandNode)
  }

  ctx.commandManager.push(
    startExpandNode === endExpandNode
      ? cmd.removeNode({ node: startExpandNode })
      : cmd.removeContent({ removeRange }),
    cmd.insertContent({
      content,
      execAt: removeRange.removeAt(),
      destCaretRange,
    }),
  )
  return true
}
