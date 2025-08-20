import type { Et } from '~/core/@types'

/** 快捷键字符串, 包含修饰键和按键的信息 */
export type A_hotkey = string
/** 快捷键动作对应的键名 */
export type A_actionKey = string

export const enum HotkeyEnum {
  Connector = '_',
  LocalStorageKey = '@effitor_$hotkey-mapping',
}

/** 快捷键动作分组名 */
export interface ActionGroupMap {
  app: 'app'
  editor: 'editor'
}
type ActionGroup = keyof ActionGroupMap
export interface HotkeyAction {
  title: string
  descr: string
  group: ActionGroup
  hotkey: A_hotkey
  canCustom: boolean
  /** 当且仅当返回true，跳过后续操作 */
  run?: (ctx: Et.EditorContext) => boolean
}
