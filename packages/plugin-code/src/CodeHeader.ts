import type { Et } from '@effitor/core'
import { CssClassEnum, HtmlAttrEnum } from '@effitor/shared'

import { CodeEnum } from './config'
import type { CodeDecorateCallbacks, EtCodeElement } from './EtCodeElement'

export const codeHeader = (ctx: Et.EditorContext, el: EtCodeElement, cbs: CodeDecorateCallbacks) => {
  const header = document.createElement('div')
  const copyBtn = document.createElement('button')
  header.classList.add(CodeEnum.Class_Header)
  copyBtn.classList.add(CodeEnum.Class_Btn_Copy, CssClassEnum.BgItem)
  copyBtn.setAttribute(HtmlAttrEnum.HintTitle, 'Copy Code')
  header.appendChild(copyBtn)

  copyBtn.onclick = () => {
    if (copyBtn.classList.contains(CodeEnum.Class_Btn_Copied)) {
      return
    }
    cbs.onCopy(ctx)
    copyBtn.classList.add(CodeEnum.Class_Btn_Copied)
    setTimeout(() => {
      copyBtn.classList.remove(CodeEnum.Class_Btn_Copied)
    }, 2000)
  }

  if (ctx.pctx.$code_ctx.codeRenderer[el.lang]) {
    const renderBtn = document.createElement('button')
    renderBtn.classList.add(CodeEnum.Class_Btn_Render, CssClassEnum.BgItem)
    renderBtn.setAttribute(HtmlAttrEnum.HintTitle, 'Render Code')
    header.appendChild(renderBtn)

    renderBtn.onclick = () => {
      const render = ctx.pctx.$code_ctx.renderCodeBlock
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
