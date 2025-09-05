import type { Et } from '../@types'
import { etcode } from '../element'
import { CssClassEnum } from '../enums'
// import { debounce } from '../utils'

export const getSelectionChangeListener = (
  ctx: Et.EditorContext,
  callback?: ((e: Event, c: Et.EditorContext) => void),
) => {
  // return debounce((e: Event) => {
  return (e: Event) => {
    if (import.meta.env.DEV) {
      // console.error('sel change, incomp?', ctx.inCompositionSession)
    }
    // 在输入法会话中, 跳过
    if (ctx.inCompositionSession) {
      return
    }
    if (!ctx.hasInsertText) {
      ctx.hotstringManager.needResetBeforeJudge()
    }
    if (['input', 'textarea'].includes((e.target as HTMLElement)?.localName)) {
      ctx.selection.setInRaw(e.target as HTMLInputElement | HTMLTextAreaElement)
    }
    else if (ctx.selection.rawEl) {
      ctx.selection.setInRaw(null)
    }

    // FIXME 若防抖间隔较大, 此处再跳过一次更新, 可能会导致光标位置未能及时更新, 从而引发错误;
    // 此bug尚未稳定复现, 不确定是此处引起; 待观察
    if (ctx.selChangeSkipped) {
      return
    }
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
  // }, 21)
}
