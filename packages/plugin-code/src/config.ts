import type { Et } from '@effitor/core'
import { etcode } from '@effitor/core'

import type { EtCodeElement } from './EtCodeElement'
import type { EtCodeHighlighter } from './highlighter'

export const enum CodeEnum {
  ElName = 'et-code',
  Class_Wrapper = 'et-code__wrapper',
  Class_CodeLine = 'et-code__line',
  Class_Header = 'et-code__header',
  /** 代码自动换行 */
  Class_CodeWrap = 'et-code--wrap',
  /** 不显示行号 */
  Class_NoLineNumber = 'et-code--no',
  Class_Copy = 'et-code__copy',
  Class_Copied = 'et-code__copy--copied',
  Class_Render = 'et-code__render',
}
export const enum CodeAttr {
  /** 代码语言 */
  Lang = 'et-code-lang',
  /** 代码元数据 */
  Meta = 'et-code-meta',
  /** 代码内容 */
  Code_Value = 'et-code-value',
  /** 已渲染的html代码块 */
  Html_Rendered = 'et-html',
}

export interface HTMLRenderOptions {
  /**
   * 是否支持渲染 HTML, 开启且代码块语言为 html时，可通过右上角按钮将当前代码块内的 html 渲染
   * @default false
   */
  canRenderHTML?: boolean
  /**
   * 代码块内 html 渲染时的安全策略, 该配置仅在 canRenderHTML 为 true 时生效
   * * undefined：使用 dompurify 库进行安全处理 （默认）
   * * null：不进行安全处理
   * * (html: string) => string： 自定义安全处理函数
   */
  sanitizer?: null | ((html: string) => string)
}

export interface CodePluginContext extends HTMLRenderOptions {
  highlighter: EtCodeHighlighter<string>
  /** 默认 Tab 大小, 单位为字符宽度 */
  defaultTabSize: number
  sanitizer?: (html: string) => string
  renderHtmlCodeBlock?: (ctx: Et.EditorContext, el: EtCodeElement) => void
}

export const CODE_ET_TYPE = etcode.get(CodeEnum.ElName)

export const Brackets: Record<string, string> = {
  '(': ')',
  '[': ']',
  '{': '}',
}
