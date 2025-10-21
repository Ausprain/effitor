<p align="center">
  <a href="./README.md">English</a> |
  <a href="./README_zh.md">中文</a>
</p>
<p align="center" style="font-style:italic"><span style="color:red;">effi</span>cient edi<span style="color:red;">tor</span></p>

# Effitor

> **Language Options: [English](./README.md) | [中文](./README_zh.md)**

effitor是一个高性能插件化的web富文本编辑器框架，取名自*efficient editor*，追求极致优雅的编辑体验。

> effitor 不支持协同编辑，至少目前不支持。

## 安装

使用npm安装

```bash
npm install effitor
```

## 使用

只支持esm

```ts
import { Effitor } from "effitor";

const host = document.getElementById("host");
const editor = new Effitor({
  plugins: [],
});
if (host) {
  editor.mount(host);
}
```

## 特性

### 功能

- 开箱即用
- 框架无关，高度可定制
- 内置撤回栈
- [ ] 内置光标历史记录（Doing）
- 内置快捷键和热字符串
- 编辑器亮/暗模式切换
- markdown互转
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

## 性能

## Demo

Insert gif or link to demo

## 文档

[Documentation](./docs/index.md)

## 感谢

## 许可

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)

[MIT](https://choosealicense.com/licenses/mit/)
