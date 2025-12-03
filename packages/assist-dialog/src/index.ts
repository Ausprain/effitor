import type { Et } from '@effitor/core'

import { type DialogAssistOptions, DialogManager } from './DialogManager'
import cssText from './index.css?raw'

declare module '@effitor/core' {
  interface EditorAssists {
    /**
     * 对话框助手, 在编辑器 mounted 时初始化
     */
    dialog: DialogManager
  }
}

export type * from './DialogManager'
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
export const useDialogAssist = (options?: DialogAssistOptions): Et.EditorPlugin => ({
  name: '@effitor/assist-dialog',
  cssText,
  effector: {
    onMounted(ctx) {
      ctx.assists.dialog = new DialogManager(ctx, options)
    },
  },
})
