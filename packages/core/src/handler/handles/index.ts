import { Et } from '@effitor/core'

import {
  deleteCompositionText,
  insertCompositionText,
  insertFromComposition,
} from './composition'
import { deleteContent, deleteContentBackward, deleteContentForward } from './delete/deleteContent'
import { deleteWordBackward, deleteWordForward } from './delete/deleteWord'
import { insertText } from './insert/insertText'

export const buintinHandler: Et.EffectHandleMap = {
  // 输入法相关
  EinsertCompositionText: insertCompositionText,
  EdeleteCompositionText: deleteCompositionText,
  EinsertFromComposition: insertFromComposition,

  // 插入相关
  EinsertText: insertText,

  // 删除相关
  EdeleteContent: deleteContent,
  EdeleteContentBackward: deleteContentBackward,
  EdeleteContentForward: deleteContentForward,
  EdeleteWordBackward: deleteWordBackward,
  EdeleteWordForward: deleteWordForward,
}
