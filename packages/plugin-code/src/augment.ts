import type { Et } from '@effitor/core'

import type { CodeMirror } from './CodeMirror'
import { CodeEnum } from './config'
import type { EtCodeElement } from './EtCodeElement'
import type { EtCodeHighlighter } from './highlighter'

declare module '@effitor/core' {
  interface EditorSchema {
    code: typeof EtCodeElement
  }
  interface EditorPluginContext {
    [CodeEnum.CtxKey]: CodePluginContext
  }
  interface DefinedEtElementMap {
    [CodeEnum.ElName]: EtCodeElement
  }

  interface EffectHandleDeclaration {
    /**
     * 无视光标位置, 插入新行; 若为选区, 则根据选区方向, 在第一行后或最后一行后插入新行
     */
    insertNewLineInCode: Et.EffectHandle<{
      codeMirror: CodeMirror
    }>
    /** 向上移动当前行或选区 */
    codeLinesUp: Et.EffectHandle<{
      codeMirror: CodeMirror
    }>
    /** 向下移动当前行或选区 */
    codeLinesDown: Et.EffectHandle<{
      codeMirror: CodeMirror
    }>
  }
}

interface CodePluginContext {
  highlighter: EtCodeHighlighter<string>
  config: {
    /** 默认 Tab 大小, 单位为字符宽度 */
    defaultTabSize: number
  }
}
