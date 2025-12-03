import type { Et } from '@effitor/core'

import type { CodeContext } from './CodeContext'
import { CodeEnum, type CodePluginContext } from './config'
import type { CodeActionMap } from './effector'
import type { EtCodeElement } from './EtCodeElement'

declare module '@effitor/core' {
  interface EditorSchema {
    code: typeof EtCodeElement
  }
  interface EditorActions {
    /** code block plugin actions */
    code: CodeActionMap
  }
  interface EditorPluginContext {
    $codePx: CodePluginContext
  }
  interface DefinedEtElementMap {
    [CodeEnum.ElName]: EtCodeElement
  }

  interface EffectHandleDeclaration {
    /** 替换代码块为段落块 */
    replaceCodeWithParagraph: Et.EffectHandle<{ codeEl: EtCodeElement }>
    /** 无视光标位置, 插入新行; 若为选区, 则根据选区方向, 在第一行后或最后一行后插入新行 */
    insertNewLineInCode: Et.EffectHandle<{ codeCtx: CodeContext }>
    /** 向上移动当前行或选区 */
    codeLinesUp: Et.EffectHandle<{ codeCtx: CodeContext }>
    /** 向下移动当前行或选区 */
    codeLinesDown: Et.EffectHandle<{ codeCtx: CodeContext }>
  }
}
