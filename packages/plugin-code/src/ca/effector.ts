import { cmd, cr, type Et } from '@effitor/core'

import { EtCodeAreaElement } from './EtCodeAreaElement'

export const codeAreaEffector: Et.Effector = {
  keydownSolver: {
    K: (ev, ctx) => {
      if (ev.metaKey && ctx.isPlainParagraph(ctx.focusParagraph)) {
        const ca = EtCodeAreaElement.create()
        ctx.commandManager.push(cmd.insertNode({
          node: ca,
          execAt: cr.caretOutEnd(ctx.focusParagraph),
        }))
        ctx.commandManager.handle()
        ca.focusToInnerEditable(ctx, true)
        return ctx.preventAndSkipDefault(ev)
      }
    },
  },
}
