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
  CtrlShift = Mod.Ctrl | Mod.Shift,
  CtrlAlt = Mod.Ctrl | Mod.AltOpt,
  CtrlMeta = Mod.Ctrl | Mod.MetaCmd,
  ShiftAlt = Mod.Shift | Mod.AltOpt,
  ShiftMeta = Mod.Shift | Mod.MetaCmd,
  AltMeta = Mod.AltOpt | Mod.MetaCmd,
  CtrlShiftAlt = Mod.Ctrl | Mod.Shift | Mod.AltOpt,
  CtrlShiftMeta = Mod.Ctrl | Mod.Shift | Mod.MetaCmd,
  CtrlAltMeta = Mod.Ctrl | Mod.AltOpt | Mod.MetaCmd,
  ShiftAltMeta = Mod.Shift | Mod.AltOpt | Mod.MetaCmd,
  CtrlShiftAltMeta = Mod.Ctrl | Mod.Shift | Mod.AltOpt | Mod.MetaCmd,
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
/** 适配 Windows/MacOS 的删除单词修饰键 (opt 或 ctrl) */
export const WordModifier = platform.isMac ? Mod.AltOpt : Mod.Ctrl
