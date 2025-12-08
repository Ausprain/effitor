/* eslint-disable @typescript-eslint/prefer-literal-enum-member */
/** 内置配置 */
export const enum BuiltinConfig {
  BUILTIN_UNDO_PLUGIN_NAME = '__et_plugin_$undo',
  /** 内置Effect前缀, 便于effectBlocker过滤 */
  BUILTIN_EFFECT_PREFFIX = 'E',
  /** 一个粘贴效应名, 定义在这里, 而不是效应列表中, 目的是隐藏内部粘贴行为入口 */
  INSERT_FROM_ET_HTML = 'InsertFromEtHtml',
  /** 编辑器主题属性名 */
  THEME_ATTR = 'et-theme',
  /** 编辑器默认内置主题 */
  // DEFAULT_THEME = 'default',
}
/** 内置自定义元素名 */
export const enum BuiltinElName {
  ET_EDITOR = 'et-editor',
  ET_BODY = 'et-body',
  // ET_BODY_UPPER = 'ET-BODY',
  ET_RICHTEXT = 'et-r',
  ET_HEADING = 'et-h',
  ET_PARAGRAPH = 'et-p',
  // ET_PARAGRAPH_UPPER = 'ET-P',
  ET_BLOCKQUOTE = 'et-bq',
  ET_COMPONENT = 'et-comp',
  ET_EMBEDMENT = 'et-embed',
  ET_LIST = 'et-list',
  ET_LISTITEM = 'et-li',
  ET_TABLE = 'et-table',
}
/** mime类型枚举 */
export const enum MIMETypeEnum {
  /** effitor复制元信息, 以json字符串存储 */
  ET_COPY_METADATA = 'application/Et.copy.metadata',
  ET_TEXT_HTML = 'text/et-html',
  TEXT_PLAIN = 'text/plain',
  TEXT_HTML = 'text/html',
}
/** html字符 */
export const enum HtmlCharEnum {
  ZERO_WIDTH_SPACE = '\u200B',
  NBSP = '\u00A0',
  MOCK_LINE_BREAK = '\n\u200B',
}
/** html元素自定义属性名 */
export const enum HtmlAttrEnum {
  Popup_Key = 'popup-key',
  PlaceHolder = 'et-placeholder',
  /** 悬浮提示词 */
  EtTitle = 'et-title',
}
/** css类名 */
export const enum CssClassEnum {
  Et = 'et',
  Effitor = 'effitor',
  /** 段落类节点 */
  ParagraphLike = 'etp',

  /** 暗模式, 用在et-editor上 */
  DarkMode = 'Et--dark',
  /** 表示光标在该效应元素内部, 且光标所在节点与该效应元素之间无其他效应元素; 在 ctx.update 更新效应元素时添加/移除 */
  CaretIn = 'Et--caret-in',
  /** 当前活跃, 对于效应元素而言, 在 focusinCallback 中添加, 在 focusoutCallback 中移除 */
  Active = 'Et--active',
  /** 当前元素被选择 */
  Selected = 'Et--selected',
  /** display: none; */
  Hidden = 'Et--hidden',

  /** 当前被拖拽目标 */
  Dragging = 'Et--dragging',
  /** 当前拖拽悬浮 */
  Dragover = 'Et--dragover',

  /** 用于et-body 选区为Range是添加此 css 类 */
  SelectionRange = 'Et--selection-range',
  /** 用于et-body 全选文档添加此 css 类 */
  SelectionAll = 'Et--selection-all',
  /** 用于节点, 表明当前选区正好覆盖该节点 */
  SelectionNode = 'Et--selection-node',

  /** 卡片样式 */
  Card = 'Et__card',
  /** 灰度背景按钮, 具有hover/active/selected状态灰度背景色交互 */
  BgItem = 'Et__bg-item',
  /** 主题背景按钮, 具有hover/active/selected状态主题背景色交互 */
  ThemeItem = 'Et__theme-item',
  /** 添加此类的元素在亮暗模式切换时，其背景色/文本颜色/边框颜色将拥有过渡效果 */
  TransitionColorScheme = 'Et__trans-cs',
}

/**
 * 预设效应类型枚举; 含混合效应
 */
export const enum EtTypeEnum {
  /** 此效应只可应用于inEtType */
  PlainText = 1 << 0,
  /** 内联富文本节点 */
  RichText = 1 << 1,
  /** 是否为块元素, 效应元素默认是内联的 */
  Block = 1 << 2,
  /** 段落, 段落是block的 */
  Paragraph = 1 << 3,
  /** 引用块(段落组), 是block的, 其子元素只能是段落 */
  Blockquote = 1 << 4,
  /** 标题, 只能是et-body的子节点, heading是block的, 也属于段落 */
  Heading = 1 << 5,
  /** 含嵌套contenteditable的才算组件, component是block的, 同时也属于段落 */
  Component = 1 << 6,
  /** 整体不可编辑的才算embed, embed不一定是block的, 但一定不是段落 */
  Embedment = 1 << 7,
  /** 含此效应的效应元素在创建时会设置contenteditable=false */
  Uneditable = 1 << 8,
  /** 允许内容为空, 如`<td></td>` */
  AllowEmpty = 1 << 9,
  // List = 1 << 9,
  // ListItem = 1 << 10,
  // Table = 1 << 11,

  /**
   * 光标跳出效应, 含此效应的效应元素内有如下两个默认行为: \
   * `按下Tab`, 让光标跳出当前效应元素; \
   * `双击空格`, 让光标跳出最外层含此效应的元素; \
   * 若当前效应元素后边没有内容, 则会依据当前效应元素是否为块节点, 而自动插入段落或#text节点
   */
  CaretOut = EtTypeEnum.RichText | EtTypeEnum.Component,
  /**
   * 不参与连带删除\
   * 删除内容时，会判断其父节点是否为空，为空则连带删除；拥有此联合类型中其中一个类型的效应元素，
   * 不参与连带删除。
   */
  NotJointDeletion = EtTypeEnum.Paragraph | EtTypeEnum.AllowEmpty,
}
export type EtType = Omit<typeof EtTypeEnum, 'CaretOut' | 'NotJointDeletion'>

/** 支持快捷键的实体键名(KeyboardEvent.code) */
export const enum KeyEnum {
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
/** 修饰键 */
export const enum KeyMod {
  /** 无修饰键 */
  None = 0,
  // 单修饰键
  Ctrl = 1,
  Shift = 2,
  AltOpt = 4,
  MetaCmd = 8,
  // 组合修饰键
  Ctrl_Shift = KeyMod.Ctrl | KeyMod.Shift,
  Ctrl_Alt = KeyMod.Ctrl | KeyMod.AltOpt,
  Ctrl_Meta = KeyMod.Ctrl | KeyMod.MetaCmd,
  Shift_Alt = KeyMod.Shift | KeyMod.AltOpt,
  Shift_Meta = KeyMod.Shift | KeyMod.MetaCmd,
  Alt_Meta = KeyMod.AltOpt | KeyMod.MetaCmd,
  Ctrl_Shift_Alt = KeyMod.Ctrl | KeyMod.Shift | KeyMod.AltOpt,
  Ctrl_Shift_Meta = KeyMod.Ctrl | KeyMod.Shift | KeyMod.MetaCmd,
  Ctrl_Alt_Meta = KeyMod.Ctrl | KeyMod.AltOpt | KeyMod.MetaCmd,
  Shift_Alt_Meta = KeyMod.Shift | KeyMod.AltOpt | KeyMod.MetaCmd,
  Ctrl_Shift_Alt_Meta = KeyMod.Ctrl | KeyMod.Shift | KeyMod.AltOpt | KeyMod.MetaCmd,
}
