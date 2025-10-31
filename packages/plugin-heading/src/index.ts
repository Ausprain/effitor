import type { Et } from '@effitor/core'

import { HeadingEnum } from './config'
import { headingEffector } from './effector'
import { EtHeadingElement } from './EtHeadingElement'
import cssText from './index.css?raw'

interface headingOptions {
  /**
   * 是否隐藏标题前的`#1`标记符
   */
  hiddenHeadingLevelMarker?: boolean
}

export { EtHeadingElement }
export const useHeadingPlugin = (options?: headingOptions): Et.EditorPluginSupportInline => {
  return {
    name: '@effitor/plugin-heading',
    cssText,
    effector: [headingEffector, {
      inline: true,
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
