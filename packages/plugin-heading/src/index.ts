import type { Et } from '@effitor/core'

import { headingEffector } from './effector'
import { EtHeadingElement } from './EtHeadingElement'
import cssText from './index.css?raw'

export { EtHeadingElement }

export const useHeadingPlugin = (): Et.EditorPluginSupportInline => {
  return {
    name: '@effitor/plugin-heading',
    cssText,
    effector: headingEffector,
    elements: [EtHeadingElement],
    register(_, setSchema) {
      setSchema({ heading: EtHeadingElement })
    },
  }
}
