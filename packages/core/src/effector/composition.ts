import type { Et } from '~/core/@types'

import { platform } from '../config'

export const getCompositionStart = (ctx: Et.EditorContext) => {
  return () => {
    // 输入法开始时, 选区非 collapsed, 先删除(自动更新光标位置信息)
    if (!ctx.selection.isCollapsed) {
      ctx.commonHandlers.removeRangingContents()
    }
    else {
      // 更新光标位置信息, 并滚到可见区域
      ctx.forceUpdate()
      ctx.selection.revealSelectionSync()
    }
    // 标记使用 IME
    ctx.isUsingIME = true
    ctx.inCompositionSession = true
    ctx.compositionUpdateCount = 0
    ctx.skipNextKeydown()
  }
}

export const getCompositionUpdate = (ctx: Et.EditorContext) => {
  return () => {
    ctx.compositionUpdateCount++
    ctx.skipNextKeydown()
  }
}

export const getCompositionEnd = (ctx: Et.EditorContext) => {
  return (_e: CompositionEvent) => {
    // fix. Windows 下 Chromium, 采用页面内失焦方式结束输入法会话, 会在compositionend后
    // 发送一个不可取消的 deleteContentBackward 因此需要延迟 inCompositionSession = false,
    // 让beforeinput跳过这个 deleteContentBackward
    setTimeout(() => {
      ctx.inCompositionSession = false
      ctx.commandManager.commit()
    }, 0)

    // 解决 MacOS 下 Safari 的 composition 事件先于 keydown 执行, 导致输入法结束后
    // 多执行一个 keydown 引起的 beforeinput 事件的问题
    ctx.skipNextKeydown()

    if (!platform.isSafari) {
      // Safari 的输入法插入文本可拦截, 使用 insertText 命令插入 并设置设置光标位置, 更新ctx
      // 非 Safari 下, 输入法插入无法拦截, 需手动更新上下文
      ctx.forceUpdate()
    }
  }
}
