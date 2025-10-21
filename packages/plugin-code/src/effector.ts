import type { Et } from '@effitor/core'
import { cmd, cr } from '@effitor/core'
import { codeBlockIcon } from '@effitor/shared'

import { CodeEnum } from './config'

export const codeEffector: Et.EffectorSupportInline = {
  inline: true,
  keydownSolver: {
    [CodeEnum.ElName]: (ev, ctx) => {
      const cm = ctx.commonEtElement.codeMirror
      if (cm?.area !== ctx.selection.rawEl) {
        return
      }
      const handler = ctx.getEtHandler(ctx.commonEtElement)
      switch (ev.key) {
        case 'Enter':
          if ((ev.metaKey || ev.ctrlKey) && !ev.altKey && !ev.shiftKey) {
            handler.insertNewLineInCode?.(ctx, {
              codeMirror: cm,
            })
            return ctx.preventAndSkipDefault(ev)
          }
          break
        case 'ArrowDown':
          if (ev.altKey) {
            handler.codeLinesDown?.(ctx, {
              codeMirror: cm,
            })
            return ctx.preventAndSkipDefault(ev)
          }
          break
        case 'ArrowUp':
          if (ev.altKey) {
            handler.codeLinesUp?.(ctx, {
              codeMirror: cm,
            })
            return ctx.preventAndSkipDefault(ev)
          }
          break
      }
    },
    Enter: (ev, ctx) => {
      if (!ctx.selection.isCollapsed || !ctx.isPlainParagraph(ctx.commonEtElement)) {
        return
      }
      const data = ctx.commonEtElement.textContent
      if (!data.startsWith('```')) {
        return
      }
      const [lang, metaStr] = data.slice(3).split(' ')
      if (ctx.pctx.$code_ctx.highlighter.langs.includes(lang)) {
        const codeEl = ctx.schema.code.withDefaultDecoration(ctx, '', lang)
        codeEl.meta = metaStr
        ctx.commandManager.push(cmd.replaceNode({
          oldNode: ctx.commonEtElement,
          newNode: codeEl,
        }))
        ctx.commandManager.handle()
        codeEl.focusToInnerEditable(ctx, true)
        return ctx.preventAndSkipDefault(ev)
      }
    },
  },

  onMounted(ctx) {
    addCodeBlockItemToDropdown(ctx.assists.dropdown)
  },
}

const addCodeBlockItemToDropdown = (dd?: Et.EditorAssists['dropdown']) => {
  if (!dd) {
    return
  }
  dd.addBlockRichTextMenuItem(dd.createMenuItem(
    codeBlockIcon(),
    ctx => insertCodeBlock(ctx),
    {
      prefixes: ['code'],
      tip: 'Insert code block',
    },
  ))
}

const insertCodeBlock = (ctx: Et.EditorContext) => {
  if (!ctx.focusParagraph) {
    return false
  }
  const codeEl = ctx.schema.code.withDefaultDecoration(ctx, '', '')
  ctx.commandManager.push(cmd.insertNode({
    node: codeEl,
    execAt: cr.caretOutEnd(ctx.focusParagraph),
  }))
  ctx.commandManager.handle()
  codeEl.focusToInnerEditable(ctx, true)
}
