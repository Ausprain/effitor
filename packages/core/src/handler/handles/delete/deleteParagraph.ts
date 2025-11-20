/**

3. 光标在段落开头 Backspace
  3.1 当前段落有前兄弟
      0) 前兄弟为空, 删除前兄弟, 光标不变, true
      1) 段落为空, 删除(不设置结束光标), 光标移动到前兄弟末尾 (需判断前兄弟段落类型), true
      2) 与前兄弟相同, 删除当前, 智能移动内容到前兄弟末尾 (需要处理合并问题), true
      3) 前兄弟是 Component 段落, 光标移入 Component 的编辑区末尾, true
      4) 前兄弟是 Blockquote 段落
          a. 判断当前段落与 Blockquote 末段落相同, 合并
          b. 光标移入 Blockquote 的末段落末尾, true
      5) 克隆当前段落内容, 按效应规则过滤插入前兄弟末尾, true
  3.2 当前段落无前兄弟
      1) 当前段落是顶层节点 (无前兄弟)
          a. 段落非空 (编辑区开头 backspace), true
          b. 有后兄弟, 删除当前段落, 光标置于后兄弟开头 (需判断后兄弟的段落类型), true
          c. 无后兄弟
              是普通段落, true  (编辑区唯一段落)
              否则, 回退为普通段落, true
      2) 当前段落不是顶层节点
          A. 顶层节点无前兄弟(编辑区首节点)
              a. 段落非空, true
              b. 当前段落有后兄弟, 删除当前段落, 光标置于后兄弟开头 (需判断后兄弟段落类型), true
              c. 当前段落无后兄弟,
                  当前段落是顶层节点唯一段落, 顶层节点回退为普通段落, true
                  否则, false
          B. 顶层节点有前兄弟 prevTop
              a. 当前顶层节点与前兄弟相同, 合并, true
              b. 段落非空, 光标移动到 prevTop 末尾 (需判断段落类型), true
              c. 当前段落有后兄弟,
                  删除段落 (不设置结束光标位置), 将光标移动到 prevTop 末尾 (需判断段落类型), true
              d. 当前段落无后兄弟
                  删除顶层节点, 光标移动到 prevTop 末尾 (需判断段落类型), true

4. 光标在段落结尾 Delete
  4.1 当前段落有后兄弟
      0) 后兄弟为空, 删除后兄弟, 光标不变, true
      1) 段落为空, 移除(不设置结束光标), 光标移动到后兄弟开头
      2) 与后兄弟相同, 移除后兄弟, 智能移动内容到当前段落末尾 (自动处理合并问题), true
      3) 后兄弟是 Component 段落, 光标移入 Component 的编辑区开头, true
      4) 后兄弟是 Blockquote 段落, 光标移入 Blockquote 的首段落开头, true
      5) 克隆后兄弟内容, 按效应规则过滤插入当前段落末尾, true
  4.2 当前段落无后兄弟
      1) 当前段落是顶层节点 (无后兄弟)
          a. 段落非空 (编辑区末尾delete), true
          b. 有前兄弟, 删除当前, 光标置于前兄弟末尾 (需判断前兄弟段落类型) true
          c. 无前兄弟
              是普通段落, true (编辑区唯一段落)
              否则, 回退为普通段落, true
      2) 当前段落不是顶层节点
          A. 顶层节点无后兄弟(编辑区尾节点)
              a. 当前段落非空, true
              b. 当前段落有前兄弟, 删除当前段落, 光标置于前兄弟末尾 (需判断前兄弟段落类型), true
              c. 当前段落无前兄弟, true  (delete 不需要处理回退问题)
          B. 顶层节点有后兄弟 nextTop
              (不需要删除)
              a. 后兄弟是普通段落, 与当前段落相同, 合并, true
              b. 当前顶层节点与后段落相同, 合并, true
              c. 光标移动到 nextTop 开头 (需判断段落类型), true
 */

import { EtTypeEnum } from '@effitor/shared'

import type { Et } from '../../../@types'
import { etcode } from '../../../element'
import { cr } from '../../../selection'
import { dom } from '../../../utils'
import { cmd } from '../../command'
import { createEffectHandle, fragmentUtils } from '../../utils'
import { removeByTargetRange } from './deleteAtRange'

/**
 * 处理在段落开头 Backspace
 */
export const deleteBackwardAtParagraphStart = createEffectHandle('DeleteBackwardAtParagraphStart', (ctx, targetCaret) => {
  const currP = targetCaret.anchorParagraph
  if (!currP) {
    return false
  }
  const isEmpty = currP.isEmpty()
  let prevPT = currP.previousSibling as Et.Paragraph | null

  /* ------------------------------- // 当前段落有前兄弟 ------------------------------ */
  if (prevPT) {
    // 当前为空, 删除当前, 光标置于前兄弟结尾
    if (isEmpty) {
      ctx.commandManager.push(cmd.removeNode({
        node: currP,
        destCaretRange: null,
      }))
      ctx.commandManager.pushHandleCallback((_prevPT) => {
        ctx.setCaretToAParagraph(_prevPT, false, true)
      }, prevPT)
      return true
    }
    // 当前非空, 前兄弟为空, 删除前兄弟, 光标不变, true
    if (prevPT.isEmpty()) {
      ctx.commandManager.push(cmd.removeNode({
        node: prevPT,
        destCaretRange: null,
      }))
      return true
    }
    // 当前非空, 前兄弟非空, 判断合并两者
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
  // const topEl = targetCaret.anchorTopElement
  // fixed. 处理类似引用块嵌套的情况
  const topEl = ctx.body.outerParagraphs(currP).next().value
  if (!topEl) {
    return false
  }
  prevPT = topEl.previousSibling as Et.Paragraph | null

  /* ----------------------------- // 段落和顶层节点均无前兄弟 ---------------------------- */
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
      ctx.commandManager.pushHandleCallback((_nextP) => {
        ctx.setCaretToAParagraph(_nextP, true, true)
      }, nextP)
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

  /* ------------------------------- // 顶层节点有前兄弟 ------------------------------ */
  if (!isEmpty) {
    // 当前段落非空, 判断顶层节点合并
    if (prevPT.isEqualTo(topEl)) {
      const r = document.createRange()
      prevPT.innerEndEditingBoundary().adoptToRange(r, true, false)
      if (r) {
        r.setEnd(currP, 0)
        const tr = ctx.selection.createTargetRange(r)
        ctx.setCaretAffinityPreference(true)
        if (tr && removeByTargetRange(ctx, tr)) {
          return true
        }
      }
    }
    // 否则, 光标置于前兄弟末尾
    ctx.commandManager.pushHandleCallback((_prevPT) => {
      ctx.setCaretToAParagraph(_prevPT, false, true)
    }, prevPT)
    return true
  }
  // 当前段落有后兄弟, 则删除当前, 否则删除顶层节点
  const removeNode = currP.nextSibling ? currP : topEl
  ctx.commandManager.push(cmd.removeNode({
    node: removeNode,
    destCaretRange: null,
  }))
  ctx.commandManager.pushHandleCallback((_prevPT) => {
    ctx.setCaretToAParagraph(_prevPT, false, true)
  }, prevPT)
  return true
})
/**
 * 处理在段落末尾 Delete
 */
export const deleteForwardAtParagraphEnd = createEffectHandle('DeleteForwardAtParagraphEnd', (ctx, targetCaret) => {
  const currP = targetCaret.anchorParagraph
  if (!currP) {
    return false
  }
  const isEmpty = currP.isEmpty()
  let nextPT = currP.nextSibling as Et.Paragraph | null

  /* ------------------------------- // 当前段落有后兄弟 ------------------------------ */
  if (nextPT) {
    // 这里不同于 Backspace, Delete时优先删除空的后兄弟, 其次才是空自身
    // 后兄弟为空, 删除后兄弟, 光标不变, true
    if (nextPT.isEmpty()) {
      ctx.commandManager.push(cmd.removeNode({
        node: nextPT,
        destCaretRange: null,
      }))
      return true
    }
    // 当前为空, 删除当前, 光标置于后兄弟开头
    if (isEmpty) {
      ctx.commandManager.push(cmd.removeNode({
        node: currP,
        destCaretRange: null,
      }))
      ctx.commandManager.pushHandleCallback((_nextPT) => {
        ctx.setCaretToAParagraph(_nextPT, true, true)
      }, nextPT)
      return true
    }
    // 当前非空, 后兄弟非空, 判断是否合并两者
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
      // 添加一个空命令, 好让命令事务能记录此刻的光标位置
      ctx.commandManager.push(cmd.null())
      ctx.commandManager.pushHandleCallback((_nextPinnerP) => {
        ctx.setCaretToAParagraph(_nextPinnerP, true, true)
      }, nextPinnerP)
      return true
    }
    return removeParagraphAndMergeCloneContentsToOther(ctx, currP, nextPT)
  }

  /* ------------------------------- // 当前段落无后兄弟 ------------------------------ */
  // const topEl = targetCaret.anchorTopElement
  // fixed. 处理类似引用块嵌套的情况
  const topEl = ctx.body.outerParagraphs(currP).next().value
  if (!topEl) {
    return false
  }
  nextPT = topEl.nextSibling as Et.Paragraph | null

  /* ------------------------------- // 顶层节点无后兄弟 ------------------------------ */
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
      ctx.commandManager.pushHandleCallback((_prevP) => {
        ctx.setCaretToAParagraph(_prevP, false, true)
      }, prevP)
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

  /* ------------------------------- // 顶层节点有后兄弟 ------------------------------ */
  // 后兄弟是普通段落, 考虑合并
  if (ctx.isPlainParagraph(nextPT)) {
    if (checkEqualParagraphSmartRemoveAndMerge(ctx, currP, nextPT)) {
      return true
    }
  }
  // 顶层节点相同, 合并
  else if (topEl.isEqualTo(nextPT)) {
    const r = document.createRange()
    targetCaret.etCaret.adoptToRange(r, true, false)
    nextPT.innerStartEditingBoundary().adoptToRange(r, false, true)
    const tr = ctx.selection.createTargetRange(r)
    ctx.setCaretAffinityPreference(false)
    if (tr && removeByTargetRange(ctx, tr)) {
      return true
    }
  }
  // 添加一个空命令
  ctx.commandManager.push(cmd.null())
  ctx.commandManager.pushHandleCallback((_nextPT) => {
    ctx.setCaretToAParagraph(_nextPT, true, true)
  }, nextPT)
  return true
})

/**
 * 判断俩段落是否相同, 相同则 添加智能删除命令并返回 true, 否则返回 false,
 * 用于段落开头 Backspace 或末尾 Delete;\
 * 智能删除: 智能处理边缘合并, 以及合并后的光标位置\
 * @param mergeTo 保留的段落
 * @param toRemoved 要移除的段落
 */
const checkEqualParagraphSmartRemoveAndMerge = (
  ctx: Et.EditorContext,
  mergeTo: Et.Paragraph,
  toRemoved: Et.Paragraph,
): boolean => {
  if (!mergeTo.isEqualTo(toRemoved)) {
    return false
  }

  // 后无子节点, 删除后, 光标置于前末尾
  if (!toRemoved.hasChildNodes()) {
    ctx.commandManager.push(cmd.removeNode({
      node: toRemoved,
      destCaretRange: cr.caretInEnd(mergeTo),
    }))
    return true
  }
  // 前无子节点, 删除后, 将后内容移动到前末尾, 光标置于前末尾
  if (!mergeTo.hasChildNodes()) {
    const postLast = toRemoved.lastChild
    const destCaretRange = postLast
      ? cr.caretInEnd(postLast)
      : undefined
    ctx.commandManager.push(cmd.removeNode({
      node: toRemoved,
    }))
    moveParagraphChilNodesToOtherTail(ctx.commandManager, mergeTo, toRemoved, destCaretRange)
    return true
  }

  // 俩段落均有至少一个子节点
  // 1. 移除 mergeTo段落 的末尾节点(自动移除尾 br) 和 toRemoved段落 的开头节点
  // 2. 克隆上述俩节点并合并插入到 mergeTo段落 末尾
  // 3. 提取 toRemoved段落 的剩余内容 (不克隆, 直接转移到 mergeTo段落 末尾)
  // 4. 移除 toRemoved段落
  // 5. 光标置于合并内容中间位置

  const cmds: Et.Command[] = []
  const nextFirst = toRemoved.firstChild as Et.Node
  let prevLast = mergeTo.lastChild as Et.Node
  let destCaretRange
  if (dom.isBrElement(prevLast)) {
    cmds.push(cmd.removeNode({ node: prevLast }))
    prevLast = prevLast.previousSibling as Et.Node
  }
  if (prevLast) {
    const out = fragmentUtils.cloneAndMergeNodesToEtFragmentAndCaret(prevLast, nextFirst, false)
    // TODO 什么情况下会返回 null? 即什么情况会让 prevLast 和 nextFirst 合并结果为空?
    // 若为空, 则删除这俩节点之后, 还需要考虑 prevLast.prev, nextFirst.next是否可合并的问题
    if (!out) {
      return false
    }
    const mergeInsertAt = cr.caretOutStart(prevLast)
    cmds.push(
      cmd.removeNode({ node: prevLast }),
      cmd.removeNode({ node: nextFirst }),
      cmd.insertContent({
        content: out[0],
        execAt: mergeInsertAt,
      }),
    )
    destCaretRange = out[1]
  }
  else {
    destCaretRange = cr.caretStartAuto(nextFirst)
  }

  moveParagraphChilNodesToOtherTail(cmds, mergeTo, toRemoved)
  cmds.push(cmd.removeNode({ node: toRemoved, destCaretRange }))
  ctx.commandManager.push(...cmds)
  return true
}
/**
 * 添加命令, 将一个段落的所有子节点按序移动到另一个段落末尾
 */
const moveParagraphChilNodesToOtherTail = (
  cmds: Et.CommandQueue,
  mergeTo: Et.Paragraph,
  toRemoved: Et.Paragraph,
  destCaretRange?: Et.CaretRange,
) => {
  cmds.push(cmd.functional({
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
const removeParagraphAndMergeCloneContentsToOther = (
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
    ctx.commandManager.push(
      cmd.removeNode({
        node: prevLast,
      }),
      cmd.insertContent({
        content: out[0],
        execAt: cr.caretOutStart(prevLast),
        destCaretRange: out[1],
      }),
    )
  }
  return true
}
