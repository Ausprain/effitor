import type { Et } from '../@types'

export const getCompositionStart = (ctx: Et.EditorContext) => {
  return () => {
    // 输入法开始时必须强制更新上下文获取最新的光标位置
    ctx.forceUpdate()
    // 输入法开始时, 选区非 collapsed, 先删除(自动更新光标位置信息)
    if (!ctx.selection.isCollapsed) {
      ctx.commonHandler.removeRangingContents()
      // 更新光标位置信息, 并滚到可见区域
      ctx.selection.scrollIntoViewSync()
    }
    ctx.commandManager.commit()
    ctx.composition.onStart()
  }
}

export const getCompositionUpdate = (ctx: Et.EditorContext) => {
  return () => {
    ctx.composition.onUpdate()
    ctx.skipNextKeydown()
  }
}

export const getCompositionEnd = (ctx: Et.EditorContext) => {
  return (ev: CompositionEvent) => {
    ctx.composition.onEnd(ev.data)
  }
}
