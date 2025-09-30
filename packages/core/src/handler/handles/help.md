# InputType效应

## Declaration

````ts
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
declare const enum InputTypeEffectDeclaration {
  // Safari 有两个独有的输入法相关的 inputType
  deleteCompositionText = "deleteCompositionText",
  insertFromComposition = "insertFromComposition",

  // 标准草案中定义的 inputType 共三大类
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

  deleteByDrag = "deleteByDrag",
  deleteByCut = "deleteByCut",
  deleteContent = "deleteContent",

  deleteWordBackward = "deleteWordBackward",
  deleteWordForward = "deleteWordForward",
  deleteContentBackward = "deleteContentBackward",
  deleteContentForward = "deleteContentForward",

  deleteSoftLineBackward = "deleteSoftLineBackward",
  deleteSoftLineForward = "deleteSoftLineForward",
  deleteHardLineBackward = "deleteHardLineBackward",
  deleteHardLineForward = "deleteHardLineForward",
  deleteEntireSoftLine = "deleteEntireSoftLine",

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
}
````

## Todo

### 输入法类

```ts
/** 输入法插入字符, 无法 preventDefault */
- [x] insertCompositionText
/**
 * Safari 特有, 输入法会话中删除输入法构造串字符, 无法 preventDefault
 */
- [x] deleteCompositionText
/**
 * Safari 特有, 在输入法结束后插入输入法字符串, 可以被 preventDefault
 */
- [x] insertFromComposition
```

### 插入类

#### Overview

```ts
/** 插入字符 */
- [x] insertText
/** 替换字符, 一般用于拼写检查自动替换 */
- [ ] insertReplacementText
/** 插入段落: Enter换行 */
- [x] insertParagraph
/** 插入换行(硬换行): Shift+Enter换行 */
- [x] insertLineBreak
/** 插入有序列表 */
- [ ] insertOrderedList
/** 插入无序列表 */
- [ ] insertUnorderedList
/** 插入水平分割线 */
- [ ] insertHorizontalRule
/** 插入链接 */
- [ ] insertLink
/** 从拖拽中插入; issue: ShadowDOM 内无法识别插入位置 (Chromium 120) */
- [ ] insertFromDrop
/** 插入粘贴 */
- [x] insertFromPaste
/** 仅 Firefox 支持 */
- [ ] insertFromPasteAsQuotation
/** 从编辑器内部复制剪贴板(yank)粘贴 */
- [ ] insertFromYank
/** 未知 */
- [ ] insertTranspose
```

#### insertText

#### insertReplacementText

#### insertParagraph

#### insertLineBreak

#### insertOrderedList

#### insertUnorderedList

#### insertHorizontalRule

#### insertLink

#### insertFromDrop

#### insertFromPaste

插入粘贴, 若`Selection`类型为`'Range'`, 先删除选区让光标`collapsed`

1.  编辑器内部复制粘贴
    复制为 html 纯文本, 以 `text/et-html` 类型存入 clipboardData 中,
    由于是自定义类型, 只在当前浏览器内有效

    TODO: 考虑封装 navigator.clipboard 方法, 然后维护一个内部剪切板(yank), 识别到
    编辑器内部复制粘贴时, 触发 `insertFromYank` 从 yank 中粘贴; 这样就不用在 keydown
    事件中专门放行`复制/剪切/粘贴`的快捷键行为, 可以拦截所有keydown 默认行为了.

    难点在于, 如何判断是否是编辑器内部复制粘贴;

    方案 1: 从编辑器复制时, 写入clipboard 的`text/html`内容中写入一个头信息,
    如`<!-- et-html -->` 或 `<meta name="et-html">`, 粘贴时判断是否包含该头信息;
    若包含, 则说明是编辑器内部复制粘贴, 从 yank 中粘贴;
    若不包含, 则说明是普通粘贴, 从 navigator.clipboard.read 内容粘贴, 并清理 yank
    记录;

    ps. yank 还可以方便的实现类似 vscode的多选区复制/粘贴

2.  粘贴文本或富文本, 或从 markdown粘贴(快捷键支持)

    > 由`@effitor/core`实现, 从 ev.dataTransfer 中提取 `text/plain`或`text/html`进行粘贴

3.  粘贴文件(图片/音视频/文档)
    > 由插件在`Effector.pasteCallback`中实现

```ts
ev.data: null
ev.dataTransfer: 包含复制到剪切板的文件
```

#### insertFromPasteAsQuotation

#### insertFromYank

#### insertTranspose

### 删除类

#### Overview

```ts
/** 拖拽删除 */
- [ ] deleteByDrag
/** 剪切删除 */
- [x] deleteByCut
/** 删除内容; Chrome 137 不支持 */
- [x] deleteContent
/** Backspace删除 */
- [x] deleteContentBackward
/** Delete删除 */
- [x] deleteContentForward
/** Win: Ctrl+Backspace; Mac: Option+Backspace */
- [x] deleteWordBackward
/** Win: Ctrl+Delete; Mac: Option+Delete */
- [x] deleteWordForward
/**
 * 删除整行（即当前屏幕中的一行; 可用于实现 `ctrl/cmd + x`剪切光标所在行
 * chromium (Chrome 137.0.7151.120) 不支持, 会被转为""
 */
- [x] deleteEntireSoftLine
/** 删除硬换行（br）（当前光标至上一个br或block末尾） */
- [ ] deleteHardLineBackward
/** 删除硬换行（br）（当前光标至下一个br或block末尾） */
- [ ] deleteHardLineForward
/** 删除软换行（css换行）（当前光标至行开头） */
- [x] deleteSoftLineBackward
/** 删除软换行（css换行）（当前光标至行末尾） */
- [x] deleteSoftLineForward
```

#### deleteByDrag

#### deleteByCut

#### deleteContent

#### deleteContentBackward

#### deleteContentForward

#### deleteWordBackward

#### deleteWordForward

#### deleteEntireSoftLine

#### deleteSoftLineBackward

#### deleteSoftLineForward

#### deleteHardLineBackward

#### deleteHardLineForward

### 功能类

#### Overview

```ts
/** Ctrl+z撤销 */
- [x] historyUndo
/** Ctrl+y重做 */
- [x] historyRedo

/** 加粗 */
- [ ] formatBold
/** 斜体 */
- [ ] formatItalic
/** 下划线 */
- [ ] formatUnderline
/** 删除线 */
- [ ] formatStrikeThrough
/** 上标 */
- [ ] formatSuperscript
/** 下标 */
- [ ] formatSubscript

/** 缩进 */
- [ ] formatIndent
/** 取消缩进 */
- [ ] formatOutdent
/** 全对齐 */
- [ ] formatJustifyFull
/** 居中对齐 */
- [ ] formatJustifyCenter
/** 右对齐 */
- [ ] formatJustifyRight
/** 左对齐 */
- [ ] formatJustifyLeft
/** 设置块级文本方向 */
- [ ] formatSetBlockTextDirection
/** 设置行内文本方向 */
- [ ] formatSetInlineTextDirection

/** 背景颜色 */
- [ ] formatBackColor
/** 字体颜色 */
- [ ] formatFontColor
/** 字体名称 */
- [ ] formatFontName
/** 移除格式 */
- [ ] formatRemove
```
