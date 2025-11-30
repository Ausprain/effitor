import { cmd, cr, type Et } from '@effitor/core'

import { EtBlockquoteElement } from './EtBlockquoteElement'

export const blockquoteHandler: Et.EffectHandler = {
  replaceParagraphWithBlockquote: (ctx, { meta, paragraph, reuse = false }) => {
    const bq = EtBlockquoteElement.create(meta?.type)
    const cmds: Et.Command[] = []
    let destCaretRange
    cmds.push(cmd.removeNode({ node: paragraph }))
    if (reuse) {
      cmds.push(cmd.insertNode({ node: paragraph, execAt: cr.caretInEndFuture(bq) }))
      destCaretRange = cr.caretEndAuto(paragraph)
    }
    if (meta) {
      if (meta.title) {
        const titleP = ctx.createPlainParagraph()
        titleP.textContent = meta.title
        bq.appendChild(titleP)
      }
      if (!reuse) {
        const newP = ctx.createPlainParagraph()
        bq.appendChild(newP)
        destCaretRange = cr.caretInAuto(newP)
      }
    }
    else if (!reuse) {
      destCaretRange = cr.caret(bq, 0)
    }
    cmds.push(cmd.insertNode({ node: bq, execAt: cr.caretOutStart(paragraph) }))
    return ctx.commandManager.withTransaction(cmds, destCaretRange)
  },
}
