/**
 * KeyboardEvent.code;
 */
declare const enum KeyboardCodeEnum {
  KeyA = 'KeyA',
  KeyB = 'KeyB',
  KeyC = 'KeyC',
  KeyD = 'KeyD',
  KeyE = 'KeyE',
  KeyF = 'KeyF',
  KeyG = 'KeyG',
  KeyH = 'KeyH',
  KeyI = 'KeyI',
  KeyJ = 'KeyJ',
  KeyK = 'KeyK',
  KeyL = 'KeyL',
  KeyM = 'KeyM',
  KeyN = 'KeyN',
  KeyO = 'KeyO',
  KeyP = 'KeyP',
  KeyQ = 'KeyQ',
  KeyR = 'KeyR',
  KeyS = 'KeyS',
  KeyT = 'KeyT',
  KeyU = 'KeyU',
  KeyV = 'KeyV',
  KeyW = 'KeyW',
  KeyX = 'KeyX',
  KeyY = 'KeyY',
  KeyZ = 'KeyZ',

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

  ControlLeft = 'ControlLeft',
  ControlRight = 'ControlRight',
  AltLeft = 'AltLeft',
  AltRight = 'AltRight',
  ShiftLeft = 'ShiftLeft',
  ShiftRight = 'ShiftRight',
  MetaLeft = 'MetaLeft',
  MetaRight = 'MetaRight',

  ArrowDown = 'ArrowDown',
  ArrowLeft = 'ArrowLeft',
  ArrowRight = 'ArrowRight',
  ArrowUp = 'ArrowUp',

  // 小键盘按键
  NumLock = 'NumLock',
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
 * KeyboardEvent.key枚举; 小写字母使用大写字母映射
 */
declare const enum KeyboardKeyEnum {

  'A' = 'A',
  'B' = 'B',
  'C' = 'C',
  'D' = 'D',
  'E' = 'E',
  'F' = 'F',
  'G' = 'G',
  'H' = 'H',
  'I' = 'I',
  'J' = 'J',
  'K' = 'K',
  'L' = 'L',
  'M' = 'M',
  'N' = 'N',
  'O' = 'O',
  'P' = 'P',
  'Q' = 'Q',
  'R' = 'R',
  'S' = 'S',
  'T' = 'T',
  'U' = 'U',
  'V' = 'V',
  'W' = 'W',
  'X' = 'X',
  'Y' = 'Y',
  'Z' = 'Z',
  // 由于枚举不可单纯数字, 这里数字键名前添加'Num', 实际 key 值为数字
  'Num0' = '0',
  'Num1' = '1',
  'Num2' = '2',
  'Num3' = '3',
  'Num4' = '4',
  'Num5' = '5',
  'Num6' = '6',
  'Num7' = '7',
  'Num8' = '8',
  'Num9' = '9',
  'F1' = 'F1',
  'F2' = 'F2',
  'F3' = 'F3',
  'F4' = 'F4',
  'F5' = 'F5',
  'F6' = 'F6',
  'F7' = 'F7',
  'F8' = 'F8',
  'F9' = 'F9',
  'F10' = 'F10',
  'F11' = 'F11',
  'F12' = 'F12',
  'Escape' = 'Escape',
  '`' = '`',
  '~' = '~',
  '!' = '!',
  '@' = '@',
  '#' = '#',
  '$' = '$',
  '%' = '%',
  '^' = '^',
  '&' = '&',
  '*' = '*',
  '(' = '(',
  ')' = ')',
  '-' = '-',
  '_' = '_',
  '=' = '=',
  '+' = '+',
  '[' = '[',
  '{' = '{',
  ']' = ']',
  '}' = '}',
  '\\' = '\\',
  '|' = '|',
  ';' = ';',
  ':' = ':',
  '\'' = '\'',
  '"' = '"',
  ',' = ',',
  '<' = '<',
  '.' = '.',
  '>' = '>',
  '/' = '/',
  '?' = '?',
  'Space' = ' ',
  'Tab' = 'Tab',
  'Enter' = 'Enter',
  'Backspace' = 'Backspace',
  'Delete' = 'Delete',
  'ControlLeft' = 'ControlLeft',
  'ControlRight' = 'ControlRight',
  'ShiftLeft' = 'ShiftLeft',
  'ShiftRight' = 'ShiftRight',
  'AltLeft' = 'AltLeft',
  'AltRight' = 'AltRight',
  'MetaLeft' = 'MetaLeft',
  'MetaRight' = 'MetaRight',
  'ArrowUp' = 'ArrowUp',
  'ArrowDown' = 'ArrowDown',
  'ArrowLeft' = 'ArrowLeft',
  'ArrowRight' = 'ArrowRight',
  'PageUp' = 'PageUp',
  'PageDown' = 'PageDown',
  'Home' = 'Home',
  'End' = 'End',
}
/**
 * Valid `inputType` of `InputEvent`
 * `ref.` [Input Event Level 2](https://www.w3.org/TR/input-events-2/#interface-InputEvent-Attributes)
 * ```ts
 * // Chromium (Chrome 137.0.7151.120) 不支持的有 7 个, 以下 inputType 会被转为 ""
 *  "insertFromPasteAsQuotation"
 *  "deleteEntireSoftLine"
 *  "deleteContent"
 *  "formatSetInlineTextDirection"
 *  "formatBackColor"
 *  "formatFontColor"
 *  "formatFontName"
 * ```
 */
declare const enum InputTypeEnum {
  /** 未初始化 或 不是规定以内的值; 该值作为保留, 其对应真正的inputType为空串"" 仅MainInputTypeSolver可实现 */
  '' = '',
  /** 插入字符 */
  'insertText' = 'insertText',
  /** 替换字符 */
  /** 输入法插入字符 */
  'insertCompositionText' = 'insertCompositionText',
  /**
   * Safari 特有, 输入法会话中删除输入法构造串字符, 不可 preventDefault
   */
  'deleteCompositionText' = 'deleteCompositionText',
  /**
   * Safari 特有, 在输入法结束后插入输入法字符串, 可以被 preventDefault
   */
  'insertFromComposition' = 'insertFromComposition',

  /** Enter换行 */
  'insertParagraph' = 'insertParagraph',
  /** Shift+Enter换行 */
  'insertLineBreak' = 'insertLineBreak',
  /** Backspace删除 */
  'deleteContentBackward' = 'deleteContentBackward',
  /** Delete删除 */
  'deleteContentForward' = 'deleteContentForward',
  /** Ctrl+Backspace删除 */
  'deleteWordBackward' = 'deleteWordBackward',
  /** Ctrl+Delete删除 */
  'deleteWordForward' = 'deleteWordForward',
  /**
   * 删除整行（即当前屏幕中的一行）
   * chromium (Chrome 137.0.7151.120) 不支持, 会被转为""
   */
  'deleteEntireSoftLine' = 'deleteEntireSoftLine',
  /** 删除软换行（css换行）（当前光标至行开头） */
  'deleteSoftLineBackward' = 'deleteSoftLineBackward',
  /** 删除软换行（css换行）（当前光标至行末尾） */
  'deleteSoftLineForward' = 'deleteSoftLineForward',
  /** 删除硬换行（br）（当前光标至上一个br或block末尾） */
  'deleteHardLineBackward' = 'deleteHardLineBackward',
  /** 删除硬换行（br）（当前光标至下一个br或block末尾） */
  'deleteHardLineForward' = 'deleteHardLineForward',

  /**
   * 插入粘贴, 在effitor中有如下规定:
   * 0. 若Selection为Range, 需先手动发送一个deleteContentBackward的beforeinput让光标collapsed;  (checkRemoveSelectionToCollapsed)
   * 1. 粘贴文本或富文本
   * ```
   * ev.data: 要粘贴内容的html文本
   *      为安全起见，onpaste仅从clipboardData中读取text/et-html, text/plain的内容
   * ev.dataTransfer: null
   * ```
   * 2. 粘贴图片
   * ```
   * ev.data: null
   * ev.dataTransfer: 包含复制到剪切板的图片
   * ```
   */
  'insertFromPaste' = 'insertFromPaste',
  /** 剪切删除 */
  'deleteByCut' = 'deleteByCut',
  /** 拖拽删除 */
  // 'deleteByDrag' = 'deleteByDrag',
  /** 光标Ctrl+x剪切所在行 */
  /** Ctrl+z撤销 */
  'historyUndo' = 'historyUndo',
  /** Ctrl+y重做 */
  'historyRedo' = 'historyRedo',
  /** 加粗 */
  /** 斜体 */
  /** 下划线 */
  /** 删除线 */
  /** 增加缩进（仅段落 */
  'formatIndent' = 'formatIndent',
  /** 减少缩进（仅段落 */
  'formatOutdent' = 'formatOutdent',

  /* 标准草案中定义的 inputType 共三大类

    // 插入类

    insertText = "insertText",
    insertReplacementText = "insertReplacementText",
    insertCompositionText = "insertCompositionText",

    insertLineBreak = "insertLineBreak",
    insertParagraph = "insertParagraph",

    insertOrderedList = "insertOrderedList",
    insertUnorderedList = "insertUnorderedList",
    insertHorizontalRule = "insertHorizontalRule",
    insertLink = "insertLink",

    insertFromDrop = "insertFromDrop",
    insertFromPaste = "insertFromPaste",
    insertFromPasteAsQuotation = "insertFromPasteAsQuotation",
    insertFromYank = "insertFromYank",
    insertTranspose = "insertTranspose",

    // 删除类

    deleteWordBackward = "deleteWordBackward",
    deleteWordForward = "deleteWordForward",
    deleteContentBackward = "deleteContentBackward",
    deleteContentForward = "deleteContentForward",

    deleteSoftLineBackward = "deleteSoftLineBackward",
    deleteSoftLineForward = "deleteSoftLineForward",
    deleteHardLineBackward = "deleteHardLineBackward",
    deleteHardLineForward = "deleteHardLineForward",
    deleteEntireSoftLine = "deleteEntireSoftLine",

    deleteByDrag = "deleteByDrag",
    deleteByCut = "deleteByCut",
    deleteContent = "deleteContent",

    // 功能类

    historyUndo = "historyUndo",
    historyRedo = "historyRedo",

    formatBold = "formatBold",
    formatItalic = "formatItalic",
    formatUnderline = "formatUnderline",
    formatStrikeThrough = "formatStrikeThrough",
    formatSuperscript = "formatSuperscript",
    formatSubscript = "formatSubscript",

    formatIndent = "formatIndent",
    formatOutdent = "formatOutdent",
    formatJustifyFull = "formatJustifyFull",
    formatJustifyCenter = "formatJustifyCenter",
    formatJustifyRight = "formatJustifyRight",
    formatJustifyLeft = "formatJustifyLeft",
    formatSetBlockTextDirection = "formatSetBlockTextDirection",
    formatSetInlineTextDirection = "formatSetInlineTextDirection",

    formatBackColor = "formatBackColor",
    formatFontColor = "formatFontColor",
    formatFontName = "formatFontName",
    formatRemove = "formatRemove",

    */
}
