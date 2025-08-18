import type { Et } from '~/core/@types'

import { CssClassEnum } from '../enums'
import { debounce } from '../utils'

export const getSelectionChangeListener = (
  ctx: Et.EditorContext,
  callback?: ((e: Event, c: Et.EditorContext) => void),
) => {
  return debounce((e: Event) => {
    // 在输入法会话中, 跳过
    if (ctx.inCompositionSession) {
      return
    }
    if (!ctx.hasInsertText) {
      ctx.hotstringManager.needResetBeforeJudge()
    }
    // if (import.meta.env.DEV) {
    //   console.error('sel change')
    // }

    // FIXME 此处跳过一次更新, 可能会导致光标位置未能及时更新, 从而引发错误;
    // 此bug尚未稳定复现, 不确定是此处引起; 待观察
    if (ctx.selChangeSkipped) {
      return
    }
    ctx.forceUpdate()
    if (ctx.selection.isCollapsed && ctx.body) {
      if (ctx.body.classList.contains(CssClassEnum.SelectionRange)) {
        ctx.body.classList.remove(CssClassEnum.SelectionRange)
      }
    }
    else if (ctx.body) {
      if (!ctx.body.classList.contains(CssClassEnum.SelectionRange)) {
        ctx.body.classList.add(CssClassEnum.SelectionRange)
      }
    }
    callback?.(e, ctx)
  }, 96)
}
