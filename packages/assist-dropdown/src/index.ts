import type { Et } from '@effitor/core'

import { defaultOptions, Dropdown, type DropdownOptions } from './dropdown'
import { getDropdownEffector } from './effector'
import cssText from './index.css?raw'

declare module '@effitor/core' {
  interface EditorAssists {
    dropdown: Dropdown
  }
}

export const useDropdownAssist = (options?: DropdownOptions): Et.EditorPluginSupportInline => {
  options = {
    ...defaultOptions,
    ...options,
  }
  return {
    name: '@effitor/dropdown',
    cssText,
    effector: getDropdownEffector(options as Required<DropdownOptions>),
  }
}
