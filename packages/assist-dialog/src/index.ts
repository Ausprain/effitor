import type { Et } from '@effitor/core'

import { DialogManager, type DialogOptions } from './DialogManager'
import cssText from './index.css?raw'

declare module '@effitor/core' {
  interface EditorAssists {
    /**
     * 对话框助手, 在编辑器 mounted 时初始化
     */
    dialog?: DialogManager
  }
}

/**
 * dialog 的 DOM结构和位置
 * ```
 * <et-editor>
 *  <et-body></et-body>
 *  <div.et-dialog__backdrop>
 *      <div.et-dialog__container>
 *  </div.et-dialog__backdrop>
 * </et-editor>
 * ```
 */
export const useDialogAssist = (options?: DialogOptions): Et.EditorPluginSupportInline => ({
  name: '@effitor/dialog',
  cssText,
  effector: {
    inline: true,
    onMounted(ctx) {
      if (ctx.assists.dialog) {
        return
      }
      ctx.assists.dialog = new DialogManager(ctx, options)
    },
  },
})
