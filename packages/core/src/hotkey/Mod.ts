/* eslint-disable @typescript-eslint/prefer-literal-enum-member */

import { platform } from '../config'

/** 修饰键 */
export const enum Mod {
  /** 无修饰键 */
  None = 0,
  // 单修饰键
  Ctrl = 8,
  Shift = 4,
  AltOpt = 2,
  MetaCmd = 1,
  // 组合修饰键
  Ctrl_Shift = Mod.Ctrl | Mod.Shift,
  Ctrl_Alt = Mod.Ctrl | Mod.AltOpt,
  Ctrl_Meta = Mod.Ctrl | Mod.MetaCmd,
  Shift_Alt = Mod.Shift | Mod.AltOpt,
  Shift_Meta = Mod.Shift | Mod.MetaCmd,
  Alt_Meta = Mod.AltOpt | Mod.MetaCmd,
  Ctrl_Shift_Alt = Mod.Ctrl | Mod.Shift | Mod.AltOpt,
  Ctrl_Shift_Meta = Mod.Ctrl | Mod.Shift | Mod.MetaCmd,
  Ctrl_Alt_Meta = Mod.Ctrl | Mod.AltOpt | Mod.MetaCmd,
  Shift_Alt_Meta = Mod.Shift | Mod.AltOpt | Mod.MetaCmd,
  Ctrl_Shift_Alt_Meta = Mod.Ctrl | Mod.Shift | Mod.AltOpt | Mod.MetaCmd,
}
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
      metacmd: 'Win',
    } as const)
)()
/** 适配 Windows/MacOS 的 Ctrl/Cmd 键 */
export const CtrlCmd = platform.isMac ? Mod.MetaCmd : Mod.Ctrl
/** 适配 Windows/MacOS 的(删除)单词修饰键 (opt 或 ctrl) */
export const WordModifier = platform.isMac ? Mod.AltOpt : Mod.Ctrl
/** 适配 Windows/MacOS 的(删除)行修饰键 (opt 或 ctrl) */
export const LineModifier = platform.isMac ? Mod.MetaCmd : Mod.AltOpt
