import { cmd, cr, type Et } from '@effitor/core'

import { MarkEnum, markerMap, MarkType } from '../config'
import { checkAllowNested } from './utils'

/**
 * 在 mark 节点内的效应处理器
 */
export const inMarkHandler: Et.EffectHandler = {
  /* -------------------------------------------------------------------------- */
  /*                       临时节点中插入内容, 取消临时节点标记                       */
  /* -------------------------------------------------------------------------- */
  EinsertText(ctx, payload) {
    if (this.superHandler.EinsertText) {
      if (payload.data === ' ') {
        // 临时 mark 节点内空格撤回节点
        const markType = ctx.pctx[MarkEnum.CtxKey].markState.markEl?.markType
        if (ctx.pctx[MarkEnum.CtxKey].markState.checkAndEndMarking(false)
          && ctx.commandManager.discard()
        ) {
          // 插回marker, bold是从italic 转化来的, 要插回**
          // 而 highlight 和 delete 是通过双击~~,==来判断的, 第一个字符已经插入, discard 不会撤回第一个字符
          // 因此只需要插回一个字符即可
          if (markType) {
            let marker = markerMap[markType].marker as string
            if (markType !== MarkType.BOLD && marker.length === 2) {
              marker = marker.slice(-1)
            }
            ctx.commonHandlers.insertText(marker, null)
          }
          return true
        }
        return this.superHandler.EinsertText(ctx, payload)
      }
      if (payload.data === markerMap[MarkType.BOLD].char && payload.data === ctx.prevUpKey) {
        // 由于 prevUpKey 的限制, tr 一定 collapsed, 且焦点效应元素一定是 mark bold 节点
        const tc = payload.targetRange.toTargetCaret()
        const markEl = tc.anchorEtElement
        if (ctx.schema.mark.is(markEl) && checkAllowNested(tc.anchorEtElement, MarkType.BOLD)) {
          if (ctx.pctx[MarkEnum.CtxKey].markState.isMarking) {
            markEl.changeMarkType(MarkType.BOLD)
          }
          if (tc.isAtText()) {
            const text = tc.container
            const offset = tc.offset
            if (text.data[offset - 1] === payload.data) {
              // 在一个非临时italic 中插入 bold
              return !!this.checkInsertMark?.(ctx, {
                markType: MarkType.BOLD,
                targetRange: tc,
                removeMarkerChars: markerMap[MarkType.BOLD].char,
              })
            }
          }
          return true
        }
      }
      // 还原连续的```
      if (payload.data === markerMap[MarkType.CODE].char) {
        const tc = payload.targetRange.toTargetCaret()
        if (ctx.schema.mark.is(tc.anchorEtElement)
          && tc.anchorEtElement.markType === MarkType.CODE
          && tc.anchorEtElement.textContent === '`'
          && tc.anchorParagraph?.firstChild === tc.anchorEtElement
          && (!tc.anchorParagraph.childNodes.item(1) || tc.anchorParagraph.lastChild?.localName === 'br')
        ) {
          const textNode = document.createTextNode('```') as Et.Text
          ctx.commandManager.push(cmd.replaceNode({
            oldNode: tc.anchorEtElement,
            newNode: textNode,
            destCaretRange: cr.caret(textNode, 3),
          }))
          return true
        }
      }
      if (this.superHandler.EinsertText(ctx, payload)) {
        // 插入文本, 更改临时节点状态
        if (ctx.pctx[MarkEnum.CtxKey].markState.checkAndEndMarking(true)) {
          ctx.commandManager.closeTransaction()
        }
        return true
      }
    }
    return false
  },
  InsertCompositionTextSuccess(ctx) {
    // 输入法成功插入文本, 更改临时节点状态
    if (ctx.pctx[MarkEnum.CtxKey].markState.checkAndEndMarking(true)) {
      ctx.commandManager.closeTransaction()
    }
  },
}
