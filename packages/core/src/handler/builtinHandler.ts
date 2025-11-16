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
  deleteBackwardAtParagraphStart,
  deleteForwardAtParagraphEnd,
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
import { dblSpace, tabout } from './handles/others/caretout'
import {
  insertParagraphAtParagraphEnd,
  insertParagraphAtParagraphStart,
  paragraphCopyDown,
  paragraphCopyUp,
  paragraphMoveDown,
  paragraphMoveUp,
  transformInsertContents,
} from './handles/others/default'
import {
  deleteInRawEl,
  deleteTextInRawEl,
  insertCompositionTextInRawEl,
  insertTextInRawEl,
  replaceTextInRawEl,
} from './handles/others/inRawEl'

export const buintinHandler: Et.EffectHandler = {
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

  /* -------------------------------------------------------------------------- */
  /*                                   others                                   */
  /* -------------------------------------------------------------------------- */
  // 非标准; 需通过 将 inputType 写在 InputEvent.data 里或直接通过 effectInvoker 来触发

  // @ts-expect-error no error, deliberately, do not expose this effect outside package `@effitor/core`.
  InsertFromEtHtml: insertFromEtHtml,
  TransformInsertContents: transformInsertContents,

  InsertParagraphAtParagraphStart: insertParagraphAtParagraphStart,
  InsertParagraphAtParagraphEnd: insertParagraphAtParagraphEnd,
  DeleteBackwardAtParagraphStart: deleteBackwardAtParagraphStart,
  DeleteForwardAtParagraphEnd: deleteForwardAtParagraphEnd,

  tabout: tabout,
  dblSpace: dblSpace,

  /* -------------------------------------------------------------------------- */
  /*                                   rawEl                                    */
  /* -------------------------------------------------------------------------- */
  InsertCompositionTextInRawEl: insertCompositionTextInRawEl,
  InsertTextInRawEl: insertTextInRawEl,
  DeleteInRawEl: deleteInRawEl,
  DeleteTextInRawEl: deleteTextInRawEl,
  ReplaceTextInRawEl: replaceTextInRawEl,
}

export const paragraphBuiltinHandler: Et.EffectHandler = {
  ParagraphMoveUp: paragraphMoveUp,
  ParagraphMoveDown: paragraphMoveDown,
  ParagraphCopyUp: paragraphCopyUp,
  ParagraphCopyDown: paragraphCopyDown,
}
