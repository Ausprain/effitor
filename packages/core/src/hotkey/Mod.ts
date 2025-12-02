import { KeyMod } from '@effitor/shared'

import { platform } from '../config'

/** 修饰键 */
export const Mod: OmitIndexSignature<{ [k in keyof typeof KeyMod]: (typeof KeyMod)[k] }> = {
  /** 无修饰键 */
  None: 0,
  // 单修饰键
  Ctrl: 1,
  Shift: 2,
  AltOpt: 4,
  MetaCmd: 8,
  // 组合修饰键
  Ctrl_Shift: KeyMod.Ctrl | KeyMod.Shift,
  Ctrl_Alt: KeyMod.Ctrl | KeyMod.AltOpt,
  Ctrl_Meta: KeyMod.Ctrl | KeyMod.MetaCmd,
  Shift_Alt: KeyMod.Shift | KeyMod.AltOpt,
  Shift_Meta: KeyMod.Shift | KeyMod.MetaCmd,
  Alt_Meta: KeyMod.AltOpt | KeyMod.MetaCmd,
  Ctrl_Shift_Alt: KeyMod.Ctrl | KeyMod.Shift | KeyMod.AltOpt,
  Ctrl_Shift_Meta: KeyMod.Ctrl | KeyMod.Shift | KeyMod.MetaCmd,
  Ctrl_Alt_Meta: KeyMod.Ctrl | KeyMod.AltOpt | KeyMod.MetaCmd,
  Shift_Alt_Meta: KeyMod.Shift | KeyMod.AltOpt | KeyMod.MetaCmd,
  Ctrl_Shift_Alt_Meta: KeyMod.Ctrl | KeyMod.Shift | KeyMod.AltOpt | KeyMod.MetaCmd,
} as const

// fixed. 重新导出 KeyMod 枚举值为另一个类型,
// 否则 error TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.
export type ModType = typeof Mod[keyof typeof Mod]

/**
 * 快捷键修饰键的展示字符
 * 如 MacOS 下将 Ctrl 展示为 `⌃`, 将 Shift 展示为 `⇧` 等
 */
export const modChar = (() => (platform.isMac
  ? {
      ctrl: '⌃',
      shift: '⇧',
      altopt: '⌥',
      metacmd: '⌘',
    } as const
  : {
      ctrl: 'Ctrl',
      shift: 'Shift',
      altopt: 'Alt',
      metacmd: platform.isWin ? 'Win' : 'Meta',
    } as const)
)()
/** 适配 Windows/MacOS 的 Ctrl/Cmd 键 */
export const CtrlCmd = platform.isMac ? KeyMod.MetaCmd : KeyMod.Ctrl
/** 适配 Windows/MacOS 的(删除)单词修饰键 (opt 或 ctrl) */
export const WordModifier = platform.isMac ? KeyMod.AltOpt : KeyMod.Ctrl
/** 适配 Windows/MacOS 的(删除)行修饰键 (opt 或 ctrl) */
export const LineModifier = platform.isMac ? KeyMod.MetaCmd : KeyMod.AltOpt
