import type { Et } from '@effitor/core'

import type { DropdownTrigger } from './config'
import { Dropdown } from './dropdown'
import { getDropdownEffector } from './effector'
import cssText from './index.css?raw'

declare module '@effitor/core' {
  interface EditorAssists {
    dropdown: Dropdown
  }
}

export interface DropdownAssistOptions extends DropdownTrigger {}
export type {
  DropdownCallbacks,
  DropdownContent,
  DropdownContentRender,
  DropdownFilter,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuItemOptions,
  DropdownMenuOptions,
} from './config'
export type { Dropdown } from './dropdown'

const defaultOptions: DropdownTrigger = {
  triggerKey: '/',
  triggerMod: true,
}

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
