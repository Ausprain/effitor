import type { Et } from '@effitor/core'
import { cmd, cr, dom, etcode, handlerUtils } from '@effitor/core'
import { HtmlCharEnum } from '@effitor/shared'

import { markerMap, MarkType, nestedMarkMap } from '../config'
import { createMarkNode, EtMarkElement } from '../EtMarkElement'
import { checkAllowMark, checkAllowMarkEffect, checkAllowNested } from './utils'

/**
 * 检查并移除插入节点位置的零宽字符和已经插入的标记字符
 */
const checkRemoveZWSAndMarkChars = (ctx: Et.EditorContext, tc: Et.ValidTargetCaret, marker?: string) => {
  if (!tc.isAtText()) {
    return null
  }
  if (tc.container.data === HtmlCharEnum.ZERO_WIDTH_SPACE) {
    const ret = cr.caretOutStart(tc.container)
    ctx.commandManager.handleRemoveNode(tc.container, true)
    return ret
  }
  if (!marker) {
    return null
  }
  const text = tc.container
  let offset = tc.offset
  if (text.data.slice(offset - marker.length, offset) === marker) {
    if (text.length === marker.length
      // 若仅剩零宽字符, 也删除
      || text.data.slice(0, offset - marker.length) === HtmlCharEnum.ZERO_WIDTH_SPACE
    ) {
      // 先记录位置, 再移除节点
      const ret = cr.caretOutStart(text)
      ctx.commandManager.handleRemoveNode(text, true)
      return ret
    }
    else {
      offset = offset - marker.length
      ctx.commandManager.handleUpdateText(text, offset, marker, '', true)
      if (tc.isAtEnd()) {
        return cr.caretOutEnd(text)
      }
      return cr.caretIn(text, offset)
    }
  }
  return null
}
const insertMarkNodeAtCaret = (ctx: Et.EditorContext, insertAt: Et.EtCaret, markType: MarkType, data?: string) => {
  const tc = ctx.selection.createTargetCaret(insertAt)
  if (!tc) {
    return false
  }
  const [markEl, zws] = createMarkNode(markType, data)
  ctx.pctx.$markPx.markState.startMarking(markEl)
  return handlerUtils.insertElementAtCaret(ctx, markEl, tc, cr.caretInEndFuture(zws))
}
const checkUnformatMark = (ctx: Et.EditorContext, tc: Et.ValidTargetCaret, markType: MarkType) => {
  if (!ctx.schema.mark.is(tc.anchorEtElement)
    || tc.anchorEtElement.childElementCount > 0
    || tc.anchorEtElement.markType !== markType
  ) {
    return false
  }
  // 光标在 mark 节点内, 且 mark 节点内只有纯文本, 则删除该节点并插回内容文本
  const data = tc.anchorEtElement.textContent
  return ctx.commandManager.withTransactionFn((cm) => {
    if (!ctx.commonHandler.removeNodeAndMerge(tc.anchorEtElement, false)) {
      return false
    }
    const insertAt = ctx.selection.createTargetCaret(cm.lastCaretRange)
    if (!insertAt) {
      return false
    }
    return ctx.commonHandler.insertText(data, insertAt)
  })
}
const formatMarkAtCaret = (ctx: Et.EditorContext, tc: Et.ValidTargetCaret, markType: MarkType) => {
  if (checkUnformatMark(ctx, tc, markType)) {
    return true
  }
  return !!ctx.getEtHandler(tc.anchorEtElement).checkInsertMark?.(ctx, {
    markType,
    targetRange: tc,
    checkRemoveMarkChar: false,
  })
}
const formatMarkAtRange = (ctx: Et.EditorContext, tr: Et.ValidTargetRange, markType: MarkType) => {
  if (tr.collapsed) {
    return false
  }
  // 禁止跨段落 mark
  if (!tr.startParagraph || tr.startParagraph !== tr.endParagraph) {
    return false
  }
  // 选区刚好覆盖一个节点
  if (tr.startContainer === tr.endContainer && tr.startOffset + 1 === tr.endOffset) {
    const node = tr.startContainer.childNodes.item(tr.startOffset)
    if (dom.isText(node)) {
      return tryMarkText(ctx, node, markType)
    }
    if (!dom.isHTMLElement(node)) {
      return false
    }
    return tryMarkElement(ctx, node, markType)
  }
  const startPartial = tr.getStartPartialNode('paragraph')
  const endPartial = tr.getEndPartialNode('paragraph')
  if (!startPartial || !endPartial) {
    return false
  }
  const df = tr.DOMRange.cloneContents() as Et.Fragment
  // df 不在页面上, 第一个参数传入 null, 直接mark 节点, 无通过命令
  markChildNodes(null, df.childNodes, markType)
  handlerUtils.expandRemoveInsert(ctx, tr, startPartial, endPartial, df, true, false)
  ctx.commandManager.commitNextHandle(true)
  return ctx.commandManager.handleAndUpdate()
}
const tryMarkText = (ctx: Et.EditorContext, text: Et.Text, markType: MarkType) => {
  const etel = ctx.body.findInclusiveEtParent(text)
  if (!etel) {
    return false
  }
  if (!checkAllowMark(etel, markType)) {
    return false
  }
  const [markEl, innerText] = createMarkNode(markType, text.data)
  ctx.commandManager.commitNextHandle(true)
  ctx.commandManager.push(cmd.replaceNode({
    oldNode: text,
    newNode: markEl,
  }))
  return ctx.commandManager.handleAndUpdate(cr.range(innerText, 0, innerText, innerText.length))
}
const tryMarkElement = (ctx: Et.EditorContext, el: Et.HTMLElement, markType: MarkType) => {
  const cmds: Et.Command[] = []
  checkMarkElement(cmds, el, markType, true)
  if (!cmds.length) {
    // 尝试包裹其后代
    checkMarkElementChilds(cmds, el, markType)
    if (!cmds.length) {
      return false
    }
  }
  return ctx.commandManager.withTransaction(cmds, cr.rangeAllIn(el))
}
const checkAllowMarkEditableElement = (el: Et.HTMLElement, markType: MarkType, checkNested: boolean) => {
  if (checkNested && !checkAllowNested(el, markType)) {
    return false
  }
  // markType 允许包裹 el
  if (etcode.checkIn(EtMarkElement.inEtType, el, EtMarkElement.notInEtType)) {
    if (EtMarkElement.is(el)) {
      // markType 不能嵌套 el 的 mark 类型, 退出
      if (markType === el.markType || !nestedMarkMap[markType]?.includes(el.markType as MarkType)) {
        return false
      }
    }
    return true
  }
  return false
}
const checkMarkElement = (
  cmds: Et.CommandQueue | null, el: Et.HTMLElement, markType: MarkType, checkNested: boolean,
) => {
  if (dom.isNotEditable(el) || !checkAllowMarkEditableElement(el, markType, checkNested)) {
    return false
  }
  const markNode = EtMarkElement.create(markType)
  if (!cmds) {
    el.replaceWith(markNode)
    markNode.appendChild(el)
  }
  else {
    cmds.push(
      cmd.replaceNode({ oldNode: el, newNode: markNode }),
      cmd.insertNode({ node: el, execAt: cr.caretInStart(markNode) }),
    )
  }
  return true
}
const checkMarkElementChilds = (cmds: Et.CommandQueue | null, el: Et.HTMLElement, markType: MarkType): boolean => {
  if (etcode.check(el) && !checkAllowMark(el, markType)) {
    let hasMark = false
    for (const child of el.childNodes) {
      if (!dom.isNotEditable(child) && dom.isHTMLElement(child)) {
        hasMark = checkMarkElementChilds(cmds, child, markType)
      }
    }
    return hasMark
  }
  return markChildNodes(cmds, el.childNodes as NodeListOf<Et.Node>, markType)
}
const markChildNodes = (cmds: Et.CommandQueue | null, childNodes: NodeListOf<Et.Node>, markType: MarkType) => {
  const childs: Et.Node[] = []
  for (const child of childNodes) {
    // 禁止包裹不可编辑节点
    if (dom.isText(child)) {
      childs.push(child)
      continue
    }
    if (dom.isNotEditable(child) || !dom.isHTMLElement(child)) {
      markChilds()
      continue
    }
    if (checkAllowMarkEditableElement(child, markType, false)) {
      childs.push(child)
      continue
    }
    markChilds()
    checkMarkElementChilds(cmds, child, markType)
  }
  markChilds()
  return true

  function markChilds() {
    if (!childs.length) {
      return
    }
    const markNode = EtMarkElement.create(markType)
    const moveRange = cr.spanRange(childs[0], childs[childs.length - 1])
    if (!moveRange) {
      return
    }
    if (!cmds) {
      const insertAt = moveRange.removeAt()
      markNode.appendChild(moveRange.extractToFragment())
      insertAt.insertNode(markNode)
    }
    else {
      cmds.push(
        cmd.insertNode({ node: markNode, execAt: cr.caretOutStartFuture(childs[0]) }),
        cmd.moveNodes(
          moveRange,
          cr.caret(markNode, 0),
        ),
      )
    }
    childs.length = 0
  }
}

/**
 * 创建 mark 节点的效应处理器
 */
export const markHandler: Et.EffectHandler = {
  checkInsertMark: (ctx, {
    markType,
    checkRemoveMarkChar,
    targetRange: tr,
  }) => {
    // 光标在 text 末尾, 插入标记节点到 text 外末尾
    if (!tr) {
      tr = ctx.selection.getTargetRange()
    }
    if (!tr || !tr.collapsed) {
      return false
    }
    const tc = tr.toTargetCaret()
    if (!checkAllowMarkEffect(tc.anchorEtElement)
      || !checkAllowNested(tc.anchorEtElement, markType)) {
      return false
    }
    ctx.commandManager.commit()
    ctx.commandManager.startTransaction()
    const removeMarkerChars = checkRemoveMarkChar && markerMap[markType].marker.length > 1
      ? markerMap[markType].char
      : undefined
    let insertAt = checkRemoveZWSAndMarkChars(ctx, tc, removeMarkerChars)
    if (!insertAt) {
      insertAt = tc.etCaret
    }
    if (insertMarkNodeAtCaret(ctx, insertAt, markType)) {
      return ctx.commandManager.handleAndUpdate()
    }
    else {
      ctx.pctx.$markPx.markState.endMarking()
      ctx.commandManager.closeTransaction()
      return false
    }
  },
  checkFormatMark: (ctx, {
    markType,
    targetElement,
    targetRange: tr,
  }) => {
    if (targetElement) {
      return tryMarkElement(ctx, targetElement, markType)
    }
    if (!tr) {
      tr = ctx.selection.getTargetRange()
      if (!tr) {
        return false
      }
    }
    if (tr.collapsed) {
      return formatMarkAtCaret(ctx, tr.toTargetCaret(), markType)
    }
    return formatMarkAtRange(ctx, tr, markType)
  },
}

export const markInputTypeHandler: Partial<Et.InputTypeEffectHandleMap> = {
  EformatBold: (ctx, { targetRange: tr }) => {
    return tr.collapsed
      ? formatMarkAtCaret(ctx, tr.toTargetCaret(), MarkType.BOLD)
      : formatMarkAtRange(ctx, tr, MarkType.BOLD)
  },
  EformatItalic: (ctx, { targetRange: tr }) => {
    return tr.collapsed
      ? formatMarkAtCaret(ctx, tr.toTargetCaret(), MarkType.ITALIC)
      : formatMarkAtRange(ctx, tr, MarkType.ITALIC)
  },
  EformatStrikeThrough: (ctx, { targetRange: tr }) => {
    return tr.collapsed
      ? formatMarkAtCaret(ctx, tr.toTargetCaret(), MarkType.DELETE)
      : formatMarkAtRange(ctx, tr, MarkType.DELETE)
  },
  // EformatUnderline: (ctx, { targetRange: tr }) => {
  // },
}
