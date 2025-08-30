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
- [ ] insertParagraph
/** 插入换行(硬换行): Shift+Enter换行 */
- [ ] insertLineBreak
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
- [ ] insertFromPaste
/** 仅 Firefox 实现 */
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

插入粘贴, 若`Selection`类型为`'Range'`,
需先手动发送一个`deleteContentBackward`的`beforeinput`让光标`collapsed`

1. 粘贴文本或富文本

```ts
ev.data: 要粘贴内容的html文本
    为安全起见，onpaste仅从clipboardData中读取text/et-html, text/plain的内容
ev.dataTransfer: null
```

2. 粘贴图片

```ts
ev.data: null
ev.dataTransfer: 包含复制到剪切板的图片
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
- [ ] historyUndo
/** Ctrl+y重做 */
- [ ] historyRedo

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
