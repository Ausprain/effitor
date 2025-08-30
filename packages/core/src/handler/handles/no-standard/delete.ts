import type { Et } from '~/core/@types'
import { etcode } from '~/core/element'
import { EtTypeEnum } from '~/core/enums'
import { cr } from '~/core/selection'

import { cmd } from '../../command'
import { createEffectHandle } from '../../utils'
import {
  checkEqualParagraphSmartRemoveAndMerge,
  removeParagraphAndMergeCloneContentsToOther,
} from '../delete/delete.shared'
import { removeByTargetRange } from '../delete/deleteAtRange'

/**
 * 处理在段落开头 Backspace
 */
export const backspaceAtParagraphStart = createEffectHandle('BackspaceAtParagraphStart', (_this, ctx, targetCaret) => {
  const currP = targetCaret.anchorParagraph
  const isEmpty = currP.isEmpty()
  let prevPT = currP.previousSibling as Et.Paragraph | null

  // 当前段落有前兄弟
  if (prevPT) {
    if (isEmpty) {
      ctx.commandManager.push(cmd.removeNode({
        node: currP,
        destCaretRange: null,
      }))
      ctx.setCaretToAParagraph(prevPT, false)
      return true
    }
    if (checkEqualParagraphSmartRemoveAndMerge(ctx, prevPT, currP)) {
      return true
    }
    let prevPinnerP = prevPT
    // blockquote末段落可能也是 Component
    if (etcode.check(prevPT, EtTypeEnum.Blockquote)) {
      prevPinnerP = prevPT.lastParagraph
    }
    if (etcode.check(prevPinnerP, EtTypeEnum.Component)) {
      prevPinnerP.focusToInnerEditable(ctx, false)
      return true
    }
    if (prevPinnerP !== prevPT) {
      // 判断当前段落是否可并入上一顶层节点末段落
      if (checkEqualParagraphSmartRemoveAndMerge(ctx, prevPinnerP, currP)) {
        return true
      }
      ctx.setSelection(prevPinnerP.innerEndEditingBoundary())
      return true
    }
    // prevP 与 currP 不同, 且既不是 Blockquote 也不是 Component
    // 删除 currp, 将 currp 内容克隆按效应规则插入 prevP 末尾
    return removeParagraphAndMergeCloneContentsToOther(ctx, prevPT, currP)
  }
  // 当前段落无前兄弟, 判断顶层节点
  const topEl = targetCaret.anchorTopElement
  prevPT = topEl.previousSibling as Et.Paragraph | null

  // 段落和顶层节点均无前兄弟
  if (!prevPT) {
    if (!isEmpty) {
      // 首段落开头, 非空段落, 不处理
      return true
    }
    // 当前为空, 有后兄弟, 删除当前, 光标置于后兄弟开头
    const nextP = currP.nextSibling as Et.Paragraph | null
    if (nextP) {
      ctx.commandManager.push(cmd.removeNode({
        node: currP,
        destCaretRange: null,
      }))
      ctx.setCaretToAParagraph(nextP, true)
      return true
    }
    // 首段落是空的普通段落, 不用处理
    if (ctx.isPlainParagraph(topEl)) {
      return true
    }
    // 当前段落是顶层节点唯一子节点, 顶层节点回退为普通段落
    if (currP.parentNode === topEl) {
      const newP = topEl.regressToPlainParagraph(ctx)
      ctx.commandManager.push(cmd.replaceNode({
        oldNode: topEl,
        newNode: newP,
        destCaretRange: cr.caretInStart(newP),
      }))
      return true
    }
    // 未知情况
    return false
  }

  // 顶层节点有前兄弟
  if (!isEmpty) {
    // 当前段落非空, 判断顶层节点合并
    if (prevPT.isEqualTo(topEl)) {
      const r = prevPT.innerEndEditingBoundary().toRange()
      if (r) {
        r.setEnd(currP, 0)
        const tr = ctx.selection.createTargetRange(r)
        if (!tr) {
          return false
        }
        if (removeByTargetRange(ctx, tr)) {
          return true
        }
      }
    }
    // 否则, 光标置于前兄弟末尾
    ctx.setCaretToAParagraph(prevPT, false)
    return true
  }
  // 当前段落有后兄弟, 则删除当前, 否则删除顶层节点
  const removeNode = currP.nextSibling ? currP : topEl
  ctx.commandManager.push(cmd.removeNode({
    node: removeNode,
    destCaretRange: null,
  }))
  ctx.setCaretToAParagraph(prevPT, false)
  return true
})
/**
 * 处理在段落末尾 Delete
 */
export const deleteAtParagraphEnd = createEffectHandle('DeleteAtParagraphEnd', (_this, ctx, targetCaret) => {
  const currP = targetCaret.anchorParagraph
  const isEmpty = currP.isEmpty()
  let nextPT = currP.nextSibling as Et.Paragraph | null

  // 当前段落有后兄弟
  if (nextPT) {
    if (isEmpty) {
      ctx.commandManager.push(cmd.removeNode({
        node: currP,
        destCaretRange: null,
      }))
      ctx.setCaretToAParagraph(nextPT, true)
      return true
    }
    if (checkEqualParagraphSmartRemoveAndMerge(ctx, currP, nextPT)) {
      return true
    }
    let nextPinnerP = nextPT
    if (etcode.check(nextPT, EtTypeEnum.Blockquote)) {
      nextPinnerP = nextPT.firstParagraph
    }
    if (etcode.check(nextPinnerP, EtTypeEnum.Component)) {
      nextPinnerP.focusToInnerEditable(ctx, true)
      return true
    }
    if (nextPinnerP !== nextPT) {
      ctx.setSelection(nextPinnerP.innerStartEditingBoundary())
      return true
    }
    return removeParagraphAndMergeCloneContentsToOther(ctx, currP, nextPT)
  }

  // 当前段落无后兄弟
  const topEl = targetCaret.anchorTopElement
  nextPT = topEl.nextSibling as Et.Paragraph | null

  // 顶层节点无后兄弟
  if (!nextPT) {
    if (!isEmpty) {
      return true
    }
    const prevP = currP.previousSibling as Et.Paragraph | null
    if (prevP) {
      ctx.commandManager.push(cmd.removeNode({
        node: currP,
        destCaretRange: null,
      }))
      ctx.setCaretToAParagraph(prevP, false)
      return true
    }
    if (ctx.isPlainParagraph(topEl)) {
      return true
    }
    if (currP.parentNode === topEl) {
      const newP = topEl.regressToPlainParagraph(ctx)
      ctx.commandManager.push(cmd.replaceNode({
        oldNode: topEl,
        newNode: newP,
        destCaretRange: cr.caretInStart(newP),
      }))
      return true
    }
    return false
  }

  // 顶层节点有后兄弟
  // 后兄弟是普通段落, 考虑合并
  if (ctx.isPlainParagraph(nextPT)) {
    if (checkEqualParagraphSmartRemoveAndMerge(ctx, currP, nextPT)) {
      return true
    }
  }
  // 顶层节点相同, 合并
  else if (topEl.isEqualTo(nextPT)) {
    const r = nextPT.innerStartEditingBoundary().toRange()
    if (r) {
      r.setEnd(currP, 0)
      const tr = ctx.selection.createTargetRange(r)
      if (!tr) {
        return false
      }
      if (removeByTargetRange(ctx, tr)) {
        return true
      }
    }
  }
  ctx.setCaretToAParagraph(nextPT, true)
  return true
})
