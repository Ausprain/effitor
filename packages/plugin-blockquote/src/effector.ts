import { type Et, useEffectorContext } from '@effitor/core'
import { HtmlCharEnum } from '@effitor/shared'

import { BlockquoteMeta } from './config'
import { blockquoteMetaParser } from './util'

const ectx = useEffectorContext('$blockquote_ctx', {
  bqMetaParser: blockquoteMetaParser,
})

export const blockquoteEffector: Et.EffectorSupportInline = {
  inline: true,
  keydownSolver: {
    Enter: (ev, ctx) => {
      const currP = ctx.focusParagraph
      if (!currP || !ctx.isPlainParagraph(currP)) {
        return
      }
      let pText = currP.textContent
      if (!pText || pText.length > 5) {
        return
      }
      pText = pText.replaceAll(HtmlCharEnum.ZERO_WIDTH_SPACE, '')
      if (pText[0] !== '>') {
        return
      }
      if (pText.replaceAll(' ', '') === '>') {
        ctx.effectInvoker.invoke(currP, 'replaceParagraphWithBlockquote', ctx, {
          paragraph: currP,
        })
        return ctx.preventAndSkipDefault(ev)
      }
      if (!pText.startsWith('> ')) {
        return
      }
      const meta = ectx.$blockquote_ctx.bqMetaParser.fromText(pText.slice(2), ctx.pctx.$blockquote_ctx)
      if (!meta) {
        return
      }
      ctx.effectInvoker.invoke(currP, 'replaceParagraphWithBlockquote', ctx, {
        meta,
        paragraph: currP,
      })
    },
  },

  onMounted(ctx) {
    // 注册热字符串
    const hsm = ctx.hotstringManager
    const metaMap = ctx.pctx.$blockquote_ctx.metaMap
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
