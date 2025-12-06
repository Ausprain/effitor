import type * as Et from '@effitor/core'

import { type CounterAssistOptions, TextCounter } from './TextCounter'

declare module '@effitor/core' {
  interface EditorAssists {
    /**
     * 文本计数器助手, 在编辑器 mounted 时初始化
     */
    textCounter: TextCounter
  }
}

export type * from './TextCounter'
export const useCounterAssist = (options?: CounterAssistOptions): Et.EditorPlugin => ({
  name: '@effitor/assist-counter',
  effector: {
    selChangeCallback: (_ev, ctx) => ctx.selection.isCollapsed || ctx.assists.textCounter.forceUpdate(),
    onMounted(ctx) {
      ctx.assists.textCounter = new TextCounter(ctx, options)
      ctx.assists.textCounter.startCounting()
    },
    onBeforeUnmount(ctx) {
      ctx.assists.textCounter.stopCounting()
    },
  },
})
