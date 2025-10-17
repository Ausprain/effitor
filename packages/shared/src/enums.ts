/* eslint-disable @typescript-eslint/prefer-literal-enum-member */
/** 内置配置 */
export const enum BuiltinConfig {
  BUILTIN_UNDO_PLUGIN_NAME = '__et_plugin_$undo',
  /** 内置Effect前缀, 便于effectBlocker过滤 */
  BUILTIN_EFFECT_PREFFIX = 'E',
  /**
   * 编辑器内部元素 css 类名前缀\
   * 效应元素使用 add/removeCssClass 方法添加/删除类名自动添加此前缀
   */
  EDITOR_CSS_CLASS_PREFIX = 'ET_cls-',
  /** 一个粘贴效应名, 定义在这里, 而不是效应列表中, 目的是隐藏内部粘贴行为入口 */
  INSERT_FROM_ET_HTML = 'InsertFromEtHtml',
  /** 编辑器主题属性名 */
  THEME_ATTR = 'et-theme',
  /** 编辑器默认内置主题 */
  DEFAULT_THEME = 'default',
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
  HintTitle = 'hint-title',
}
/** css类名 */
export const enum CssClassEnum {
  Et = 'et',
  Effitor = 'effitor',
  /** 当前活跃, 对于效应元素而言, 在 focusinCallback 中添加, 在 focusoutCallback 中移除 */
  Active = 'active',
  /** 当前元素被选择 */
  Selected = 'selected',
  /** display: none; */
  Hidden = 'hidden',

  /** 当前被拖拽目标 */
  Dragging = 'dragging',
  /** 当前拖拽悬浮 */
  Dragover = 'dragover',

  /** 用于et-body 选区为Range, 需通过ctx.range.collpased==false判断, Selection.isCollapsed在shadowRoot内不准 */
  SelectionRange = 'selection-range',
  /** 段落类节点 */
  ParagraphLike = 'etp',
  /** 表示光标在该效应元素内部, 且光标所在节点与该效应元素之间无其他效应元素; 在 ctx.update 更新效应元素时添加/移除 */
  CaretIn = 'caret-in',

  /** 卡片样式 */
  Card = 'et-card',
  /** 灰度背景按钮, 具有hover/active/selected状态灰度背景色交互 */
  BgItem = 'bg-item',
  /** 主题背景按钮, 具有hover/active/selected状态主题背景色交互 */
  ThemeItem = 'theme-item',
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
}
export type EtType = Omit<typeof EtTypeEnum, 'CaretOut'>
