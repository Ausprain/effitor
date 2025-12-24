import './index.css'

import type { Et } from '@effitor/core'

import { type HeadingActionMap, headingActions, headingEffector } from './effector'
import { getHeadingListenEffector, type HeadingItem } from './effector/listen'
import { EtHeadingElement } from './EtHeadingElement'

export interface HeadingPluginOptions {
  /**
   * 是否隐藏标题前的`#1`标记符
   */
  hiddenHeadingLevelMarker?: boolean
  /** 标题树更新时触发 */
  onHeadingTreeUpdated?: (tree: HeadingItem[]) => void
  /** 标题链更新时触发 */
  onHeadingChainUpdated?: (chain: HeadingItem[]) => void
  useActions?: (actions: HeadingActionMap) => void
}
export { EtHeadingElement }
export const useHeadingPlugin = (options?: HeadingPluginOptions): Et.EditorPlugin => {
  options?.useActions?.(headingActions)
  return {
    name: '@effitor/plugin-heading',
    effector: [headingEffector, getHeadingListenEffector(options)],
    elements: [EtHeadingElement],
    register(ctxMeta, setSchema) {
      setSchema({ heading: EtHeadingElement })
      // 注册actions
      ctxMeta.actions.heading = headingActions
    },
  }
}
