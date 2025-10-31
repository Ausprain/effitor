import type { Et } from '@effitor/core'

import { CodeAttr, CodePluginContext, type HTMLRenderOptions } from './config'
import type { EtCodeElement } from './EtCodeElement'
import type { EtCodeHighlighter } from './highlighter'

export const initCodePluginContext = (
  ctxMeta: Et.EditorContextMeta,
  highlighter: EtCodeHighlighter<string>,
  {
    canRenderHTML = false,
    sanitizer = void 0,
    defaultTabSize = 2,
  }: HTMLRenderOptions & {
    defaultTabSize?: number
    sanitizer?: (html: string) => string
  } = {},
) => {
  // @ts-expect-error first assign
  ctxMeta.pctx.$code_ctx = {}

  // TODO 将此功能抽象，不仅支持渲染 html 块，后续还支持渲染图表等，这样就不用额外实现图表插件了
  let renderHtmlCodeBlock
  if (canRenderHTML) {
    renderHtmlCodeBlock = (ctx: Et.EditorContext, el: EtCodeElement) => {
      if (el.lang !== 'html' || !el.codeCtx) {
        return
      }
      const cc = el.codeCtx
      if (cc.wrapper.style.display === 'none') {
        el.querySelector('section')?.remove()
        cc.wrapper.style.display = 'block'
        cc.area.setSelectionRange(0, 0)
        Promise.resolve().then(() => {
          cc.area.focus()
        })
      }
      else {
        el.setAttribute(CodeAttr.Html_Rendered, '')
        cc.wrapper.style.display = 'none'
        const section = document.createElement('section')
        let html = cc.code
        if (html && ctx.pctx.$code_ctx.sanitizer) {
          html = ctx.pctx.$code_ctx.sanitizer(html)
        }
        section.innerHTML = html.replaceAll('\n', '')
        el.appendChild(section)
      }
    }
  }

  Object.assign<CodePluginContext, CodePluginContext>(ctxMeta.pctx.$code_ctx, {
    highlighter,
    defaultTabSize,
    canRenderHTML,
    sanitizer: canRenderHTML ? sanitizer : undefined,
    renderHtmlCodeBlock,
  })
}
