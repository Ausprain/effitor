import type { Et } from '@effitor/core'

import { createCodeRenderer, type RenderOptions } from './codeRenderer'
import { CodeEnum, type CodePluginContext } from './config'
import type { EtCodeElement } from './EtCodeElement'
import type { EtCodeHighlighter } from './highlighter'

export const initCodePluginContext = (
  ctxMeta: Et.EditorContextMeta,
  highlighter: EtCodeHighlighter<string>,
  {
    defaultTabSize = 2,
    renderOptions = {},
  }: {
    defaultTabSize?: number
    renderOptions?: RenderOptions
  } = {},
) => {
  const _codeRenderer = createCodeRenderer(renderOptions)
  const renderCodeBlock = (ctx: Et.EditorContext, el: EtCodeElement) => {
    const codeRenderer = ctx.pctx.$codePx.codeRenderer
    if (!el.lang || !el.codeCtx) {
      ctx.assists.logger?.logError('code block render fail: no lang or codeCtx', 'et-code')
      return
    }
    const parser = codeRenderer[el.lang]
    if (!parser) {
      ctx.assists.logger?.logError(`code block render fail: no parser for lang '${el.lang}'`, 'et-code')
      return
    }
    const cc = el.codeCtx
    if (cc.wrapper.style.display === 'none') {
      el.classList.remove(CodeEnum.Class_Rendered)
      el.querySelector('section')?.remove()
      cc.wrapper.style.display = 'block'
      cc.area.setSelectionRange(0, 0)
      Promise.resolve().then(() => {
        cc.area.focus()
      })
    }
    else {
      el.classList.add(CodeEnum.Class_Rendered)
      cc.wrapper.style.display = 'none'
      const section = document.createElement('section')
      const html = cc.code
      section.innerHTML = html ? parser.codeToHTML(html) : ''
      if (el.lang === 'latex') {
        section.style.textAlign = 'center'
      }
      el.appendChild(section)
    }
  }

  // @ts-expect-error first assign
  ctxMeta.pctx.$codePx = {}
  Object.assign<CodePluginContext, CodePluginContext>(ctxMeta.pctx.$codePx, {
    highlighter,
    defaultTabSize,
    codeRenderer: _codeRenderer,
    renderCodeBlock,
    parseLangFromNativeElement: (el) => {
      for (const cls of el.classList) {
        if (cls.startsWith('lang-') || cls.startsWith('language-')) {
          return cls.split('-')[1]
        }
      }
      return null
    },
  })
}
