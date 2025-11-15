<svg width="100%" height="50" viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="textGradient" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#9921e7">
        <animate 
          attributeName="stop-color" 
          values="#9921e7; #6671e7; #9921e7;"
          keyTimes="0; 0.5; 1"
          dur="2s" 
          repeatCount="indefinite" />
      </stop>
      <stop offset="100%" stop-color="#6671e7">
        <animate 
          attributeName="stop-color" 
          values="#6671e7; #9921e7; #6671e7;" 
          keyTimes="0; 0.5; 1"
          dur="2s" 
          repeatCount="indefinite" />
      </stop>
    </linearGradient>
  </defs>
  <text x="50%" y="88%" text-anchor="middle" font-size="36" font-style="italic"><tspan fill="url(#textGradient)">effi</tspan><tspan fill="currentColor" font-size="33">cient edi</tspan><tspan fill="url(#textGradient)">tor</tspan></text>
</svg>
<!-- <p style="margin-bottom:0;text-align:center;font-style:italic;font-size:2.2em;"><span style="background: linear-gradient(79deg, #9921e7 0%, #6671e7 25%, #9921e7 50%, #6671e7 75%, #9921e7 100%);background-clip: text;text-shadow: none;padding:0 8px;animation: gradient-animation 2s ease-in-out infinite;"><span style="color: transparent;">effi</span>cient edi<span style="color: transparent;">tor</span><span></p> -->
<p style="margin-bottom:2em;text-align:center;">
  <a href="./README.md">English</a> | 
  <a href="./README_zh.md">中文</a>
</p>

# Effitor

effitor是一个高性能插件化的web富文本编辑器框架（或库），取名自*efficient editor*，拥抱最新标准和技术，追求极致优雅的编辑体验。

> ⚠️ effitor 是一种尝试，它不是一个十分稳定的编辑器，尚有许多已知或未知的问题待解决和完善。目前仅适配桌面端现代浏览器（chrome，edge，firefox，safari），且不支持协同编辑。

## Why Effitor

与其他编辑器不同，effitor 是一个以编辑效率和体验优先的富文本编辑器，正如它名字的由来：_efficient editor_。它基于`contenteditable`，使用最基础的 DOM 操作实现，并几乎接管了浏览器对 contenteditable 的所有默认行为（输入法除外），以实现编辑操作的高度定制化。

如果你不需要拼写检查、自动补全等功能，也不需要特别严谨的文档结构，只是希望能以自己喜欢的编辑方式惬意地记录一些内容，那么 effitor 很适合你。因为它很简单，没有抽象的结构，你只需要熟悉基础的 DOM 操作，就可以很容易地通过 effitor 构建独属于你自己的编辑器。或者，你满意 effitor 的默认配置，可以直接“开箱即用”。

此外，在 effitor 的核心`@effitor/core`中，我们做了很多优化编辑体验的工作，而且这些优化将持续进行。

### 优秀的性能

effitor 基于`contenteditable`实现，但能拥有基于`textarea`实现（如 CodeMirror）的编辑性能。

| 编辑器      | 编辑 20 万字符 | 编辑 50 万字符 |
| ----------- | -------------- | -------------- |
| effitor     | 无卡顿         | 无卡顿         |
| CodeMirror  | 卡顿           | 卡顿           |
| ProseMirror | 无卡顿         | 无卡顿         |

> ps.
> ~~各浏览器对输入法行为的实现不一，chrome的输入法表现较差，编辑器内容超过 20 万字符时，输入法输入就会明显卡顿，几乎没有任何一个web编辑器能够幸免。从`blink`的源码中我们可以知道，chrome在处理输入法输入时，需要从根可编辑元素开始计算，所以随着内容的增加，输入法输入的性能必然下降。
> 为此，effitor 计划实现一个“动态可编辑”策略，当用户使用输入法输入时，动态地将可编辑元素设置为当前光标位置的最小元素节点。不过编辑 20 万字符内容的情况很少见，这个需求不是很紧迫，于是我们尚未着手实现此策略~~

### 样式延续的问题（Format Continuation）

大多数富文本编辑器的实现，像是一套摆放整齐的画笔，用户需要经常在不同画笔间切换。比如加粗，用户需要先按下`ctrl+b`，然后输入加粗文本，在用户完成加粗文本后，需要再次按下`ctrl+b`，才能取消加粗。同时，如果某段加粗（或其他高亮）文本在段落的末尾，那么用户在段落末尾继续编辑时，就会产生样式连带的问题——即继续输入的文本自然连带当前光标位置的样式。除非手动按一次 `ctrl+b`，如果是加粗斜体，还要额外按一次 `ctrl+i`。这似乎已经成了某种“潜在的规范”，几乎每一个编辑器都是这样的，但这并不是一个好的编辑体验。这也是我们喜欢 `Typora` 即时渲染的原因，它能自动为我们标注富文本的边界。

effitor 尝试解决这个问题，我们不希望用户频繁更换画笔，而是在意图做什么时编辑器即刻响应，即切换画笔的动作由编辑器完成，而不是用户。它有效应元素的概念，并且提供两个快捷键让光标跳出效应元素。加粗等样式节点也是效应元素，我们只需按下 Tab 键，就可以跳出当前样式节点。双击空格，则可直接跳出最外层样式节点。

### 内置热字符串

热字符串（hotstring）类似热键（hotkey），当按顺序输入了热字符串时，可以替换为指定文本或执行某些动作。
Windows 下，我们可以通过 [AutoHotkey](https://www.autohotkey.com/) 来实现热字符串。它确实很好用，但需要一定编程基础，而且表现不稳定，有时无法识别，有时自动改变输入法状态，更重要的是，不支持 macOS。虽然 macOS 下有 Hammerspoon，但用它来实现热字符串，确实不太好用。

effitor 内置了热字符串功能，你可以通过配置来定义自己的热字符串。而且热字符串的匹配是高效的，基本不影响性能，哪怕配置上千个热字符串，也不影响编辑体验。

### 输入法标点符号的自动半角化

我相信非英语母语开发者肯定遇到过这样的情况：在开启中文输入法编写 markdown 时，我想要高亮一个内行代码，于是我按下`` ` ``键，可得到的却是`·`。我们需要频繁切换中英键盘，或输入法，才能得到我们想要的输入。而 MacBook 的输入法切换，却又是那样的令人恼火。

或者，你需要捣鼓一下输入法的设置，最终可能也找不到合适的解决方案。在Windows 下，我们可以借助 [AutoHotkey](https://www.autohotkey.com/) 的`T*`模式的`hotstring`功能来实现（但这有一定概率产生副作用）。

但在 effitor，我们提供了一个更优雅的解决方案，当你按下\`键时却输入了`·`时，你只需要再按一下空格，即可将`·`替换为\`。
类似的还有其他字符，如`【`转为`[`，`！`转为`!`等，只需要追加一个空格就可以完成。
而如果你不喜欢多按一下空格，也可以通过配置，让编辑器插入全角字符时自动替换为对应的半角字符，或完全关闭这项功能。

### 适应语言的光标跳跃控制

编辑文档时，我们可能经常使用 alt+左/右方向键来切换光标位置以跳过一个单词，但通常只能识别半角标点符号，且无法判断非拉丁语言的单词边界。浏览器底层帮我们实现了，即会根据当前浏览器语言来判断单词边界。而 effitor 将这一功能集成到了编辑器里，你可以在编辑器内设置指定语言，然后就可以在编辑器中畅快地跳过一个单词了。

### 一些我们认为好的体验

- 系统级光标选区控制能力
  - cmd/ctrl+↑/↓ 光标跳到文档开头/末尾
  - cmd/alt+←/→ 光标跳到行首/行尾
  - opt/ctrl+←/→ 光标跳过一个单词
  - 以上+shift 则变为扩展选区，而非移动光标
- OneNote 的逐级全选
- VS Code 的部分“编辑习惯”
  - ctrl/cmd+x 剪切当前行
  - alt/opt+↑/↓ 移动行（段落）

## 安装

使用npm安装

```shell
npm install effitor
```

## 快速开始

只支持esm

```ts
import { Effitor } from "effitor";
import {
  useCounterAssist,
  useDialogAssist,
  useDropdownAssist,
  useMessageAssist,
  usePopupAssist,
} from "effitor/assists";
import {
  useHeadingPlugin,
  useMarkPlugin,
  useListPlugin,
  useLinkPlugin,
  useCodePlugin,
} from "effitor/plugins";

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
  - 表格
  - [ ] 数学公式（//TODO
  - [ ] excalidraw（//Doing

### 特点

- 无抽象数据模型，编辑操作采用直接操作DOM方式进行交互
- 基于`contenteditable`，但接管浏览器所有行为（除输入法输入和剪切板行为）
- 基于最新web标准，如：[`Input Events Level 2`](https://www.w3.org/TR/input-events-2/)，[`Selection API`](https://www.w3.org/TR/selection-api/)，[`Range`](https://www.w3.org/TR/DOM-Level-2-Traversal-Range/ranges.html)等

### 局限

由于没有抽象的数据模型，以及其直接操作DOM的底层实现，effitor几乎无法实现协同编辑，至少难度很大。但effitor的初衷并不包含协同编辑，它只是一个探索优雅的编辑体验的过程中意外实现高性能的富文本编辑器框架。

同时，effitor通过web标准api直接实现，而浏览器对web标准的实现存在差异，尽管effitor已经考虑并解决绝大多数的边界情况，但不排除个别未考虑到的细微差异，这些差异可能使得编辑器的表现不稳定。

此外，effitor大量使用自定义元素，在可访问性和无障碍方面有待完善。

## 文档

[Documentation](./docs/index_zh.md)

## 感谢

## 许可

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)

### sdf

sad sad asd sda
aafjioew
