import type { Et } from '@effitor/core'
import { etcode } from '@effitor/core'

import type { CodeRenderer } from './codeRenderer'
import type { EtCodeElement } from './EtCodeElement'
import type { EtCodeHighlighter } from './highlighter'

export const enum CodeEnum {
  ElName = 'et-code',
  /** 代码自动换行 */
  Class_CodeWrap = 'et-code--wrap',
  /** 不显示行号 */
  Class_NoLineNumber = 'et-code--no',
  /** 已渲染的代码块 */
  Class_Rendered = 'et-code--rendered',
  /**
   * 代码块结构:
   * ```
   * et-code.--wrap.--no
   *   div.header
   *     button.render
   *     button.copy.--copied
   *   div.wrapper <scroll>
   *     div.container
   *       pre
   *         span.line
   *         span.line
   *         ...
   *       textarea
   * ```
   */
  Class_Wrapper = 'et-code__wrapper',
  Class_Container = 'et-code__container',
  Class_CodeLine = 'et-code__line',
  Class_Header = 'et-code__header',
  Class_Btn_Copy = 'et-code__copy',
  Class_Btn_Copied = 'et-code__copy--copied',
  Class_Btn_Render = 'et-code__render',
}
export const enum CodeAttr {
  /** 代码语言 */
  Lang = 'et-code-lang',
  /** 代码元数据 */
  Meta = 'et-code-meta',
  /** 代码内容 */
  Code_Value = 'et-code-value',
}

export interface CodeBlockRenderOptions {
  /**
   * 支持渲染语言类型: html, latex, markdown; 配置后在对应语言的代码块可通过右上角按钮渲染对应代码的内容
   */
  canRenderLangs?: ('html' | 'latex' /** | 'markdown' */)[]
  /**
   * 代码块内 html 渲染时的安全策略, 该配置仅在 canRenderLangs 包含 html 时生效
   * * undefined: （默认）使用 dompurify 库进行安全处理
   * * null: 不进行安全处理
   * * (html: string) => string: 自定义安全处理函数
   */
  sanitizer?: null | ((html: string) => string)
}

export interface CodePluginContext {
  readonly highlighter: EtCodeHighlighter<string>
  readonly defaultTabSize: number
  readonly codeRenderer: CodeRenderer
  readonly renderCodeBlock: (ctx: Et.EditorContext, el: EtCodeElement) => void
}

export const CODE_ET_TYPE = etcode.get(CodeEnum.ElName)

export const Brackets: Record<string, string> = {
  '(': ')',
  '[': ']',
  '{': '}',
}
