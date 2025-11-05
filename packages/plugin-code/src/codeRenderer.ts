import { trimHtml } from '@effitor/shared'

export type RenderOptions = {
  [k in keyof RendererMap]?: Parameters<RendererMap[k]>[0]
}
export type CodeRenderer = Record<string, CodeParser>

interface CodeParser {
  codeToHTML(code: string): string
}

export const createCodeRenderer = (options: RenderOptions): CodeRenderer => {
  return Object.fromEntries(Object.entries(options).map(([k, v]) => [
    k,
    // @ts-expect-error: this is correct
    rendererMap[k as keyof RendererMap](v),
  ]))
}

const htmlCodeRenderer = ({ sanitizer}: { sanitizer: (html: string) => string }): CodeParser => {
  return {
    codeToHTML(code) {
      if (code && sanitizer) {
        code = sanitizer(code)
      }
      return trimHtml(code)
    },
  }
}
const latexCodeRenderer = ({ texToHtml }: { texToHtml: (tex: string) => string }): CodeParser => {
  return {
    codeToHTML(code) {
      return texToHtml(code.trim())
    },
  }
}

const rendererMap = {
  html: htmlCodeRenderer,
  latex: latexCodeRenderer,
}
type RendererMap = typeof rendererMap
