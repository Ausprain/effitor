import type * as Et from '@effitor/core'

import { TextCounter, TextCounterOptions } from './TextCounter'

declare module '@effitor/core' {
  interface EditorAssists {
    /**
     * 文本计数器助手, 在编辑器 mounted 时初始化
     */
    textCounter?: TextCounter
  }
}

export const useCounterAssist = (options?: TextCounterOptions): Et.EditorPluginSupportInline => ({
  name: '@effitor/counter',
  effector: {
    inline: true,
    selChangeCallback: (_ev, ctx) => ctx.selection.isCollapsed || ctx.assists.textCounter?.forceUpdate(),
    onMounted(ctx) {
      if (ctx.assists.textCounter) {
        return
      }
      ctx.assists.textCounter = new TextCounter(ctx, options)
      ctx.assists.textCounter.startCounting()
    },
    onBeforeUnmount(ctx) {
      ctx.assists.textCounter?.stopCounting()
    },
  },
})
