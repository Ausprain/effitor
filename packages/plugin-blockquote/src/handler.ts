import { cr, type Et } from '@effitor/core'

import { EtBlockquoteElement } from './EtBlockquoteElement'

export const blockquoteHandler: Et.EffectHandler = {
  replaceParagraphWithBlockquote: (ctx, { meta, paragraph }) => {
    const bq = EtBlockquoteElement.create(meta?.type)
    let destCaretRange
    if (meta) {
      const titleP = ctx.createPlainParagraph()
      titleP.textContent = meta.title
      bq.appendChild(titleP)
      const newP = ctx.createPlainParagraph()
      bq.appendChild(newP)
      destCaretRange = cr.caretInAuto(newP)
    }
    else {
      destCaretRange = cr.caret(bq, 0)
    }
    return ctx.commonHandler.replaceNode(paragraph, bq, destCaretRange)
  },
}
