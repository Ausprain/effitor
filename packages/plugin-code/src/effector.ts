import type { Dropdown } from '@effitor/assist-dropdown'
import type { Et } from '@effitor/core'
import { cmd, cr } from '@effitor/core'
import { codeBlockIcon } from '@effitor/shared'

import { CodeEnum } from './config'
import type { EtCodeElement } from './EtCodeElement'

const checkMarkCode = (ctx: Et.EditorContext) => {
  if (!ctx.selection.isCollapsed || !ctx.isPlainParagraph(ctx.commonEtElement)) {
    return false
  }
  const data = ctx.commonEtElement.textContent
  if (!data.startsWith('```')) {
    return false
  }
  const [alias, metaStr] = data.slice(3).split(' ')
  const lang = ctx.pctx.$codePx.highlighter.langs[alias as string]
  if (lang !== undefined) {
    const codeEl = ctx.schema.code.withDefaultDecoration(ctx, '', lang)
    codeEl.meta = metaStr || ''
    ctx.commandManager.handleReplaceNode(ctx.commonEtElement, codeEl)
    codeEl.focusToInnerEditable(ctx, true)
    return true
  }
  return false
}

export const codeEffector: Et.Effector = {
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
    Enter: (ev, ctx) => {
      if (checkMarkCode(ctx)) {
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
  onStatusChanged: (ctx, type, oldValue) => {
    if (type !== 'readonly') {
      return
    }
    ctx.root.querySelectorAll(CodeEnum.ElName).forEach((el) => {
      if ((el as EtCodeElement).codeCtx) {
        if (oldValue) {
          (el as EtCodeElement).codeCtx.enable()
        }
        else {
          (el as EtCodeElement).codeCtx.disable()
        }
      }
    })
  },
}

const addCodeBlockItemToDropdown = (dd?: Dropdown) => {
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

/**
 * 插入代码块
 * @param ctx 编辑器上下文
 * @param param1 代码块参数
 * @param param1.code 代码内容
 * @param param1.lang 代码语言
 * @param param1.async 是否异步高亮
 * @returns 是否插入成功
 */
export const insertCodeBlock = (ctx: Et.EditorContext, {
  code = '',
  lang = '',
  async = false,
}: {
  code?: string
  lang?: string
  async?: boolean
} = {}) => {
  if (!ctx.focusParagraph) {
    return false
  }
  const codeEl = ctx.schema.code.withDefaultDecoration(ctx, code, lang, async)
  ctx.commandManager.push(cmd.insertNode({
    node: codeEl,
    execAt: cr.caretOutEnd(ctx.focusParagraph),
  }))
  ctx.commandManager.handle()
  codeEl.focusToInnerEditable(ctx, true)
}

export const codeActions = {
  /**
   * 插入代码块
   * @param ctx 编辑器上下文
   * @param param1 代码块参数
   * @param param1.code 代码内容
   * @param param1.lang 代码语言
   * @param param1.async 是否异步高亮
   * @returns 是否插入成功
   */
  insertCodeBlock,
}
export type CodeActionMap = typeof codeActions
