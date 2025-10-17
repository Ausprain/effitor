import type { Et } from '@effitor/core'

import { codeAreaEffector } from './effector'
import { EtCodeAreaElement, EtCodeLineElement } from './EtCodeAreaElement'
import { codeAreaHandler, codeLineHandler } from './handler'
import cssText from './index.css?raw'

export const useCodeAreaPlugin = (): Et.EditorPluginSupportInline => {
  return {
    name: 'code-area',
    cssText,
    effector: codeAreaEffector,
    elements: [EtCodeAreaElement, EtCodeLineElement],
    registry(_ctxMeta, _setSchema, extentEtElement) {
      extentEtElement(EtCodeAreaElement, codeAreaHandler, [EtCodeLineElement])
      extentEtElement(EtCodeLineElement, codeLineHandler, [])
    },
  }
}
