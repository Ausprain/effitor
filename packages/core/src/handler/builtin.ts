import type { Et } from '../@types'
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
  backspaceAtParagraphStart,
  deleteAtParagraphEnd,
} from './handles/delete/deleteParagraph'
import {
  deleteWordBackward,
  deleteWordForward,
} from './handles/delete/deleteWord'
import {
  insertFromEtHtml,
  insertFromPaste,
} from './handles/insert/insertFromPaste'
import { insertLineBreak } from './handles/insert/insertLineBreak'
import { insertParagraph } from './handles/insert/insertParagraph'
import { insertText } from './handles/insert/insertText'
import {
  initEditorContents,
  transformInsertContents,
  updateEditorContentsFromMarkdown,
} from './handles/others/default'

export const buintinHandler: Et.EffectHandleMap = {
  // 输入法相关
  EinsertCompositionText: insertCompositionText,
  EdeleteCompositionText: deleteCompositionText,
  EinsertFromComposition: insertFromComposition,

  // 插入相关
  EinsertText: insertText,
  EinsertLineBreak: insertLineBreak,
  EinsertParagraph: insertParagraph,

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
