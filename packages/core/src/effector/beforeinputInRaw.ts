import type { Et } from '../@types'
import { effectorContext } from './ectx'

export const solveInputInRawEl = (
  ev: Et.InputEvent, ctx: Et.UpdatedContext, rawEl: Et.HTMLRawEditElement, solver?: Et.InputSolver,
) => {
  if (!ctx.commonEtElement) {
    return
  }
  ev.preventDefault()
  ev.stopPropagation()
  const handler = ctx.getEtHandler(ctx.commonEtElement)
  const { selectionStart: start, selectionEnd: end } = rawEl
  switch (ev.inputType) {
    case 'insertCompositionText': {
      if (!ev.data) {
        return
      }
      handler.InsertCompositionTextInRawEl(ctx, {
        rawEl,
        data: ev.data,
      })
      break
    }
    case 'insertFromComposition':
      if (ev.data) {
        // Safari 中的 insertFromComposition, 相当于最后一下 insertCompositionText, 也需要通知
        handler.InsertCompositionTextInRawEl(ctx, {
          rawEl,
          data: ev.data,
        })
      }
    // eslint-disable-next-line no-fallthrough
    case 'insertFromDrop':
    case 'insertFromPaste':
    case 'insertText': {
      let data = ev.data
      if (!data) {
        data = ev.dataTransfer?.getData('text/plain') || ''
        if (!data) {
          return
        }
      }
      if (start === end) {
        handler.InsertTextInRawEl(ctx, { rawEl, data, offset: start })
      }
      else {
        handler.ReplaceTextInRawEl(ctx, { rawEl, data, start, end })
      }
      break
    }
    case 'insertLineBreak':
    case 'insertParagraph': {
      if (start === end) {
        handler.InsertTextInRawEl(ctx, { rawEl, data: '\n', offset: start })
      }
      else {
        handler.ReplaceTextInRawEl(ctx, { rawEl, data: '\n', start, end })
      }
      break
    }
    case 'deleteContentBackward':
    case 'deleteWordBackward':
    case 'deleteContentForward':
    case 'deleteWordForward':
    case 'deleteSoftLineBackward':
    case 'deleteSoftLineForward': {
      const isBackward = ev.inputType.at(-8) === 'B'
      const deleteWord = ev.inputType[6] === 'W'
      const deleteLine = ev.inputType[6] === 'S'
      if (start === end) {
        handler.DeleteInRawEl(ctx, { rawEl, isBackward, deleteType: deleteLine ? 'line' : deleteWord ? 'word' : 'char' })
      }
      else {
        handler.DeleteTextInRawEl(ctx, { rawEl, start, end, selectMode: isBackward ? 'end' : 'start' })
      }
      break
    }
    case 'deleteContent':
    case 'deleteByCut': {
      if (start === end) {
        return
      }
      handler.DeleteTextInRawEl(ctx, { rawEl, start, end, selectMode: 'end' })
      break
    }
    case 'formatIndent': {
      handler.FormatIndentInRawEl(ctx, { rawEl, start, end })
      break
    }
    case 'formatOutdent':
      handler.FormatOutdentInRawEl(ctx, { rawEl, start, end })
      break
    case 'historyRedo':
    case 'historyUndo': {
      solver?.[ev.inputType]?.(ev, ctx, effectorContext)
      break
    }

    default:
      ev.preventDefault()
  }
  ctx.commandManager.handle()
}
