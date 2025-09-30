import type { Et } from '@effitor/core'
import { cr, handlerUtils } from '@effitor/core'

import { MarkEnum, MarkType } from '../config'
import { createMarkNode } from '../element'
import { checkAllowMarkEffect, checkAllowNested } from './utils'

const checkRemoveMarkChars = (ctx: Et.EditorContext, tr: Et.ValidTargetCaret, marker?: string) => {
  if (!marker || !tr.isAtText()) {
    return null
  }
  const text = tr.container
  let offset = tr.offset
  if (text.data.slice(offset - marker.length, offset) === marker) {
    if (text.length === marker.length) {
      // 先记录位置, 再移除节点
      const ret = cr.caretOutStart(text)
      ctx.commonHandlers.removeNode(text, true)
      return ret
    }
    else {
      offset = offset - marker.length
      ctx.commonHandlers.deleteInTextNode(text, offset, marker, true)
      if (tr.isAtEnd()) {
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
  ctx.pctx[MarkEnum.CtxKey].markState.startMarking(markEl)
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
    if (!ctx.commonHandlers.removeNodeAndMerge(tc.anchorEtElement, false)) {
      return false
    }
    const insertAt = ctx.selection.createTargetCaret(cm.lastCaretRange)
    if (!insertAt) {
      return false
    }
    return ctx.commonHandlers.insertText(data, insertAt)
  })
}

const formatMarkAtCaret = (ctx: Et.EditorContext, tc: Et.ValidTargetCaret, markType: MarkType) => {
  if (checkUnformatMark(ctx, tc, markType)) {
    return true
  }
  return !!ctx.getEtHandler(tc.anchorEtElement).checkInsertMark?.(ctx, {
    markType,
    targetRange: tc,
  })
}

/**
 * 创建 mark 节点的效应处理器
 */
export const markHandler: Et.EffectHandler = {
  checkInsertMark: (ctx, {
    markType,
    removeMarkerChars,
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
    let insertAt = checkRemoveMarkChars(ctx, tc, removeMarkerChars)
    if (!insertAt) {
      insertAt = tc.etCaret
    }
    if (insertMarkNodeAtCaret(ctx, insertAt, markType)) {
      return ctx.commandManager.handleAndUpdate()
    }
    else {
      ctx.pctx[MarkEnum.CtxKey].markState.endMarking()
      ctx.commandManager.closeTransaction()
      return false
    }
  },
  checkFormatMark: (ctx, {
    markType,
    targetRange: tr,
  }) => {
    if (!tr) {
      tr = ctx.selection.getTargetRange()
      if (!tr) {
        return false
      }
    }
    if (tr.collapsed) {
      return formatMarkAtCaret(ctx, tr.toTargetCaret(), markType)
    }
    // TODO 暂时只允许对纯文本节点进行 mark 格式化
    if (!tr.isTextCommonAncestor() || !tr.commonEtElement) {
      return false
    }
    if (!checkAllowMarkEffect(tr.commonEtElement)
      || !checkAllowNested(tr.commonEtElement, markType)) {
      return false
    }
    return ctx.commandManager.withTransactionFn(() => {
      const data = tr.DOMRange.toString()
      let insertAt
      if (data.length === tr.commonAncestor.length) {
        insertAt = cr.caretOutStart(tr.commonAncestor)
        ctx.commonHandlers.removeNode(tr.commonAncestor, false)
      }
      else {
        insertAt = cr.caret(tr.commonAncestor, tr.startOffset)
        ctx.commonHandlers.deleteInTextNode(tr.commonAncestor, tr.startOffset, data.length, false)
      }
      return insertMarkNodeAtCaret(ctx, insertAt, markType, data)
    })
  },
}
