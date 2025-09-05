/**
 * KeyboardEvent.code;
 */
export const enum KeyboardCodeEnum {
  /** Windows 下使用 AutoHotKey 热字符串功能自动替换时, .code 可能为空字符串 */
  '' = '',

  'KeyA' = 'KeyA',
  'KeyB' = 'KeyB',
  'KeyC' = 'KeyC',
  'KeyD' = 'KeyD',
  'KeyE' = 'KeyE',
  'KeyF' = 'KeyF',
  'KeyG' = 'KeyG',
  'KeyH' = 'KeyH',
  'KeyI' = 'KeyI',
  'KeyJ' = 'KeyJ',
  'KeyK' = 'KeyK',
  'KeyL' = 'KeyL',
  'KeyM' = 'KeyM',
  'KeyN' = 'KeyN',
  'KeyO' = 'KeyO',
  'KeyP' = 'KeyP',
  'KeyQ' = 'KeyQ',
  'KeyR' = 'KeyR',
  'KeyS' = 'KeyS',
  'KeyT' = 'KeyT',
  'KeyU' = 'KeyU',
  'KeyV' = 'KeyV',
  'KeyW' = 'KeyW',
  'KeyX' = 'KeyX',
  'KeyY' = 'KeyY',
  'KeyZ' = 'KeyZ',

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

  'Digit0' = 'Digit0',
  'Digit1' = 'Digit1',
  'Digit2' = 'Digit2',
  'Digit3' = 'Digit3',
  'Digit4' = 'Digit4',
  'Digit5' = 'Digit5',
  'Digit6' = 'Digit6',
  'Digit7' = 'Digit7',
  'Digit8' = 'Digit8',
  'Digit9' = 'Digit9',

  'Escape' = 'Escape',
  'Backquote' = 'Backquote',

  'Tab' = 'Tab',
  'Space' = 'Space',
  'Enter' = 'Enter',
  'Backspace' = 'Backspace',
  'Delete' = 'Delete',

  'Minus' = 'Minus',
  'Equal' = 'Equal',
  'BracketLeft' = 'BracketLeft',
  'BracketRight' = 'BracketRight',
  'Backslash' = 'Backslash',
  'Semicolon' = 'Semicolon',
  'Quote' = 'Quote',
  'Comma' = 'Comma',
  'Period' = 'Period',
  'Slash' = 'Slash',

  'ControlLeft' = 'ControlLeft',
  'ControlRight' = 'ControlRight',
  'AltLeft' = 'AltLeft',
  'AltRight' = 'AltRight',
  'ShiftLeft' = 'ShiftLeft',
  'ShiftRight' = 'ShiftRight',
  'MetaLeft' = 'MetaLeft',
  'MetaRight' = 'MetaRight',

  'ArrowDown' = 'ArrowDown',
  'ArrowLeft' = 'ArrowLeft',
  'ArrowRight' = 'ArrowRight',
  'ArrowUp' = 'ArrowUp',

  // 小键盘按键
  'NumLock' = 'NumLock',
  'NumpadEqual' = 'NumpadEqual',
  'NumpadDivide' = 'NumpadDivide',
  'NumpadMultiply' = 'NumpadMultiply',
  'NumpadSubtract' = 'NumpadSubtract',
  'NumpadAdd' = 'NumpadAdd',
  'NumpadEnter' = 'NumpadEnter',
  'NumpadDecimal' = 'NumpadDecimal',
  'Numpad0' = 'Numpad0',
  'Numpad1' = 'Numpad1',
  'Numpad2' = 'Numpad2',
  'Numpad3' = 'Numpad3',
  'Numpad4' = 'Numpad4',
  'Numpad5' = 'Numpad5',
  'Numpad6' = 'Numpad6',
  'Numpad7' = 'Numpad7',
  'Numpad8' = 'Numpad8',
  'Numpad9' = 'Numpad9',

  'Home' = 'Home',
  'End' = 'End',
  'PageUp' = 'PageUp',
  'PageDown' = 'PageDown',
}
/**
 * KeyboardEvent.key枚举; 小写字母使用大写字母映射
 */
export const enum KeyboardKeyEnum {
  /** Windows 下 Chrome 在开启输入法, keydown 按下可输入字符.key为 Process */
  'Process' = 'Process',
  /** Windows 下使用 AutoHotKey 热字符串功能自动替换时, .key 可能为 Undefined */
  'Unidentified' = 'Unidentified',

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
export const enum InputTypeEnum {
  /**
   * 未初始化 或 不是规定以内的值;
   * 该值作为保留, 其对应真正的inputType为空串"" 仅`MainInputTypeSolver`可实现;
   * 用于实现那些不在标准里, 或浏览器不支持的 inputType; 做法是:
   * 将 inputType 设置为空串, 将需要设置的 inputType 值存储在 ev.data 中; 当`MainInputTypeSolver`
   * 检测到一个空的 inputType 时, 会从 ev.data 中获取 inputType 值, 并激活相应的inputType效应处理器
   */
  '' = '',

  /** 除输入法相关的, 标准草案中定义的 inputType 共三大类 */

  /* -------------------------------------------------------------------------- */
  /*                                  输入法相关                                  */
  /* -------------------------------------------------------------------------- */

  /** (标准) 输入法插入字符, 无法 preventDefault */
  'insertCompositionText' = 'insertCompositionText',
  /**
   * (非标准) Safari 特有, 输入法会话中删除输入法构造串字符, 无法 preventDefault
   */
  'deleteCompositionText' = 'deleteCompositionText',
  /**
   * (非标准) Safari 特有, 在输入法结束后插入输入法字符串, 可以被 preventDefault
   */
  'insertFromComposition' = 'insertFromComposition',

  /* -------------------------------------------------------------------------- */
  /*                                    插入类                                   */
  /* -------------------------------------------------------------------------- */

  /** 插入字符 */
  'insertText' = 'insertText',
  /** 替换字符, 一般用于拼写检查自动替换 */
  'insertReplacementText' = 'insertReplacementText',

  /** 插入段落: Enter换行 */
  'insertParagraph' = 'insertParagraph',
  /** 插入换行(硬换行): Shift+Enter换行 */
  'insertLineBreak' = 'insertLineBreak',

  // /** 插入有序列表 */
  // 'insertOrderedList' = 'insertOrderedList',
  // /** 插入无序列表 */
  // 'insertUnorderedList' = 'insertUnorderedList',
  // /** 插入水平分割线 */
  // 'insertHorizontalRule' = 'insertHorizontalRule',
  // /** 插入链接 */
  // 'insertLink' = 'insertLink',

  // /** 从拖拽中插入; issue: ShadowDOM 内无法识别插入位置 (Chromium 120) */
  // 'insertFromDrop' = 'insertFromDrop',
  /** 插入粘贴 */
  'insertFromPaste' = 'insertFromPaste',
  // /** 仅 Firefox 实现 */
  // 'insertFromPasteAsQuotation' = 'insertFromPasteAsQuotation',
  // /** 从编辑器内部复制剪贴板(yank)粘贴 */
  // 'insertFromYank' = 'insertFromYank',
  // /** 未知 */
  // 'insertTranspose' = 'insertTranspose',

  /* -------------------------------------------------------------------------- */
  /*                                    删除类                                   */
  /* -------------------------------------------------------------------------- */

  /** 拖拽删除 */
  'deleteByDrag' = 'deleteByDrag',
  /** 剪切删除 */
  'deleteByCut' = 'deleteByCut',

  /** 删除内容; Chrome 137 不支持 */
  'deleteContent' = 'deleteContent',
  /** Backspace删除 */
  'deleteContentBackward' = 'deleteContentBackward',
  /** Delete删除 */
  'deleteContentForward' = 'deleteContentForward',
  /** Win: Ctrl+Backspace; Mac: Option+Backspace */
  'deleteWordBackward' = 'deleteWordBackward',
  /** Win: Ctrl+Delete; Mac: Option+Delete */
  'deleteWordForward' = 'deleteWordForward',

  /**
   * 删除整行（即当前屏幕中的一行; 可用于实现 `ctrl/cmd + x`剪切光标所在行
   * chromium (Chrome 137.0.7151.120) 不支持, 会被转为""
   */
  'deleteEntireSoftLine' = 'deleteEntireSoftLine',
  /** 删除硬换行（br）（当前光标至上一个br或block末尾） */
  'deleteHardLineBackward' = 'deleteHardLineBackward',
  /** 删除硬换行（br）（当前光标至下一个br或block末尾） */
  'deleteHardLineForward' = 'deleteHardLineForward',
  /** 删除软换行（css换行）（当前光标至行开头） */
  'deleteSoftLineBackward' = 'deleteSoftLineBackward',
  /** 删除软换行（css换行）（当前光标至行末尾） */
  'deleteSoftLineForward' = 'deleteSoftLineForward',

  /* -------------------------------------------------------------------------- */
  /*                                    功能类                                   */
  /* -------------------------------------------------------------------------- */

  /** Ctrl+z撤销 */
  'historyUndo' = 'historyUndo',
  /** Ctrl+y重做 */
  'historyRedo' = 'historyRedo',

  // /** 加粗 */
  // 'formatBold' = 'formatBold',
  // /** 斜体 */
  // 'formatItalic' = 'formatItalic',
  // /** 下划线 */
  // 'formatUnderline' = 'formatUnderline',
  // /** 删除线 */
  // 'formatStrikeThrough' = 'formatStrikeThrough',
  // /** 上标 */
  // 'formatSuperscript' = 'formatSuperscript',
  // /** 下标 */
  // 'formatSubscript' = 'formatSubscript',

  // /** 缩进 */
  // 'formatIndent' = 'formatIndent',
  // /** 取消缩进 */
  // 'formatOutdent' = 'formatOutdent',
  // /** 全对齐 */
  // 'formatJustifyFull' = 'formatJustifyFull',
  // /** 居中对齐 */
  // 'formatJustifyCenter' = 'formatJustifyCenter',
  // /** 右对齐 */
  // 'formatJustifyRight' = 'formatJustifyRight',
  // /** 左对齐 */
  // 'formatJustifyLeft' = 'formatJustifyLeft',
  // /** 设置块级文本方向 */
  // 'formatSetBlockTextDirection' = 'formatSetBlockTextDirection',
  // /** 设置行内文本方向 */
  // 'formatSetInlineTextDirection' = 'formatSetInlineTextDirection',

  // /** 背景颜色 */
  // 'formatBackColor' = 'formatBackColor',
  // /** 字体颜色 */
  // 'formatFontColor' = 'formatFontColor',
  // /** 字体名称 */
  // 'formatFontName' = 'formatFontName',
  // /** 移除格式 */
  // 'formatRemove' = 'formatRemove',
}
