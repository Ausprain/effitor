import type { Et } from '~/core/@types'

import { cr } from '../selection'

export const getCompositionStart = (ctx: Et.EditorContext) => {
  return () => {
    // 输入法开始时, 更新一次选区
    ctx.selection.update()
    // 标记使用 IME
    ctx.isUsingIME = true
    ctx.inCompositionSession = true
    ctx.compositionUpdateCount = 0
  }
}

export const getCompositionUpdate = (ctx: Et.EditorContext) => {
  return () => {
    ctx.compositionUpdateCount++
  }
}

export const getCompositionEnd = (ctx: Et.EditorContext) => {
  return (e: CompositionEvent) => {
    // ctx.inCompositionSession = false
    // 页面内失焦方式结束输入法会话, 会在compositionend后 发送一个不可取消的 deleteContentBackward
    // 因此需要延迟 compositionend 让beforeinput跳过这个 deleteContentBackward
    setTimeout(() => {
      ctx.inCompositionSession = false
      ctx.commandManager.commit()
    }, 0)

    // 手动更新输入法结束后的光标位置; 若selchange的防抖间隔短些, 如1ms, 那么此处更新是不必须的
    if (!e.data) {
      return
    }
    if (ctx.selection.anchorText) {
      ctx.setSelection(
        // 输入法构造期间, 选区为 range, anchofOffset为 startOffset;
        // 输入法构造完成, 光标落在 startoffset + e.data.length 的位置
        cr.caret(ctx.selection.anchorText, ctx.selection.anchorOffset + e.data.length),
      )
    }
  }
}
