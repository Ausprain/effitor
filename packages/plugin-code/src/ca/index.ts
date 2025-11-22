import type { Et } from '@effitor/core'

import { codeAreaEffector } from './effector'
import { CODE_LINE_TYPE, EtCodeAreaElement, EtCodeLineElement } from './EtCodeAreaElement'
import { codeAreaHandler, codeLineHandler } from './handler'
import cssText from './index.css?raw'

export const useCodeAreaPlugin = (): Et.EditorPlugin => {
  return {
    name: 'code-area',
    cssText,
    effector: codeAreaEffector,
    elements: [EtCodeAreaElement, EtCodeLineElement],
    register(_ctxMeta, _setSchema, mountEtHandler) {
      mountEtHandler(EtCodeAreaElement, codeAreaHandler, CODE_LINE_TYPE)
      mountEtHandler(EtCodeLineElement, codeLineHandler)
    },
  }
}
