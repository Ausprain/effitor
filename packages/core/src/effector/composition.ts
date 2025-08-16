import type { Et } from '..'
import { cr } from '../selection'

export const getCompositionStart = (ctx: Et.EditorContext) => {
  return () => {
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
        cr.caret(ctx.selection.anchorText, ctx.selection.anchorOffset + e.data.length),
      )
    }
  }
}
