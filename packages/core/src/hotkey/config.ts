import { platform } from '../config'

/** 快捷键字符串, 包含修饰键和按键的信息 */
export type A_hotkey = string
/** 快捷键动作对应的键名 */
export type A_actionKey = string
/** 快捷键动作分组名 */
export interface ActionGroupMap {
  app: 'app'
  editor: 'editor'
  /** 系统层面的默认快捷键, 如 Mac下 cmd+backspace 删除到行首, opt+backspace 删除单词等 */
  builtin: 'builtin'
}

export type ModCode = 1 | 2 | 4 | 8
  | 3 | 5 | 6 | 9 | 10 | 12
  | 7 | 11 | 13 | 14
  | 15
/** 修饰键 */
export const enum Mod {
  Ctrl = 8,
  Shift = 4,
  AltOpt = 2,
  MetaCmd = 1,
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

/** 支持快捷键的实体键名(KeyboardEvent.code) */
export const enum Key {
  A = 'KeyA',
  B = 'KeyB',
  C = 'KeyC',
  D = 'KeyD',
  E = 'KeyE',
  F = 'KeyF',
  G = 'KeyG',
  H = 'KeyH',
  I = 'KeyI',
  J = 'KeyJ',
  K = 'KeyK',
  L = 'KeyL',
  M = 'KeyM',
  N = 'KeyN',
  O = 'KeyO',
  P = 'KeyP',
  Q = 'KeyQ',
  R = 'KeyR',
  S = 'KeyS',
  T = 'KeyT',
  U = 'KeyU',
  V = 'KeyV',
  W = 'KeyW',
  X = 'KeyX',
  Y = 'KeyY',
  Z = 'KeyZ',

  F1 = 'F1',
  F2 = 'F2',
  F3 = 'F3',
  F4 = 'F4',
  F5 = 'F5',
  F6 = 'F6',
  F7 = 'F7',
  F8 = 'F8',
  F9 = 'F9',
  F10 = 'F10',
  F11 = 'F11',
  F12 = 'F12',

  Digit0 = 'Digit0',
  Digit1 = 'Digit1',
  Digit2 = 'Digit2',
  Digit3 = 'Digit3',
  Digit4 = 'Digit4',
  Digit5 = 'Digit5',
  Digit6 = 'Digit6',
  Digit7 = 'Digit7',
  Digit8 = 'Digit8',
  Digit9 = 'Digit9',

  Escape = 'Escape',
  Backquote = 'Backquote',

  Tab = 'Tab',
  Space = 'Space',
  Enter = 'Enter',
  Backspace = 'Backspace',
  Delete = 'Delete',

  Minus = 'Minus',
  Equal = 'Equal',
  BracketLeft = 'BracketLeft',
  BracketRight = 'BracketRight',
  Backslash = 'Backslash',
  Semicolon = 'Semicolon',
  Quote = 'Quote',
  Comma = 'Comma',
  Period = 'Period',
  Slash = 'Slash',

  ArrowDown = 'ArrowDown',
  ArrowLeft = 'ArrowLeft',
  ArrowRight = 'ArrowRight',
  ArrowUp = 'ArrowUp',

  // 小键盘按键
  // NumLock = 'NumLock',
  NumpadEqual = 'NumpadEqual',
  NumpadDivide = 'NumpadDivide',
  NumpadMultiply = 'NumpadMultiply',
  NumpadSubtract = 'NumpadSubtract',
  NumpadAdd = 'NumpadAdd',
  NumpadEnter = 'NumpadEnter',
  NumpadDecimal = 'NumpadDecimal',
  Numpad0 = 'Numpad0',
  Numpad1 = 'Numpad1',
  Numpad2 = 'Numpad2',
  Numpad3 = 'Numpad3',
  Numpad4 = 'Numpad4',
  Numpad5 = 'Numpad5',
  Numpad6 = 'Numpad6',
  Numpad7 = 'Numpad7',
  Numpad8 = 'Numpad8',
  Numpad9 = 'Numpad9',

  Home = 'Home',
  End = 'End',
  PageUp = 'PageUp',
  PageDown = 'PageDown',
}

/**
 * 快捷键按键需要简化展示的按键, 通过keyboardEvent.code 提取,
 * 如将 BracketLeft 展示为 `[`, 将 ArrowLeft 展示为 `←`
 */
export const keyChars = {
  // export const keyChars: Partial<Record<KeyboardCodeEnum, string>> = {
  KeyA: 'A',
  KeyB: 'B',
  KeyC: 'C',
  KeyD: 'D',
  KeyE: 'E',
  KeyF: 'F',
  KeyG: 'G',
  KeyH: 'H',
  KeyI: 'I',
  KeyJ: 'J',
  KeyK: 'K',
  KeyL: 'L',
  KeyM: 'M',
  KeyN: 'N',
  KeyO: 'O',
  KeyP: 'P',
  KeyQ: 'Q',
  KeyR: 'R',
  KeyS: 'S',
  KeyT: 'T',
  KeyU: 'U',
  KeyV: 'V',
  KeyW: 'W',
  KeyX: 'X',
  KeyY: 'Y',
  KeyZ: 'Z',

  // 那个[倒过来的字符
  Space: '␣', // \u2423
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ':',
  Quote: '\'',
  Comma: ',',
  Period: '.',
  Slash: '/',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
} as const
