import type { Et } from '@effitor/core'
import { cmd, cr, dom } from '@effitor/core'
import { HtmlCharEnum } from '@effitor/shared'

import { BlockquoteMeta } from './config'
import { blockquoteMetaParser } from './util'

const checkQuitBlockquote = (ctx: Et.EditorContext, currP: Et.EtParagraphElement) => {
  if (!currP.nextSibling && dom.isEmptyContentNode(currP)) {
    const bq = currP.parentNode
    if (!ctx.schema.blockquote.is(bq)) {
      return false
    }
    if (bq.childNodes.length === 1) {
      // bq 仅有一个空段落, 删除
      ctx.commandManager.push(
        cmd.removeNode({ node: currP }),
        cmd.removeNode({ node: bq }),
        cmd.insertNode({
          node: currP,
          execAt: cr.caretOutStart(bq),
        }),
      ).handleAndUpdate(cr.caretInAuto(currP))
    }
    else {
      ctx.commandManager.handleMoveNode(currP, cr.caretOutEnd(bq), cr.caretInAuto(currP))
    }
    return true
  }
  return false
}
const checkInsertBlockquote = (ctx: Et.EditorContext, currP: Et.EtParagraphElement) => {
  let pText = currP.textContent
  if (!pText || pText.length > 100) {
    return false
  }
  pText = pText.replaceAll(HtmlCharEnum.ZERO_WIDTH_SPACE, '')
  if (pText[0] !== '>') {
    return false
  }
  if (pText.replaceAll(' ', '') === '>') {
    ctx.effectInvoker.invoke(currP, 'replaceParagraphWithBlockquote', ctx, {
      paragraph: currP,
    })
    return true
  }
  if (!pText.startsWith('> ')) {
    return false
  }
  const meta = blockquoteMetaParser.fromText(pText.slice(2), ctx.pctx.$bqPx)
  if (!meta) {
    return false
  }
  ctx.effectInvoker.invoke(currP, 'replaceParagraphWithBlockquote', ctx, {
    meta,
    paragraph: currP,
  })
  return true
}

export const blockquoteEffector: Et.Effector = {
  keydownSolver: {
    Enter: (ev, ctx) => {
      const currP = ctx.focusParagraph
      if (!currP || !ctx.isPlainParagraph(currP)) {
        return
      }
      if (checkQuitBlockquote(ctx, currP)
        || checkInsertBlockquote(ctx, currP)
      ) {
        return ctx.preventAndSkipDefault(ev)
      }
    },
  },

  onMounted(ctx) {
    // 注册热字符串
    const hsm = ctx.hotstringManager
    const metaMap = ctx.pctx.$bqPx.metaMap
    for (const meta of Object.values(metaMap)) {
      hsm.create(meta.abbr, (ctx) => {
        checkAbbrToBlockquote(ctx, meta)
      })
    }
  },
}

const checkAbbrToBlockquote = (ctx: Et.EditorContext, meta: BlockquoteMeta) => {
  const tc = ctx.selection.getTargetCaret()
  const currP = tc?.anchorParagraph
  if (!currP
    || !ctx.isPlainParagraph(currP)
    || currP.childNodes.length > 2
    || currP.textContent.replaceAll(HtmlCharEnum.ZERO_WIDTH_SPACE, '') !== meta.abbr
  ) {
    return
  }
  ctx.effectInvoker.invoke(currP, 'replaceParagraphWithBlockquote', ctx, {
    meta,
    paragraph: currP,
  })
}
