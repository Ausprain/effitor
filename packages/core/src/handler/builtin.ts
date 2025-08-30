import type { Et } from '~/core/@types'

import {
  deleteCompositionText,
  insertCompositionText,
  insertFromComposition,
} from './handles/composition'
import { deleteByCut } from './handles/delete/deleteByCut'
import {
  deleteContent,
  deleteContentBackward,
  deleteContentForward,
} from './handles/delete/deleteContent'
import {
  deleteEntireSoftLine,
  deleteSoftLineBackward,
  deleteSoftLineForward,
} from './handles/delete/deleteLine'
import {
  deleteWordBackward,
  deleteWordForward,
} from './handles/delete/deleteWord'
import {
  insertFromEtHtml,
  insertFromPaste,
} from './handles/insert/insertFromPaste'
import { insertText } from './handles/insert/insertText'
import {
  initEditorContents,
  transformInsertContents,
  updateEditorContentsFromMarkdown,
} from './handles/no-standard/default'
import {
  backspaceAtParagraphStart,
  deleteAtParagraphEnd,
} from './handles/no-standard/delete'

export const buintinHandler: Et.EffectHandleMap = {
  // 输入法相关
  EinsertCompositionText: insertCompositionText,
  EdeleteCompositionText: deleteCompositionText,
  EinsertFromComposition: insertFromComposition,

  // 插入相关
  EinsertText: insertText,
  EinsertFromPaste: insertFromPaste,

  // 删除相关
  EdeleteByCut: deleteByCut,
  EdeleteContent: deleteContent,
  EdeleteContentBackward: deleteContentBackward,
  EdeleteContentForward: deleteContentForward,
  EdeleteWordBackward: deleteWordBackward,
  EdeleteWordForward: deleteWordForward,
  EdeleteEntireSoftLine: deleteEntireSoftLine,
  EdeleteSoftLineBackward: deleteSoftLineBackward,
  EdeleteSoftLineForward: deleteSoftLineForward,

  // 非标准; 需通过 将 inputType 写在 InputEvent.data 里或直接通过 effectInvoker 来触发
  BackspaceAtParagraphStart: backspaceAtParagraphStart,
  DeleteAtParagraphEnd: deleteAtParagraphEnd,

  InitEditorContents: initEditorContents,
  UpdateEditorContentsFromMarkdown: updateEditorContentsFromMarkdown,

  TransformInsertContents: transformInsertContents,

  // @ts-expect-error no error, deliberately, do not expose this effect outside package `@effitor/core`.
  InsertFromEtHtml: insertFromEtHtml,
}
