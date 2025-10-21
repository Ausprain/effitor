import type { Et } from '@effitor/core'

import { getPopupEffector } from './effector'
import cssText from './index.css?raw'
import { Popup, type PopupAssistOptions } from './popup'

export type { HoverPopupOptions, PopupContent, PopupItem, PopupItemFilter, PopupRender } from './config'

declare module '@effitor/core' {
  interface EditorAssists {
    popup: Popup
  }
}

export const usePopupAssist = (options?: PopupAssistOptions): Et.EditorPluginSupportInline => {
  return {
    name: '@effitor/assist-popup',
    cssText,
    effector: getPopupEffector(options),
  }
}
