import type { Et } from '@effitor/core'

import { getPopupEffector } from './effector'
import cssText from './index.css?raw'
import { Popup, type PopupAssistOptions } from './popup'

declare module '@effitor/core' {
  interface EditorAssists {
    popup: Popup
  }
}

export type { HoverPopupOptions, PopupContent, PopupItem, PopupItemFilter, PopupRender } from './config'
export type { Popup } from './popup'

export const usePopupAssist = (options?: PopupAssistOptions): Et.EditorPlugin => {
  return {
    name: '@effitor/assist-popup',
    cssText,
    effector: getPopupEffector(options),
  }
}
