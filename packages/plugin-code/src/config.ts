import type { Et } from '@effitor/core'
import { etcode } from '@effitor/core'

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
}
export const enum CodeAttr {
  /** 代码语言 */
  Lang = 'et-code-lang',
  /** 代码元数据 */
  Meta = 'et-code-meta',
  /** 代码内容 */
  Code_Value = 'et-code-value',
}
export const CODE_ET_TYPE = etcode.get(CodeEnum.ElName)

export const initCodePluginContext = (
  ctxMeta: Et.EditorContextMeta,
  highlighter: EtCodeHighlighter<string>,
  defaultTabSize: number,
) => {
  // @ts-expect-error first assign
  ctxMeta.pctx.$code_ctx = {
    highlighter,
    config: {
      defaultTabSize,
    },
  }
}

export const Brackets: Record<string, string> = {
  '(': ')',
  '[': ']',
  '{': '}',
}
