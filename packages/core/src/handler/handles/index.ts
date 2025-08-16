import { Et } from '@effitor/core'

import {
  deleteCompositionText,
  insertCompositionText,
  insertFromComposition,
} from './composition'

export const buintinHandler: Et.EffectHandleMap = {
  // 输入法相关
  EinsertCompositionText: insertCompositionText,
  EdeleteCompositionText: deleteCompositionText,
  EinsertFromComposition: insertFromComposition,
}
