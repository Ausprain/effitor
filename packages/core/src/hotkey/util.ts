import { KeyMod } from '@effitor/shared'

import { type A_hotkey, type ActionGroupMap_, type HotkeyAction, HotkeyEnum } from './config'
import { type Key, keyChars } from './Key'
import { CtrlCmd, modChar, type ModType } from './Mod'

/**
 * 获取一个快捷键字符串\
 * 最终的快捷键通过 `{KeyName}_{ModNum}` 的形式表示, 如 `ctrl+shift+A` 为 `KeyA_12`
 * @param mod 修饰键, 通过 hotkey.Mod 枚举获取, 多个修饰符通过 | 组合
 * @param key 按键, 通过 hotkey.Key 枚举获取
 */
export const create = (key: Key, mod: ModType): A_hotkey => {
  return key + HotkeyEnum.Connector + mod
}

/**
 * 获取一个快捷键字符串，该快捷键包含平台自适应的经典修饰键：如Mac的cmd 与 Win的ctrl
 * @param key 按键, 通过 hotkey.Key 枚举获取
 * @param extraMod 额外修饰键, 通过 hotkey.Mod 枚举获取, 默认0
 */
export const withMod = (key: Key, extraMod: ModType = KeyMod.None): A_hotkey => {
  return create(key, (CtrlCmd | extraMod) as KeyMod)
}

/**
 * 根据 KeyboardEvent 生成快捷键字符串
 * @param ev 键盘事件
 * @returns 快捷键字符串
 */
export const modKey = (ev: KeyboardEvent) => {
  return ev.code + HotkeyEnum.Connector + (
    (ev.metaKey ? KeyMod.MetaCmd : 0)
    | (ev.ctrlKey ? KeyMod.Ctrl : 0)
    | (ev.altKey ? KeyMod.AltOpt : 0)
    | (ev.shiftKey ? KeyMod.Shift : 0)
  )
}

/**
 * 解析一个快捷键，返回其组成数组, 该数组至少含 2 个元素, 最后一个元素为按键名, 前面的为修饰键简写字符;\
 * 修饰键顺序固定为: `['Ctrl', 'Shift', 'Alt', 'Win']` in Windows, `['⌃', '⇧', '⌥', '⌘']` in MacOS \
 * 如"KeyA_12"(快捷键`ctrl+shift+A`), 对应为: `['Ctrl', 'Shift', 'A']` 或 `['⌃', '⇧', 'A']` \
 */
export const parseHotkey = (modKey: string) => {
  const [key, mod] = modKey.split(HotkeyEnum.Connector)
  const num = parseInt(mod as string)
  const parts = [
    (num & KeyMod.Ctrl) ? modChar.ctrl : '',
    (num & KeyMod.Shift) ? modChar.shift : '',
    (num & KeyMod.AltOpt) ? modChar.altopt : '',
    (num & KeyMod.MetaCmd) ? modChar.metacmd : '',
  ].filter(Boolean)
  parts.push(keyChars[key as keyof typeof keyChars] ?? key)
  return parts
}

/**
 * 创建一个全局快捷键操作
 * @param group 快捷键所属组别
 * @param title 标题
 * @param hotkey 将绑定的快捷键，使用hotkey函数创建
 * @param descr 快捷键操作描述, 默认空串
 * @param canCustom 是否可绑定自定义快捷键， 默认false
 * @param run 操作执行函数
 */
export const createAction = (group: keyof ActionGroupMap_, title: string, {
  hotkey = '',
  descr = '',
  canCustom = false,
  run = void 0,
}: {
  hotkey?: A_hotkey
  descr?: string
  canCustom?: boolean
  run?: HotkeyAction['run']
}): HotkeyAction => ({
  title,
  descr,
  group,
  hotkey,
  canCustom,
  run: run || (() => {
    if (import.meta.env.DEV) {
      console.warn('该快捷键无对应操作: ', title)
    }
    return false
  }),
})
