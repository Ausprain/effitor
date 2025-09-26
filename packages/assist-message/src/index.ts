import type { Et } from '@effitor/core'

import { getMessageManager, type MessageManager, type MessageOptions } from './MessageMamager'

declare module '@effitor/core' {
  interface EditorAssists {
    /**
     * 消息助手, 在插件注册时初始化
     */
    msg?: MessageManager
  }
}

export const useMessageAssist = (options?: MessageOptions): Et.EditorPluginSupportInline => ({
  name: '@effitor/message',
  effector: {
    inline: true,
  },
  registry(ctxMeta) {
    ctxMeta.assists.msg = getMessageManager(options)
  },
})
