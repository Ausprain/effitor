import type { Et } from '@effitor/core'

import { getMessageManager, type MessageAssistOptions, type MessageManager } from './MessageMamager'

declare module '@effitor/core' {
  interface EditorAssists {
    /**
     * 消息助手, 在插件注册时初始化
     */
    msg?: MessageManager
  }
}

export const useMessageAssist = (options?: MessageAssistOptions): Et.EditorPluginSupportInline => ({
  name: '@effitor/assist-message',
  effector: {
    inline: true,
  },
  registry(ctxMeta) {
    ctxMeta.assists.msg = getMessageManager(options)
  },
})
