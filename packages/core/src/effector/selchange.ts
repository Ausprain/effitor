import { CssClassEnum } from '@effitor/shared'

import type { Et } from '../@types'
import { etcode } from '../element'

export const getSelectionChangeListener = (
  ctx: Et.EditorContext,
  callback?: ((e: Event, c: Et.EditorContext) => void),
) => {
  return (e: Event) => {
    // if (import.meta.env.DEV) {
    // console.error('sel change, incomp?')
    // }
    // 在输入法会话中, 跳过
    if (ctx.composition.inSession) {
      return
    }
    if (['input', 'textarea'].includes((e.target as HTMLElement)?.localName)) {
      ctx.selection.setInRaw(e.target as HTMLInputElement | HTMLTextAreaElement)
    }
    else if (ctx.selection.rawEl) {
      ctx.selection.setInRaw(null)
    }

    if (ctx.selChangeSkipped) {
      return
    }
    // 光标不连续, 重置热字符串判断
    ctx.hotstringManager.needResetBeforeJudge()
    // activeElement 不是效应元素, 跳过更新上下文, 因为这是全局的 selectionchange 事件
    if (!document.activeElement || !etcode.check(document.activeElement)) {
      return
    }
    ctx.update()
    ctx.selection.clearSelectAllLevel()
    if (ctx.selection.isCollapsed) {
      if (ctx.bodyEl.classList.contains(CssClassEnum.SelectionRange)) {
        ctx.bodyEl.classList.remove(CssClassEnum.SelectionRange)
      }
    }
    else {
      if (!ctx.bodyEl.classList.contains(CssClassEnum.SelectionRange)) {
        ctx.bodyEl.classList.add(CssClassEnum.SelectionRange)
      }
    }
    callback?.(e, ctx)
  }
}
