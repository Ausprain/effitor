/**
 * insertParagraph 插入的段落以当前光标所在段落为模板, 通过 ctx.cloneParagraph 方法
 * 创建新段落以插入;
 * 此处的 insertParagraph 含义更准确的描述是 "在当前选区位置按下 Enter 键", 而并未在
 * 当前选区位置插入一个段落元素
 */
import type { Et } from '../../../@types'
import { cr } from '../../../selection'
import { dom } from '../../../utils'
import { cmd } from '../../command'
import { createInputEffectHandle } from '../../utils'
import {
  addCmdsToRemoveEndPartiallyContained,
  addCmdsToRemoveStartPartiallyContained,
  cloneUnselectedContentsOfPartial,
  removeInSameTextNode,
} from '../delete/deleteAtRange'
import {
  checkTargetRangePosition,
  tryToMoveNodes,
  tryToRemoveNodesBetween,
} from '../shared'

export const insertParagraph = createInputEffectHandle(function (ctx, pl) {
  if (!pl.targetRange.collapsed) {
    return insertParagraphAtRange(ctx, pl.targetRange)
  }
  const tc = pl.targetRange.toTargetCaret()
  if (tc.isCaretAtParagraphStart()) {
    return this.InsertParagraphAtParagraphStart?.(ctx, tc)
  }
  if (tc.isCaretAtParagraphEnd()) {
    return this.InsertParagraphAtParagraphEnd?.(ctx, tc)
  }
  return insertParagraphAtCaret(ctx, tc)
})

export const insertParagraphAtRange = (
  ctx: Et.EditorContext, tr: Et.ValidTargetRange,
) => {
  return checkTargetRangePosition(ctx, tr,
    (ctx, tr, currP, textNode) => {
      // 文本节点是段落子节点, 且完全删除, 则直接删除文本节点, 拆分段落;
      // 其他情况则先删除选区, 再按光标逻辑处理
      if (textNode.parentNode !== currP
        || tr.startOffset !== 0 || tr.endOffset !== textNode.length
      ) {
        removeInSameTextNode(ctx, tr, currP, textNode)
        // ctx.commandManager.push(cmd.removeText(textNode, tr.startOffset, tr.endOffset, true, false))
        ctx.commandManager.handle()
        if (!ctx.commandManager.lastCaretRange) {
          return true
        }
        const tc = ctx.selection.createTargetCaret(ctx.commandManager.lastCaretRange)
        if (!tc) {
          return true
        }
        return insertParagraphAtCaret(ctx, tc)
      }
      ctx.commandManager.push(cmd.removeNode({ node: textNode }))
      const newP = ctx.cloneParagraph(currP, false)
      if (!tryToMoveNodes(ctx.commandManager, textNode.nextSibling, currP.lastChild, cr.caretInStart(newP))) {
        // 没有移入内容，添加一个 br
        ctx.appendBrToElement(newP)
      }
      ctx.commandManager.push(cmd.insertNode({
        node: newP,
        execAt: cr.caretOutEnd(currP),
        destCaretRange: cr.caretInStart(newP),
      }))
      return true
    },
    (ctx, tr, currP) => {
      // 连同 partial 移除, 后续节点移动到新段落
      const newP = ctx.cloneParagraph(currP, false)
      const startPartial = tr.getStartPartialNode('paragraph')
      const endPartial = tr.getEndPartialNode('paragraph')
      if (!startPartial && !endPartial) {
        // 都没有, 说明在空段落内, 直接插入新段落
        ctx.appendBrToElement(newP)
        ctx.commandManager.push(cmd.insertNode({
          node: newP,
          execAt: cr.caretOutEnd(currP),
          destCaretRange: cr.caretInStart(newP),
        }))
        return true
      }
      if (!startPartial || !endPartial) {
        // 有一个没有, 理论上不会发生, 因为在段落内, 不存在一个非 collapsed 的范围开始在段落末尾而结束在段落开头
        return true
      }
      let notEmptyNewP = false
      const moveStart = endPartial.nextSibling
      if (moveStart) {
        notEmptyNewP = tryToMoveNodes(ctx.commandManager, moveStart, currP.lastChild, cr.caretInStart(newP))
      }
      // 移除中间节点
      tryToMoveNodes(ctx.commandManager, startPartial, endPartial, null)
      // 插回未选择内容
      const [df1, df2] = cloneUnselectedContentsOfPartial(tr, startPartial, endPartial)
      addCmdsToInsertUnselectedPartialContents(
        ctx.commandManager, df1, df2, cr.caretOutStart(startPartial), cr.caretInStart(newP),
      )
      let destCaretRange = cr.caretInStart(newP)
      if (df2.firstChild) {
        notEmptyNewP = true
        destCaretRange = cr.caretStartAuto(df2.firstChild)
      }
      if (!notEmptyNewP) {
        ctx.appendBrToElement(newP)
        destCaretRange = cr.caretInAuto(newP)
      }
      // 插入新段落
      ctx.commandManager.push(cmd.insertNode({
        node: newP,
        execAt: cr.caretOutEnd(currP),
        destCaretRange,
      }))
      return true
    },
    (ctx, tr, startP, endP) => {
      // 类似 removeSpanningParagraphs, 但不合并, 直接删除选中内容然后插入未选内容即可
      const { startAncestor, endAncestor } = tr
      if (!startAncestor || !endAncestor) {
        return false
      }
      const cmds: Et.Command[] = []
      const startPartial = tr.getStartPartialNode('paragraph')
      const endPartial = tr.getEndPartialNode('paragraph')
      const [df1, df2] = cloneUnselectedContentsOfPartial(tr, startPartial, endPartial)
      const endPartialHasUnselected = df2.hasChildNodes()
      addCmdsToRemoveStartPartiallyContained(cmds, startPartial, startP, startAncestor)
      const endAncestorPartial = addCmdsToRemoveEndPartiallyContained(
        cmds, endPartial, endP, endAncestor, !endPartialHasUnselected,
      )
      tryToRemoveNodesBetween(cmds, startAncestor, endAncestor)
      // 插回未选择内容
      if (startPartial && df1.hasChildNodes()) {
        cmds.push(cmd.insertContent({
          content: df1,
          execAt: cr.caretOutStart(startPartial),
        }))
      }
      if (endPartial && endPartialHasUnselected) {
        cmds.push(cmd.insertContent({
          content: df2,
          execAt: cr.caretInStart(endP),
        }))
      }
      // endP 未被删除, 光标置于其开头
      if (endAncestorPartial && cmds.length) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        cmds[cmds.length - 1]!.destCaretRange = cr.caretInStart(endP)
      }
      // 否则, start 后插入新段落
      else {
        const newP = ctx.cloneParagraph(startP, true)
        cmds.push(cmd.insertNode({
          node: newP,
          execAt: cr.caretOutEnd(startP),
          destCaretRange: cr.caretInAuto(newP),
        }))
      }
      ctx.commandManager.push(...cmds)
      return true
    },
  )
}
export const insertParagraphAtCaret = (
  ctx: Et.EditorContext, tc: Et.ValidTargetCaret,
) => {
  ctx.commandManager.commitNextHandle()
  // 0. 光标在文本节点边缘且文本节点是段落子节点
  // 1. 光标在段落子节点间隙, 直接拆分段落
  // 2. 光标在段落子节点内部, 拆分 partial 节点
  const currP = tc.anchorParagraph
  if (!currP) {
    return false
  }
  const partialNode = tc.getPartialNode('paragraph')
  let moveNodeStart
  if (!partialNode || dom.isBrElement(partialNode)) {
    // 段落末尾, 直接插入新段落
    const newP = currP.createForInsertParagraph(ctx, 1, true)
    if (!newP) {
      return true
    }
    ctx.commandManager.push(cmd.insertNode({
      node: newP,
      execAt: cr.caretOutEnd(currP),
      destCaretRange: cr.caretInAuto(newP),
    }))
    return true
  }
  // 段落中间, 处理节点拆分和转移
  const newP = currP.createForInsertParagraph(ctx, 0, false)
  if (!newP) {
    return true
  }
  let destCaretRange = cr.caretInStart(newP)
  let needSplitPartial = false
  if (tc.container === currP) {
    // 移动partial 及其后兄弟节点到新段落
    moveNodeStart = partialNode
  }
  else {
    // 在文本节点边缘, 且文本节点是段落 直接子节点, 直接从边缘拆分
    if (tc.isAtText() && tc.container.parentNode === currP
      && (tc.startOffset === 0 || tc.endOffset === tc.container.length)
    ) {
      if (tc.startOffset === 0) {
        moveNodeStart = tc.container
        destCaretRange = cr.caret(tc.container, 0)
      }
      else {
        moveNodeStart = tc.container.nextSibling
        if (moveNodeStart) {
          destCaretRange = cr.caretStartAuto(moveNodeStart)
        }
      }
    }
    else {
      moveNodeStart = partialNode.nextSibling
      // 拆 partial 节点, 前半内容插入当前段落, 后半内容插入新段落
      needSplitPartial = true
    }
  }
  let notEmptyNewP = tryToMoveNodes(ctx.commandManager, moveNodeStart, currP.lastChild, cr.caretInStart(newP))
  // 移动节点的插入位置用了 caretInStart 而不是 caretInEnd, 则插回未选择内容(到开头)要在移动节点之后进行
  if (needSplitPartial) {
    ctx.commandManager.push(cmd.removeNode({ node: partialNode }))
    const [df1, df2] = cloneUnselectedContentsOfPartial(tc, partialNode, partialNode)
    addCmdsToInsertUnselectedPartialContents(
      ctx.commandManager, df1, df2, cr.caretOutStart(partialNode), cr.caretInStart(newP),
    )
    if (df2.firstChild) {
      destCaretRange = cr.caretStartAuto(df2.firstChild)
      notEmptyNewP = true
    }
  }
  if (!notEmptyNewP) {
    // newP 没有内容，追加一个 br
    ctx.appendBrToElement(newP)
    destCaretRange = cr.caretInAuto(newP)
  }
  ctx.commandManager.push(cmd.insertNode({
    node: newP,
    execAt: cr.caretOutEnd(currP),
    destCaretRange,
  }))
  return true
}

const addCmdsToInsertUnselectedPartialContents = (
  cmds: Et.CommandQueue,
  df1: Et.Fragment,
  df2: Et.Fragment,
  insertAt1: Et.EtCaret,
  insertAt2: Et.EtCaret,
  destCaretRange?: Et.CaretRange,
) => {
  if (df1.hasChildNodes()) {
    cmds.push(cmd.insertContent({
      content: df1,
      execAt: insertAt1,
      destCaretRange,
    }))
  }
  if (df2.hasChildNodes()) {
    cmds.push(cmd.insertContent({
      content: df2,
      execAt: insertAt2,
      destCaretRange,
    }))
  }
}
