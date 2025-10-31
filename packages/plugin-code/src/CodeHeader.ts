import type { Et } from '@effitor/core'
import { CssClassEnum, HtmlAttrEnum } from '@effitor/shared'

import { CodeEnum } from './config'
import type { CodeDecorateCallbacks, EtCodeElement } from './EtCodeElement'

export const codeHeader = (ctx: Et.EditorContext, el: EtCodeElement, cbs: CodeDecorateCallbacks) => {
  const header = document.createElement('div')
  const copyBtn = document.createElement('button')
  header.classList.add(CodeEnum.Class_Header)
  copyBtn.classList.add(CodeEnum.Class_Copy, CssClassEnum.BgItem)
  // copyBtn.title = 'Copy Code'
  copyBtn.setAttribute(HtmlAttrEnum.HintTitle, 'Copy Code')
  header.appendChild(copyBtn)

  copyBtn.onclick = () => {
    if (copyBtn.classList.contains(CodeEnum.Class_Copied)) {
      return
    }
    cbs.onCopy(ctx)
    copyBtn.classList.add(CodeEnum.Class_Copied)
    setTimeout(() => {
      copyBtn.classList.remove(CodeEnum.Class_Copied)
    }, 2000)
  }

  if (ctx.pctx.$code_ctx.canRenderHTML) {
    const renderBtn = document.createElement('button')
    renderBtn.classList.add(CodeEnum.Class_Render, CssClassEnum.BgItem)
    renderBtn.setAttribute(HtmlAttrEnum.HintTitle, 'Render HTML')
    header.appendChild(renderBtn)

    renderBtn.onclick = () => {
      const render = ctx.pctx.$code_ctx.renderHtmlCodeBlock
      if (!render) {
        return
      }
      ctx.commandManager.commitNextHandle(true)
      ctx.commandManager.pushByName('Functional', {
        meta: {
          _el: el,
          _render: render,
        },
        execCallback(ctx) {
          this.meta._render(ctx, this.meta._el)
        },
        undoCallback(ctx) {
          this.execCallback(ctx)
        },
      }).handle()
    }
  }
  return header
}
