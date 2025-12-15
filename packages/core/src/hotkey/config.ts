import type { EditorAction } from '../editor'

/** 快捷键字符串, 包含修饰键和按键的信息 */
export type A_hotkey = string
/** 快捷键动作对应的键名 */
export type A_actionKey = string

export const enum HotkeyEnum {
  // Connector = '_',
  LocalStorageKey = '@effitor_$hotkey-mapping',
}

/** 快捷键动作分组名 */
export interface ActionGroupMap_ {
  app: 'app'
  editor: 'editor'
}

export interface HotkeyAction {
  title: string
  descr: string
  group: keyof ActionGroupMap_
  hotkey: A_hotkey
  canCustom: boolean
  run?: EditorAction
}
