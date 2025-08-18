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
import { checkTargetRangePosition, cloneRangeUnselectedContents } from '../../utils/handler'

/**
 * 移除当前选区选中内容; collapsed 时不执行, 返回 false
 * @param ctx 更新后的编辑器上下文
 * @returns 是否成功移除内容
 */
export const removeRangingContents = (ctx: Et.UpdatedContext) => {
  return removeByTargetRange(ctx, ctx.selection.range)
}

/**
 * 移除指定范围内容; collapsed 时不执行, 返回 false
 * @param ctx 更新后的编辑器上下文
 * @param range 目标范围
 * @returns 是否成功移除内容
 */
export const removeByTargetRange = (ctx: Et.UpdatedContext, range: Et.StaticRange) => {
  if (range.collapsed) {
    return false
  }
  return checkTargetRangePosition(
    ctx, range,
    removeInSameTextNode,
    removeInSameParagraph,
    removeInDifferentParagraphWithSameParent,
    removeInDifferentParagraphWithSameTopElement,
    removeInDifferentTopElement,
  )
}

/** 同一 #text 内删除 */
export const removeInSameTextNode = (
  ctx: Et.UpdatedContext,
  targetRange: Et.StaticRange,
  currP: Et.Paragraph, textNode: Et.Text,
) => {
  // targetRange 必定在 node 上
  // 删除文本片段
  if (targetRange.startOffset > 0 || targetRange.endOffset < textNode.length) {
    ctx.commandManager.push(cmd.deleteText({
      text: textNode,
      data: textNode.data.slice(targetRange.startOffset, targetRange.endOffset),
      offset: targetRange.startOffset,
      isBackward: true,
      setCaret: true,
    }))
    return true
  }
  // 删除整个#text节点, 连带删除以其为唯一子节点的祖先
  let removeNode = traversal.outermostAncestorWithSelfAsOnlyChildButUnder(textNode, currP)
  if (removeNode === currP) {
    removeNode = textNode
  }
  ctx.commandManager.push(cmd.removeNode({
    node: removeNode,
  }))
  return true
}
/** 同一段落内删除 */
export const removeInSameParagraph = (
  ctx: Et.UpdatedContext,
  targetRange: Et.StaticRange,
  currP: Et.Paragraph, commonAncestor: Et.NullableHTMLNode,
) => {
  if (!commonAncestor) {
    return false
  }
  let removeCmd
  let cloneIncludeContainer: boolean
  // 选区公共祖先是段落, 删除段落内容
  if (currP === commonAncestor) {
    cloneIncludeContainer = false
    const removeRange = cr.spanRangeAllIn(currP)
    if (!removeRange) {
      return false
    }
    removeCmd = cmd.removeContent({
      removeRange,
    })
  }
  // 选区公共祖先不是段落, 删除公共祖先
  else {
    cloneIncludeContainer = true
    removeCmd = cmd.removeNode({
      node: commonAncestor,
    })
  }
  const [df1, df2] = cloneRangeUnselectedContents(
    targetRange, commonAncestor, commonAncestor, cloneIncludeContainer, true,
  )
  const out = fragmentUtils.mergeFragmentsWithCaret(df1, df2)
  if (!out) {
    return false
  }
  ctx.commandManager.commit()
  ctx.commandManager.commitNextHandle()
  ctx.commandManager.push([
    removeCmd,
    cmd.insertContent({
      content: out[0],
      execAt: cr.caretInStart(currP),
      destCaretRange: out[1],
    }),
  ])
  return true
}
/** 同父节点下的跨不同段落删除 */
export const removeInDifferentParagraphWithSameParent = (
  ctx: Et.UpdatedContext,
  targetRange: Et.StaticRange,
  startP: Et.Paragraph, endP: Et.Paragraph,
) => {
  // 两个都是普通段落, 或是相同的效应元素;
  // 删除前段落内容, 移除后段落及之前的所有段落
  // 将前段落未选择内容与后段落未选择内容合并, 插入前段落
  if (startP.isEqualTo(endP)) {
    const [df1, df2] = cloneRangeUnselectedContents(
      targetRange, startP, endP, false, true,
    )
    const out = fragmentUtils.mergeFragmentsWithCaret(df1, df2, false, false) // 上面已经 clean, 此处不 clean
    if (!out) {
      return false
    }

    const cmds = []
    const removeRange1 = cr.spanRangeAllIn(startP)
    const removeRange2 = cr.spanRange(startP.nextSibling, endP)
    // removeRange 不存在只有一种情况, 即 段落为空, 且 css 设置了高度, 让光标能落在其中
    // 此时不用做删除处理
    if (removeRange1) {
      cmds.push(cmd.removeContent({
        removeRange: removeRange1,
      }))
    }
    if (removeRange2) {
      cmds.push(cmd.removeContent({
        removeRange: removeRange2,
      }))
    }
    cmds.push(cmd.insertContent({
      content: out[0],
      execAt: cr.caretInStart(startP),
      destCaretRange: out[1],
    }))
    ctx.commandManager.commit()
    ctx.commandManager.commitNextHandle()
    ctx.commandManager.push(cmds)
  }
  // 俩段落不同, 移除中间段落
  // 删除俩段落内容, 并插回未选择内容
  else {
    const [df1, df2] = cloneRangeUnselectedContents(
      targetRange, startP, endP, false, true,
    )

    const removeInStart = cr.spanRangeAllIn(startP)
    const removeOfEnd = df2.hasChildNodes()
      ? cr.spanRangeAllIn(endP)
      : cr.spanRangeAllOut(endP) // df2没有内容, 即没有剩余内容插入 endP, 将endP 删除
    const removeBetween = startP.nextSibling === endP
      ? null
      : cr.spanRange(startP.nextSibling, endP.previousSibling)

    addRemoveAndInsertContentCmdsForTwoParagraph(ctx,
      [removeInStart, removeBetween, removeOfEnd], startP, endP, df1, df2)
  }
  return true
}
const addRemoveAndInsertContentCmdsForTwoParagraph = (
  ctx: Et.UpdatedContext,
  removeRanges: (Et.SpanRange | null)[],
  startP: Et.Paragraph, endP: Et.Paragraph,
  startContent: Et.Fragment, endContent: Et.Fragment,
) => {
  const cmds = []
  for (const rm of removeRanges) {
    if (!rm) continue
    cmds.push(cmd.removeContent({
      removeRange: rm,
    }))
  }

  let caretSetted = false
  if (startContent.hasChildNodes()) {
    cmds.push(cmd.insertContent({
      content: startContent,
      execAt: cr.caretInStart(startP),
      destCaretRange: cr.caretOutEnd(startContent.lastChild as Et.Node),
    }))
    caretSetted = true
  }
  if (endContent.hasChildNodes()) {
    cmds.push(cmd.insertContent({
      content: endContent,
      execAt: cr.caretInStart(endP),
      destCaretRange: caretSetted ? void 0 : cr.caretInStart(endP),
    }))
  }

  ctx.commandManager.commit()
  ctx.commandManager.commitNextHandle()
  ctx.commandManager.push(cmds)
}
/**
 * 同顶层节点, 段落父节点不同, 跨段落删除
 * @example
 * <list>  // top, commonAncestor
 *    <list>
 *      <listItem></listItem>  // startP
 *    </list>
 *    <listItem></listItem>  // endP
 * <list>
 *
 * <list>  // top, commonAncestor
 *    <listItem></listItem>  // startP
 *    <list>
 *      <listItem></listItem>  // endP
 *    </list>
 * <list>
 *
 * <list>  // top, commonAncestor
 *    <list>
 *      <listItem></listItem>  // startP
 *    </list>
 *    <list>
 *      <listItem></listItem>  // endP
 *    </list>
 * <list>
 *
 * <blockquote>  // top
 *   <list>  // commonAncestor
 *      <list>
 *        <listItem></listItem>  // startP
 *      </list>
 *      <listItem></listItem>  // endP
 *   <list>
 * </blockquote>
 *
 */
export const removeInDifferentParagraphWithSameTopElement = (
  ctx: Et.UpdatedContext,
  targetRange: Et.StaticRange,
  startP: Et.Paragraph, endP: Et.Paragraph,
  _topEl: Et.Paragraph,
  commanAncestor: Et.HTMLElement,
) => {
  // `ref.`[extractContents](https://dom.spec.whatwg.org/#concept-range-extract)
  // 1. 获取 partial_contained 节点
  // 2. 移除 start_partial ~ end_partial 之间的 contained 节点
  // 3. 克隆 startP, endP 未被选择内容
  // 4. 移除 startP, endP 内容, 若移除后变为空节点, 在连带删除以其为唯一后代的祖先
  // 5. 3.克隆的内容插回各自节点
  // 6. 光标置于 startP末尾(插回内容非空) 或开头(插回内容为空)
  if (startP.parentNode === endP.parentNode) {
    return removeInDifferentParagraphWithSameParent(ctx, targetRange, startP, endP)
  }
  const startPartial = traversal.outermostAncestorUnderTheNode(startP, commanAncestor)
  const endPartial = traversal.outermostAncestorUnderTheNode(endP, commanAncestor)
  const [df1, df2] = cloneRangeUnselectedContents(
    targetRange, startP, endP, false, true,
  )

  const removeInStart = cr.spanRangeAllIn(startP)
  const removeOfEnd = df2.hasChildNodes()
    ? cr.spanRangeAllIn(endP)
    : cr.spanRangeAllOut(
        traversal.outermostAncestorWithSelfAsOnlyChildButUnder(endP, commanAncestor),
      )
  const removeBetween = startPartial.nextSibling === endPartial
    ? null
    : cr.spanRange(startPartial.nextSibling, endPartial.previousSibling)

  addRemoveAndInsertContentCmdsForTwoParagraph(ctx,
    [removeInStart, removeBetween, removeOfEnd], startP, endP, df1, df2,
  )
  return true
}
/**
 * 跨不同顶层节点删除
 * @example
 * <et-body>  // commonAncestor
 *    <blockquote>  // startTop
 *       <p></p>  // startP
 *    </blockquote>
 *    <blockquote>  // endTop
 *       <p></p>  // endP
 *    </blockquote>
 * </et-body>
 *
 * <et-body>  // commonAncestor
 *    <blockquote>  // startTop
 *       <p></p>  // startP
 *    </blockquote>
 *    <other-top></other-top>  // endTop, endP
 * </et-body>
 *
 */
export const removeInDifferentTopElement = (
  ctx: Et.UpdatedContext,
  targetRange: Et.StaticRange,
  _startP: Et.Paragraph, _endP: Et.Paragraph,
  startTop: Et.Paragraph, endTop: Et.Paragraph,
  _commanAncestor: Et.HTMLElement,
) => {
  // 顶层节点相同, 删除选择, 合并剩余内容
  if (startTop.isEqualTo(endTop)) {
    // 类似 removeInDifferentParagraphWithSameParent
    // 但此处需要将顶层节点也包含进克隆范围
    const [df1, df2] = cloneRangeUnselectedContents(
      targetRange, startTop, endTop, true, true,
    )
    const out = fragmentUtils.mergeFragmentsWithCaret(df1, df2, false, false)
    const removeRange = cr.spanRange(startTop, endTop)
    if (!out || !removeRange) {
      return false
    }

    const cmds: Et.Command[] = [
      cmd.removeContent({
        removeRange,
      }),
    ]

    if (out[0].hasChildNodes()) {
      cmds.push(cmd.insertContent({
        content: out[0],
        execAt: cr.caretOutStart(startTop),
        destCaretRange: out[1],
      }))
    }
    else {
      // 合并内容为空, 若编辑区删除 startTop 和 endTop 后无内容,
      // 则需要补充一个段落 (编辑区必须至少有一个段落)
      let nextTop = startTop.previousSibling
      if (nextTop) {
        ctx.setCaretToAParagraph(nextTop, false)
      }
      else {
        nextTop = endTop.nextSibling
        if (nextTop) {
          ctx.setCaretToAParagraph(nextTop, true)
        }
        else {
          nextTop = ctx.createParagraph()
          cmds.push(cmd.insertNode({
            node: nextTop,
            execAt: cr.caretOutStart(startTop),
            destCaretRange: cr.caretInStart(nextTop),
          }))
        }
      }
    }
    ctx.commandManager.commit()
    ctx.commandManager.commitNextHandle()
    ctx.commandManager.push(cmds)
  }
  // 顶层节点不同, 删除选择部分, 插回剩余内容
  else {
    const [df1, df2] = cloneRangeUnselectedContents(
      targetRange, startTop, endTop, true, false,
    )
    // 克隆出来的片段, 必定有且只有一个子元素 (即顶层节点的克隆)
    if (df1.childElementCount !== 1 || df2.childElementCount !== 1) {
      return false
    }
    // 使用构造器校验剩余内容是否规范
    const startTopCtor = ctx.effectInvoker.getEtElCtor(startTop)
    const endTopCtor = ctx.effectInvoker.getEtElCtor(endTop)
    const normalStartTop = startTopCtor.getNormalized(df1.firstElementChild as Et.Paragraph)
    const normalEndTop = endTopCtor.getNormalized(df2.firstElementChild as Et.Paragraph)

    const cmds: Et.Command[] = []

    let removeRange, removeStart, removeEnd, destCaretRange = null, bothRemoved = false
    // startTop 的未选择部分是规范的, 不用删除 startTop, 只需删除其内容, 然后插回规范内容即可
    if (normalStartTop) {
      removeRange = cr.spanRangeAllIn(startTop)
      if (removeRange) {
        cmds.push(cmd.removeContent({ removeRange }))
      }
      const content = dom.extractElementContents(normalStartTop)
      cmds.push(cmd.insertContent({
        content,
        execAt: cr.caretInStart(startTop),
      }))
      destCaretRange = content.lastChild
        ? cr.caretInEnd(content.lastChild)
        : cr.caretInStart(startTop)
      removeStart = startTop.nextSibling === endTop ? null : startTop.nextSibling
    }
    // 不规范, 整个删除, 不需要插回
    else {
      bothRemoved = true
      removeStart = startTop
    }
    if (normalEndTop) {
      removeRange = cr.spanRangeAllIn(endTop)
      if (removeRange) {
        cmds.push(cmd.removeContent({ removeRange }))
      }
      const content = dom.extractElementContents(normalEndTop)
      cmds.push(cmd.insertContent({
        content,
        execAt: cr.caretInStart(endTop),
      }))
      // 只有 startTop 被移除了, 才会把命令结束光标位置设置在 endTop 内
      if (bothRemoved) {
        destCaretRange = content.firstChild
          ? cr.caretInStart(content.firstChild)
          : cr.caretInStart(endTop)
      }
      bothRemoved = false
      removeEnd = endTop.previousSibling === startTop ? null : endTop.previousSibling
    }
    else {
      removeEnd = endTop
    }

    if (removeStart && removeEnd) {
      removeRange = cr.spanRange(removeStart, removeEnd)
    }
    else if (removeStart) {
      removeRange = cr.spanRangeAllOut(removeStart)
    }
    else if (removeEnd) {
      removeRange = cr.spanRangeAllOut(removeEnd)
    }

    if (removeRange) {
      cmds.push(cmd.removeContent({ removeRange }))
    }

    // 若两个都被删除了, 要判断编辑区是否为空
    if (bothRemoved) {
      let nextTop = startTop.previousSibling
      if (nextTop) {
        ctx.setCaretToAParagraph(nextTop, false)
        nextTop = null
      }
      else {
        nextTop = endTop.nextSibling
      }
      if (nextTop) {
        ctx.setCaretToAParagraph(nextTop, true)
      }
      else {
        nextTop = ctx.createParagraph()
        destCaretRange = cr.caretInStart(nextTop)
        cmds.push(cmd.insertNode({
          node: nextTop,
          execAt: cr.caretInStart(ctx.body),
        }))
      }
    }
    cmds[cmds.length - 1].destCaretRange = destCaretRange ?? void 0
    ctx.commandManager.commit()
    ctx.commandManager.commitNextHandle()
    ctx.commandManager.push(cmds)
  }
  return true
}

/**
 * 判断俩段落是否相同, 相同则 添加智能删除命令并返回 true, 否则返回 false,
 * 用于段落开头 Backspace 或末尾 Delete;\
 * 智能删除: 智能处理边缘合并, 以及合并后的光标位置\
 * @param mergeTo 保留的段落
 * @param toRemoved 要移除的段落
 */
export const checkEqualParagraphAndSmartMerge = (
  ctx: Et.UpdatedContext,
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

  // 1. 移除 mergeTo段落 的末尾节点 和 toRemoved段落 的开头节点
  // 2. 克隆俩节点并合并插入到 mergeTo段落 末尾
  // 3. 提取 toRemoved段落 的剩余内容 (不克隆, 直接转移到 mergeTo段落 末尾)
  // 4. 光标置于合并内容中间位置

  const prevLast = mergeTo.lastChild as Et.Node
  const nextFirst = toRemoved.firstChild as Et.Node
  const prevLastClone = prevLast.cloneNode(true) as Et.Node
  const nextFirstClone = nextFirst.cloneNode(true) as Et.Node
  const df1 = document.createDocumentFragment() as Et.Fragment
  const df2 = document.createDocumentFragment() as Et.Fragment
  df1.appendChild(prevLastClone)
  df2.appendChild(nextFirstClone)

  const out = fragmentUtils.mergeFragmentsWithCaret(df1, df2)
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
  moveParagraphChilNodesToOtherTail(ctx, mergeTo, toRemoved, destCaretRange)
  return true
}
const moveParagraphChilNodesToOtherTail = (
  ctx: Et.UpdatedContext,
  mergeTo: Et.Paragraph,
  toRemoved: Et.Paragraph,
  destCaretRange?: Et.CaretRange,
) => {
  ctx.commandManager.push(cmd.functional({
    meta: {
      from: toRemoved,
      to: mergeTo,
      startChild: null as Et.NullableNode,
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
 * mergeTo 和 toRemoved 由调用者判断, 是不同的段落, 才会调用此方法
 * @param mergeTo 克隆内容插入到的段落
 * @param toRemoved 要移除的段落
 */
export const removeParagraphAndMergeCloneContentsToOther = (
  ctx: Et.UpdatedContext,
  mergeTo: Et.Paragraph,
  toRemoved: Et.Paragraph,
): boolean => {
  const r = document.createRange() as Et.Range
  r.selectNodeContents(toRemoved)
  const df = r.cloneContents()
  fragmentUtils.cleanAndNormalizeFragment(df, mergeTo.inEtCode, mergeTo.notInEtCode, true)

  const prevLast = mergeTo.lastChild
  const nextFirst = df.firstChild

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
      content: df,
      execAt: cr.caretOutEnd(mergeTo),
    }))
    return true
  }

  // 前不为空, 要考虑是否合并的问题
  if (dom.isEqualNode(prevLast, nextFirst)) {
    const prevLastClone = prevLast.cloneNode(true)
    const df1 = document.createDocumentFragment() as Et.Fragment
    df1.appendChild(prevLastClone)
    const out = fragmentUtils.mergeFragmentsWithCaret(df1, df)
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
