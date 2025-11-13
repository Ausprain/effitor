import type { Et } from '@effitor/core'

import type { DropdownOptions, DropdownTrigger } from './config'
import { Dropdown } from './dropdown'
import { getDropdownEffector } from './effector'
import cssText from './index.css?raw'

declare module '@effitor/core' {
  interface EditorAssists {
    dropdown: Dropdown
  }
}

export interface DropdownAssistOptions extends DropdownOptions, DropdownTrigger {}
export type {
  DropdownCallbacks,
  DropdownContent,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuItemOptions,
  DropdownMenuOptions,
} from './config'
export type { Dropdown } from './dropdown'

const defaultOptions = {
  triggerKey: '/',
  triggerMod: true,
  maxWidth: 188,
  maxHeight: 256,
} as const

export const useDropdownAssist = (options?: DropdownAssistOptions): Et.EditorPluginSupportInline => {
  options = {
    ...defaultOptions,
    ...options,
  }
  return {
    name: '@effitor/assist-dropdown',
    cssText,
    effector: getDropdownEffector(options as Required<DropdownAssistOptions>),
  }
}
