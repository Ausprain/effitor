/**
 * 处理 keydown 中方向键行为
 *
 * // TODO 边缘情况处理
 * - [ ] 光标在不可编辑节点边缘, 上下软换行无文本时, SelectionModify的 line 粒度失效
 * - [ ] 文档首段落不可编辑, 则使用 cmd + ↑ 将光标定位文档开头无效; 末段落不可编辑同理
 */

import { KeyMod } from '@effitor/shared'

import type { Et } from '../@types'
import { dom, traversal } from '../utils'
import { CtrlCmd, LineModifier, WordModifier } from './Mod'
import { create } from './util'

// FIXME 使用 `selection.modify('move', 'forward', 'documentboundary')` 可能会让光标进入 et-body 内
// 并且如果首段落或末段落不可编辑, 光标可能无法定位;
// 于是, 当首段落或末段落不可编辑时, 直接让编辑器失去焦点; 让用户知道编辑器无法处理这样的行为, 而不是让用户意外地将文本插入到 et-body 内

// let moveToDocumentStart, moveToDocumentEnd, extendToDocumentStart, extendToDocumentEnd
// if (platform.isFirefox) {
const moveToDocumentEnd = (ctx: Et.EditorContext) => {
  const lastParagraph = ctx.bodyEl.lastChild as HTMLElement | null
  if (!lastParagraph || !lastParagraph.isContentEditable || !ctx.isEtParagraph(lastParagraph)) {
    ctx.commandManager.handleInsertParagraphToBodyEnd()
    ctx.selection.scrollIntoView()
    return true
  }
  ctx.setCaretToAParagraph(lastParagraph, false, true)
  ctx.forceUpdate()
  ctx.selection.scrollIntoView(false)
  return true
}
const moveToDocumentStart = (ctx: Et.EditorContext) => {
  const firstParagraph = ctx.bodyEl.firstChild as HTMLElement | null
  if (!firstParagraph || !firstParagraph.isContentEditable || !ctx.isEtParagraph(firstParagraph)) {
    ctx.commandManager.handleInsertParagraphToBodyStart()
    ctx.selection.scrollIntoView()
    return true
  }
  ctx.setCaretToAParagraph(firstParagraph, true, true)
  ctx.forceUpdate()
  ctx.selection.scrollIntoView(true)
  return true
}
const extendToDocumentEnd = (ctx: Et.EditorContext) => {
  const lastParagraph = ctx.bodyEl.lastChild
  if (!lastParagraph || !ctx.isEtParagraph(lastParagraph)) {
    ctx.editor.blur()
    return true
  }
  const newRange = lastParagraph.innerEndEditingBoundary().toRange()
  if (!newRange || !ctx.selection.range) {
    ctx.editor.blur()
    return true
  }
  newRange.setStart(ctx.selection.range.endContainer, ctx.selection.range.endOffset)
  ctx.selection.selectRange(newRange)
  ctx.forceUpdate()
  ctx.selection.scrollIntoView(false)
  return true
}
const extendToDocumentStart = (ctx: Et.EditorContext) => {
  const firstParagraph = ctx.bodyEl.firstChild
  if (!firstParagraph || !ctx.isEtParagraph(firstParagraph)) {
    ctx.editor.blur()
    return true
  }
  const newRange = firstParagraph.innerStartEditingBoundary().toRange()
  if (!newRange || !ctx.selection.range) {
    ctx.editor.blur()
    return true
  }
  newRange.setEnd(ctx.selection.range.startContainer, ctx.selection.range.startOffset)
  ctx.selection.selectRange(newRange)
  ctx.forceUpdate()
  ctx.selection.scrollIntoView(true)
  return true
}
// }
// else {
//   moveToDocumentEnd = (ctx: Et.EditorContext) => ctx.selection.modify('move', 'forward', 'documentboundary')
//   moveToDocumentStart = (ctx: Et.EditorContext) => ctx.selection.modify('move', 'backward', 'documentboundary')
//   extendToDocumentEnd = (ctx: Et.EditorContext) => ctx.selection.modify('extend', 'forward', 'documentboundary')
//   extendToDocumentStart = (ctx: Et.EditorContext) => ctx.selection.modify('extend', 'backward', 'documentboundary')
// }

type ModKeyActionMap = Record<string, (ctx: Et.EditorContext) => boolean>

const collapseRange = (ctx: Et.EditorContext, toStart: boolean, reveal: boolean) => {
  if (ctx.selection.isRangingBody) {
    if (toStart) {
      return moveToDocumentStart(ctx)
    }
    else {
      return moveToDocumentEnd(ctx)
    }
  }
  else {
    return ctx.selection.collapse(toStart, reveal)
  }
}
const checkInRawElStartToPrevNode = (ctx: Et.EditorContext) => {
  let el
  if ((el = ctx.selection.rawEl) && el.selectionEnd === 0) {
    let prevNode = traversal.treePrevSibling(el)
    while (prevNode && ctx.body.isNodeInBody(prevNode)) {
      if (dom.isText(prevNode) && prevNode.parentElement?.isContentEditable) {
        ctx.selection.collapseTo(prevNode, prevNode.length)
        return true
      }
      if (ctx.isEtParagraph(prevNode)) {
        ctx.setCaretToAParagraph(prevNode, false, true)
        return true
      }
      prevNode = traversal.treePrevSibling(prevNode)
    }
    return true
  }
  return false
}
const checkInRawElEndToNextNode = (ctx: Et.EditorContext) => {
  let el
  if ((el = ctx.selection.rawEl) && el.selectionEnd === el.value.length) {
    let nextNode = traversal.treeNextSibling(el)
    while (nextNode && ctx.body.isNodeInBody(nextNode)) {
      if (dom.isText(nextNode) && nextNode.parentElement?.isContentEditable) {
        ctx.selection.collapseTo(nextNode, 0)
        return true
      }
      if (ctx.isEtParagraph(nextNode)) {
        ctx.setCaretToAParagraph(nextNode, true, true)
        return true
      }
      nextNode = traversal.treeNextSibling(nextNode)
    }
    return true
  }
  return false
}
const checkAtTextStartToPrevNode = (ctx: Et.EditorContext) => {
  if (ctx.selection.rawEl) {
    return false
  }
  let text
  if ((text = ctx.selection.anchorText) && ctx.selection.anchorOffset === 0) {
    const prevNode = traversal.treePrevSibling(text)
    if (!prevNode) {
      return true
    }
    if (dom.isRawEditElement(prevNode)) {
      prevNode.selectionStart = prevNode.value.length
      prevNode.focus()
      return true
    }
    if (ctx.selection.anchorOffset === 0 && ctx.isEtParagraph(prevNode)) {
      ctx.setCaretToAParagraph(prevNode, false, true)
      return true
    }
  }
  else if (!text) {
    // 当 `<textarea></textarea>|bbb`, 光标位置`|`被视为在 textarea 与`bbb`之间
    const prevNode = ctx.selection.focusNode?.previousSibling
    if (prevNode && dom.isRawEditElement(prevNode)) {
      prevNode.selectionStart = prevNode.value.length
      prevNode.focus()
      return true
    }
  }
  return false
}
const checkAtTextEndToNextNode = (ctx: Et.EditorContext) => {
  if (ctx.selection.rawEl) {
    return false
  }
  let text
  if ((text = ctx.selection.anchorText) && ctx.selection.anchorOffset === text.length) {
    const nextNode = traversal.treeNextSibling(text)
    if (!nextNode) {
      return true
    }
    if (dom.isRawEditElement(nextNode)) {
      nextNode.selectionEnd = 0
      nextNode.focus()
      return true
    }
    if (ctx.isEtParagraph(nextNode)) {
      ctx.setCaretToAParagraph(nextNode, true, true)
      return true
    }
  }
  else if (!text) {
    const focusNode = ctx.selection.focusNode
    if (focusNode && dom.isRawEditElement(focusNode)) {
      focusNode.selectionEnd = 0
      focusNode.focus()
      return true
    }
  }
  return false
}

export const ModKeyDownModifySelectionMap: ModKeyActionMap = {
/* -------------------------------------------------------------------------- */
  /*                                 光标移动/选择                                */
  /* -------------------------------------------------------------------------- */

  // 1. firefox 不支持 documentboundary 粒度, 需要手动移动或选择
  // 2. chromium 和 safari 在 cmd+shfit+left 之后再 cmd+shift+right 之后会全选当前行
  //    而不是从当前位置要么全选左边, 要么全选右边, 这反直觉, 因此要先 collapsed

  [create('Home', KeyMod.None)]: ctx => ctx.selection.modify('move', 'backward', 'lineboundary'),
  [create('End', KeyMod.None)]: ctx => ctx.selection.modify('move', 'forward', 'lineboundary'),
  // 光标移动到行首, MacOS: cmd + left, Windows: alt + left
  [create('ArrowLeft', LineModifier)]: ctx => ctx.selection.modify('move', 'backward', 'lineboundary'),
  [create('ArrowRight', LineModifier)]: ctx => ctx.selection.modify('move', 'forward', 'lineboundary'),

  [create('ArrowUp', KeyMod.None)]: ctx => (ctx.selection.isCollapsed
    ? checkInRawElStartToPrevNode(ctx) || ctx.selection.modify('move', 'backward', 'line')
    : collapseRange(ctx, true, true)),
  [create('ArrowDown', KeyMod.None)]: ctx => (ctx.selection.isCollapsed
    ? checkInRawElEndToNextNode(ctx) || ctx.selection.modify('move', 'forward', 'line')
    : collapseRange(ctx, false, true)),
  [create('ArrowLeft', KeyMod.None)]: ctx => (ctx.selection.isCollapsed
    ? checkInRawElStartToPrevNode(ctx) || checkAtTextStartToPrevNode(ctx) || ctx.selection.modify('move', 'backward', 'character')
    : collapseRange(ctx, true, true)),
  [create('ArrowRight', KeyMod.None)]: ctx => (ctx.selection.isCollapsed
    ? checkInRawElEndToNextNode(ctx) || checkAtTextEndToNextNode(ctx) || ctx.selection.modify('move', 'forward', 'character')
    : collapseRange(ctx, false, true)),
  [create('ArrowUp', CtrlCmd)]: ctx => moveToDocumentStart(ctx),
  [create('ArrowDown', CtrlCmd)]: ctx => moveToDocumentEnd(ctx),
  [create('ArrowLeft', WordModifier)]: ctx => (ctx.selection.isCollapsed
    ? ctx.selection.modify('move', 'backward', 'word')
    : collapseRange(ctx, true, true)),
  [create('ArrowRight', WordModifier)]: ctx => (ctx.selection.isCollapsed
    ? ctx.selection.modify('move', 'forward', 'word')
    : collapseRange(ctx, false, true)),

  // 选择
  [create('ArrowUp', KeyMod.Shift)]: ctx => ctx.selection.modify('extend', 'backward', 'line'),
  [create('ArrowDown', KeyMod.Shift)]: ctx => ctx.selection.modify('extend', 'forward', 'line'),
  [create('ArrowUp', CtrlCmd | KeyMod.Shift)]: ctx => extendToDocumentStart(ctx),
  [create('ArrowDown', CtrlCmd | KeyMod.Shift)]: ctx => extendToDocumentEnd(ctx),
  [create('ArrowLeft', KeyMod.Shift)]: ctx => ctx.selection.modify('extend', 'backward', 'character'),
  [create('ArrowRight', KeyMod.Shift)]: ctx => ctx.selection.modify('extend', 'forward', 'character'),
  [create('ArrowLeft', WordModifier | KeyMod.Shift)]: ctx => ctx.selection.modify('extend', 'backward', 'word'),
  [create('ArrowRight', WordModifier | KeyMod.Shift)]: ctx => ctx.selection.modify('extend', 'forward', 'word'),
  [create('ArrowLeft', CtrlCmd | KeyMod.Shift)]: ctx => collapseRange(ctx, true, false) && ctx.selection.modify('extend', 'backward', 'lineboundary'),
  [create('ArrowRight', CtrlCmd | KeyMod.Shift)]: ctx => collapseRange(ctx, false, false) && ctx.selection.modify('extend', 'forward', 'lineboundary'),

}
