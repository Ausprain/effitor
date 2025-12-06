import type { Et } from '@effitor/core'

import { HeadingEnum } from './config'
import { type HeadingActionMap, headingActions, headingEffector } from './effector'
import { EtHeadingElement } from './EtHeadingElement'
import cssText from './index.css?raw'

export { HeadingEnum }
export interface HeadingPluginOptions {
  /**
   * 是否隐藏标题前的`#1`标记符
   */
  hiddenHeadingLevelMarker?: boolean
  useActions?: (actions: HeadingActionMap) => void
}
export { EtHeadingElement }
export const useHeadingPlugin = (options?: HeadingPluginOptions): Et.EditorPlugin => {
  options?.useActions?.(headingActions)
  return {
    name: '@effitor/plugin-heading',
    cssText,
    effector: [headingEffector, {
      onMounted(ctx) {
        if (options?.hiddenHeadingLevelMarker) {
          ctx.bodyEl.classList.add(HeadingEnum.Class_HiddenMarker)
        }
      },
    }],
    elements: [EtHeadingElement],
    register(_, setSchema) {
      setSchema({ heading: EtHeadingElement })
    },
  }
}
