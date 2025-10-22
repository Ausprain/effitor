<p align="center">
  <a href="./README.md">English</a> |
  <a href="./README_zh.md">中文</a>
</p>
<p align="center" style="font-style:italic"><span style="color:red;">effi</span>cient edi<span style="color:red;">tor</span></p>

# Effitor

> **语言选择：[English](./README.md) | [中文](./README_zh.md)**

effitor是一个高性能插件化的web富文本编辑器框架，取名自*efficient editor*，追求极致优雅的编辑体验。

> ⚠️ 目前 effitor 只是一个桌面端的框架，仅适配主流浏览器（chrome，edge，firefox，safari），且不支持协同编辑。

## Why Effitor

这是完全主观的感受，但确实现在市面上的富文本编辑器都千篇一律，有的追求功能多，有的追求性能好，有的追求简单易用。而effitor 追求的是编辑体验。我们做了很多优化编辑体验的工作，而且这些优化将长期持续。

> 诚然，这些问题在 AI 面前都不是问题，但我们想为那些在 AI 浪潮下依然喜欢手写一些东西的人们，再做点东西。

### 将编辑还给键盘

我们认为，文本编辑器，绝大多数情况是不需要鼠标参与的。文本编辑原本是键盘的权利，直到富文本的出现。每当需要插入一些特殊的元素（比如图片、链接、代码块等）时，我们都需要将双手（至少右手）从键盘上移开，去使用鼠标，我们认为这不是一个好的编辑体验。这也是我们喜欢 markdown 的原因。

effitor 尝试将所有富文本编辑的权利都还给键盘，用户在`所见即所得`的同时，只需要使用键盘就可以完成所有编辑操作。

### 烦人的样式连带

有一些富文本编辑器的实现，像是一套摆放整齐的画笔，用户需要经常在不同画笔间切换。比如加粗，用户需要先按下`ctrl+b`，然后输入加粗文本，在用户完成加粗文本后，需要再次按下`ctrl+b`，才能取消加粗。这显然也不是一个好的编辑体验。同时，如果某段加粗（或其他高亮）文本在段落的末尾，那么用户在段落末尾继续编辑时，就会产生样式连带的问题——即继续输入的文本自然连带当前光标位置的样式。除非手动按一次 `ctrl+b`，如果是加粗斜体，还要额外按一次 `ctrl+i`。这也是我们喜欢 `Typora` 即时渲染的原因，它能自动为我们标注样式的边界。

effitor 也尝试解决这个问题。它有效应元素的概念，并且提供一套快捷键让光标跳出效应元素。样式节点也是效应元素，我们只需按下 Tab 键，就可以跳出当前样式节点。双击空格，则可直接跳出最外层样式节点。

### 内置热字符串

热字符串（hotstring）类似热键（hotkey），当按顺序输入了热字符串时，可以替换为指定文本或执行某些动作。
Windows 下，我们可以通过 [AutoHotkey](https://www.autohotkey.com/) 来实现热字符串。它确实很好用，但需要一定编程基础，而且表现不稳定，有时无法识别，有时自动改变输入法状态，更重要的是，不支持 macOS。虽然 macOS 下有 Hammerspoon，但用它来实现热字符串，确实不太好用。

effitor 内置了热字符串功能，你可以通过配置来定义自己的热字符串。而且热字符串的匹配是高效的，基本不影响性能，哪怕配置上千个热字符串，也不影响编辑体验。

### 输入法标题符号的自动半角化

我相信大多数开发者在开启中文输入法编写 markdown 时都会遇到这样的问题。我想要高亮一个内行代码，于是我按下\`键，可得到的却是`·`。我们需要频繁切换中英键盘，或输入法，才能得到我们想要的输入。而 MacBook 的输入法切换，却又是那样的令人恼火。

或者，你需要捣鼓一下输入法的设置，最终可能也找不到合适的解决方案。在Windows 下，我们可以借助 [AutoHotkey](https://www.autohotkey.com/) `T*`模式的`hotstring`功能来实现。

但在 effitor，我们提供了一个更优雅的解决方案，当你按下\`键时却输入了`·`时，你只需要再按一下空格，即可将`·`替换为\`。
类似的还有其他字符，如`【`转为`[`，`！`转为`!`等，只需要追加一个空格就可以完成。
而如果你不喜欢多按一下空格，也可以通过配置，让编辑器插入全角字符时自动替换为对应的半角字符，或完全关闭这项功能。

## 安装

使用npm安装

```bash
npm install effitor
```

## 快速开始

只支持esm

```ts
import {
  Effitor,
  useCounterAssist,
  useDialogAssist,
  useDropdownAssist,
  useMessageAssist,
  usePopupAssist,
  useHeadingPlugin,
  useMarkPlugin,
  useListPlugin,
  useLinkPlugin,
  useCodePlugin,
} from "effitor";

const host = document.getElementById("host") as HTMLDivElement | null;
const editor = new Effitor({
  plugins: [
    useCounterAssist(),
    useDialogAssist(),
    useDropdownAssist(),
    useMessageAssist(),
    usePopupAssist(),
    useHeadingPlugin(),
    useMarkPlugin(),
    useListPlugin(),
    useLinkPlugin(),
    await useCodePlugin(),
  ],
});
if (host) {
  editor.mount(host);
}
```

## Demo

```bash
git clone https://github.com/effitor/effitor.git
cd effitor
bun install
cd example/playground
bun dev
```

## 性能

## 特性

- 开箱即用
- 框架无关，高度可定制
- 内置撤回栈
- [ ] 内置光标历史记录（Doing）
- 内置快捷键和热字符串
- 编辑器亮/暗模式切换
- 部分markdown互转
- 内置助手
  - 字数统计（assist-counter）
  - 对话框（assist-dialog）
  - 下拉菜单（assist-dropdown）
  - 消息（assist-message）
  - 弹窗和悬浮工具（aassist-popup）
- 内置插件
  - 标题（plugin-heading）
  - 高亮（plugin-mark）
  - 链接（plugin-link）
  - 列表（plugin-list）
  - 媒体（图片/音/视频）（plugin-media）
  - 代码块（plugin-code）
  - [ ] 表格（//TODO
  - [ ] 数学公式（//TODO
  - [ ] excalidraw（//Doing

### 特点

- 无抽象数据模型，编辑操作采用直接操作DOM方式进行交互
- 基于`contenteditable`，但接管浏览器所有行为（除输入法输入和剪切板行为）
- 对齐w3c最新标准，包括但不限于：[`Input Events Level 2`](https://www.w3.org/TR/input-events-2/)，[`Selection API`](https://www.w3.org/TR/selection-api/)，[`Range`](https://www.w3.org/TR/DOM-Level-2-Traversal-Range/ranges.html)

### 局限

由于没有抽象的数据模型，以及其直接操作DOM的底层实现，effitor几乎无法实现协同编辑，至少难度很大。但effitor的初衷并不包含协同编辑，它只是一个探索优雅的编辑体验的过程中意外实现高性能的富文本编辑器框架。

此外，effitor通过web标准api直接实现，而浏览器对web标准的实现存在差异，尽管effitor已经考虑并解决绝大多数的边界情况，但不排除个别未考虑到的细微差异，这些差异可能使得编辑器的表现不稳定。

## 文档

[Documentation](./docs/index_zh.md)

## 感谢

## 许可

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
