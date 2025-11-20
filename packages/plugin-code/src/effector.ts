import type { Et } from '@effitor/core'
import { cmd, cr, useEffectorContext } from '@effitor/core'
import { codeBlockIcon } from '@effitor/shared'

import { CodeEnum } from './config'

const _ectx = useEffectorContext('$codeEx', {
  checkMarkCode: (ctx: Et.EditorContext) => {
    if (!ctx.selection.isCollapsed || !ctx.isPlainParagraph(ctx.commonEtElement)) {
      return false
    }
    const data = ctx.commonEtElement.textContent
    if (!data.startsWith('```')) {
      return false
    }
    const [lang, metaStr] = data.slice(3).split(' ')
    if (ctx.pctx.$codePx.highlighter.langs.includes(lang)) {
      const codeEl = ctx.schema.code.withDefaultDecoration(ctx, '', lang)
      codeEl.meta = metaStr
      ctx.commandManager.handleReplaceNode(ctx.commonEtElement, codeEl)
      codeEl.focusToInnerEditable(ctx, true)
      return true
    }
    return false
  },
})

export const codeEffector: Et.EffectorSupportInline<typeof _ectx> = {
  inline: true,
  keydownSolver: {
    [CodeEnum.ElName]: (ev, ctx) => {
      const cc = ctx.commonEtElement.codeCtx
      if (cc?.area !== ctx.selection.rawEl) {
        return
      }
      const handler = ctx.getEtHandler(ctx.commonEtElement)
      switch (ev.key) {
        case 'Backspace':
          if (!cc.code) {
            handler.replaceCodeWithParagraph?.(ctx, {
              codeEl: ctx.commonEtElement,
            })
            return ctx.preventAndSkipDefault(ev)
          }
          break
        case 'Enter':
          if ((ev.metaKey || ev.ctrlKey) && !ev.altKey && !ev.shiftKey) {
            handler.insertNewLineInCode?.(ctx, {
              codeCtx: cc,
            })
            return ctx.preventAndSkipDefault(ev)
          }
          break
        case 'ArrowDown':
          if (ev.altKey) {
            handler.codeLinesDown?.(ctx, {
              codeCtx: cc,
            })
            return ctx.preventAndSkipDefault(ev)
          }
          break
        case 'ArrowUp':
          if (ev.altKey) {
            handler.codeLinesUp?.(ctx, {
              codeCtx: cc,
            })
            return ctx.preventAndSkipDefault(ev)
          }
          break
      }
    },
    Enter: (ev, ctx, { $codeEx }) => {
      if ($codeEx.checkMarkCode(ctx)) {
        return ctx.preventAndSkipDefault(ev)
      }
    },
  },
  afterInputSolver: {
    [CodeEnum.ElName]: (ev, ctx) => {
      ctx.commonEtElement.codeCtx?.scrollIntoView(ctx, false)
      return ctx.preventAndSkipDefault(ev)
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
