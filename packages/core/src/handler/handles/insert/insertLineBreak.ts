import { HtmlCharEnum } from '@effitor/shared'

import { cr } from '../../../selection'
import { dom } from '../../../utils'
import { createInputEffectHandle } from '../../utils'
import { insertElementAtCaret } from './insert.shared'

export const insertLineBreak = createInputEffectHandle((ctx, pl) => {
  // 选区非 collapsed, 禁止插入 br, 折叠选区到focus 位置
  if (!pl.targetRange.collapsed) {
    ctx.selection.collapse(!ctx.selection.isForward)
    return true
  }
  // 插入 br 或 \n
  if (ctx.editor.config.INSERT_BR_FOR_LINE_BREAK) {
    const br = dom.el('br')
    insertElementAtCaret(ctx, br, pl.targetRange.toTargetCaret(), cr.caretOutEnd(br))
  }
  else {
    ctx.commonHandler.insertText(HtmlCharEnum.MOCK_LINE_BREAK, pl.targetRange.toTargetCaret())
  }
  return true
})
