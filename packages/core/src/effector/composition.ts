import type { Et } from '../@types'

export const getCompositionStart = (ctx: Et.EditorContext) => {
  return () => {
    // 输入法开始时必须强制更新上下文获取最新的光标位置
    // ctx.forceUpdate()
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
