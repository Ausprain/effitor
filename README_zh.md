<p align="center">
  <a href="#"><img src="https://raw.githubusercontent.com/ausprain/effitor/main/docs/assets/title.webp" alt="Effitor - Efficient Editor"></a>
</p>
<p align="center">
  <a href="https://raw.githubusercontent.com/ausprain/effitor/main/README.md">English</a> | 
  <a href="#">中文</a>
</p>

# Effitor

Effitor 是一个拥抱现代 Web 标准、以**极致编辑体验**为目标的，高性能、插件化的 Web 富文本编辑器。它既可作为开箱即用的编辑器库使用，也可作为底层框架用于构建定制化编辑器。

> ⚠️ 注意：当前处于早期探索阶段（v0.x）
>
> - 尚未达到生产级稳定性，API 可能变动；
> - 仅支持桌面端现代浏览器（Chrome、Edge、Firefox、Safari）；
> - 不支持协同编辑（非设计目标）。

## 为什么选择 Effitor？

与其他编辑器不同，Effitor 以**编辑效率与体验**为核心目标——正如其名：_**effi**cient edi**tor**_。

它基于 `contenteditable`，通过最基础的 DOM 操作实现，并**几乎完全接管了浏览器对 `contenteditable` 的默认行为**（输入法除外），从而实现高度灵活可定制的编辑逻辑。

如果你：

- 不需要协同编辑、拼写检查、自动补全；
- 不强求严格的文档结构一致性；
- 希望以最小学习成本快速构建或定制编辑器

那么 Effitor 非常适合你。它没有复杂的抽象模型，只需熟悉基础 DOM 操作，就能快速构建属于你自己的编辑器。当然，你也可以直接使用默认配置，“开箱即用”。

此外，Effitor 的核心包 `@effitor/core` 已包含大量编辑体验优化，并将持续迭代。

### 🚀 值得关注的特性

#### 1. 更合理的样式延续（Format Continuation）

大多数编辑器像一套绘画工具：用户需手动切换画笔（开启/关闭样式：如 `Ctrl+B` 加粗）。若加粗文本位于段尾，后续输入会**自动继承样式**，必须再次按键（切换为普通画笔）才能退出——这已成为“行业惯例”，但并非好体验。比如某段文字是粗体+斜体+下划线，那么需要按：`Ctrl+B+I+U` 或另外一个清除样式的组合键来取消所有样式。

Effitor 尝试改变这一点：**切换样式的动作由编辑器完成，而非用户**。其核心思想是：用户通过快捷键或热字符串插入特殊节点，编辑器依据光标所在位置以及编辑器的配置（插件等）自动应用特定样式或执行相应行为。

- 引入“效应元素”（effect element）的概念，所有关键节点，包括样式节点（如加粗、斜体）均为“效应元素”；
- 样式“效应元素”内按下 `Tab` 键，即可跳出当前样式；
- 双击空格，可直接跳出最外层样式嵌套。
- 开发者可自定义“效应元素”及其内部的编辑行为（插件化）。

#### 2. 内置热字符串（Hotstring）

类似 AutoHotkey 的热字符串功能，但无需外部工具，且跨平台支持。

- 支持自定义热字符串规则；
- 高效匹配，即使配置上千条规则，也不影响性能；
- 完美解决 macOS 下无 AutoHotkey 替代方案的问题。

#### 3. 输入法标点半角自动转换

汉语用户在使用中文输入法编写 markdown 时，可能经常需要切换输入法或中英模式，来插入正确的 markdown 语法字符（如 `` ` ``、`[]`，而非`·`，`【】`等）。在 Windows 平台，这没有什么，但在 macOS 平台，经常切换输入法是一个极其影响编辑体验的操作。

Effitor 提供两种解决方案：

- **轻量模式**：输入全角符号后，再按一次空格，自动替换为半角（如 `·` → `` ` ``，`！` → `!`）；
- **自动模式**（可配置）：插入全角字符时，自动转为对应半角；
- 也可完全关闭此功能。

#### 4. 语言感知的光标控制能力

浏览器原生支持 `Alt + ←/→` 按“语义单词”跳转光标，但依赖系统语言。

Effitor 将此能力集成到编辑器内部：

- 可通过 API 设置编辑器语言；
- 支持 `Alt + ←/→` 跳过单词；
- 支持 `Alt + Backspace` 删除整个语义单词。

## 安装

```sh
npm install effitor
```

## 使用

仅支持 ESM：

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
  useMarkPlugin,
  useHeadingPlugin,
  useListPlugin,
  useCodePlugin,
  useLinkPlugin,
  useMediaPlugin,
  useTablePlugin,
  useBlockquotePlugin,
} from "effitor/plugins";

const host = document.getElementById("host") as HTMLDivElement | null;
const editor = new Effitor({
  assists: [
    useCounterAssist(),
    useDialogAssist(),
    useDropdownAssist(),
    useMessageAssist(),
    usePopupAssist(),
  ],
  plugins: [
    useMarkPlugin(),
    useHeadingPlugin(),
    useListPlugin(),
    useLinkPlugin(),
    useMediaPlugin(),
    await useCodePlugin(),
    useTablePlugin(),
    useBlockquotePlugin(),
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

---

## 性能

### 支持基础 markdown 的编辑器, 加载 30 万字符 HTML (无表格和代码块), 并在末段落输入 1000 个字符

| Editor  | Duration (s) | LCP (ms) | CLS | INP (ms) | INPs (ms) | Memory (MB) |
| ------- | ------------ | -------- | --- | -------- | --------- | ----------- |
| effitor | 45.6         | 499.2    | 0   | 59.2     | 110.6     | 44.4        |
| lexical | 73.4         | 281.6    | 0   | 145.6    | 120.8     | 83.2        |
| tiptap  | 52.7         | 216.8    | 0.2 | 64       | 61.3      | 20.6        |

### 支持基础 markdown 的编辑器, 加载 100 万字符 HTML (无表格和代码块), 并在末段落输入 1000 个字符

| Editor  | Duration (s) | LCP (ms) | CLS | INP (ms) | INPs (ms) | Memory (MB) |
| ------- | ------------ | -------- | --- | -------- | --------- | ----------- |
| effitor | 50.5         | 1206.4   | 0   | 80       | 149.9     | 35.2        |
| tiptap  | 62.3         | 755.2    | 0.2 | 84.8     | 92.4      | 58.2        |

> 来自 [effitor 性能测试](./examples/benchmark/)
> 测试环境：macOS: 8x[Apple M3] 16GB, nodejs: v24.3.0, playwright: 1.56.1
>
> - LCP，反映了编辑器初始化并加载对应内容的总耗时，其中 effitor 包含了加载 shiki 高亮器的时间；
> - INP，反映用户稳定输入后的响应时间，越小说明稳定输入后延迟越低；
> - INPs，INP 指标记录值总和的平均值，越小说明编辑器响应比较稳定，越大说明响应平均延迟较大，或存在某个操作导致高延迟；
> - Duration，编辑器完成所有操作的总耗时，减去 LCP 后即模拟输入 1000 个字符的耗时，越小说明编辑器响应更快，效率更高；
> - Memory，编辑器占用的内存大小，其中 effitor 包含了 shiki 高亮器（~15MB）。

## 特性一览

- ✅ 开箱即用
- ✅ 框架无关，高度可定制
- ✅ 内置撤销/重做栈
- 🔄 内置光标/选区历史记录（开发中）
- ✅ 内置快捷键与热字符串
- ✅ 亮/暗主题切换
- ✅ 部分 Markdown、原生 HTML 互转
- ✅ 内置助手（assistants）
  - ✅ `assist-counter`：字数统计
  - ✅ `assist-dialog`：对话框
  - ✅ `assist-dropdown`：下拉菜单
  - ✅ `assist-message`：消息提示
  - ✅ `assist-popup`：弹窗与悬浮工具
- ✅ 内置插件（plugins）
  - ✅ `plugin-heading`：标题
  - ✅ `plugin-mark`：高亮（加粗、斜体、删除线等）
  - ✅ `plugin-link`：链接
  - ✅ `plugin-list`：有序/无序/项目列表
  - ✅ `plugin-media`：媒体（图片/音频/视频）
  - ✅ `plugin-code`：代码块（支持 HTML、LaTeX 渲染）
  - ✅ `plugin-table`：表格
  - ✅ `plugin-blockquote`：引用块（段落组｜分栏）
- 其他助手或插件
  - 🔄 `assist-ai`：AI 助手（开发中）
  - 📐 `plugin-math`：数学公式（规划中）
  - 🎨 `plugin-excalidraw`：excalidraw 白板（开发中）

## 设计理念

- **无抽象数据模型**：直接操作 DOM，降低学习成本；
- **深度接管 `contenteditable`**：除输入法与剪贴板外，所有行为均由 Effitor 控制；
- **基于 Web 标准**：遵循 [`Input Events Level 2`](https://www.w3.org/TR/input-events-2/)、[`Selection API`](https://www.w3.org/TR/selection-api/)、[`Range`](https://www.w3.org/TR/DOM-Level-2-Traversal-Range/ranges.html) 等规范。

## 局限性

- **不支持协同编辑**：因无中间数据模型，协同实现难度极大（但本就非设计目标）；
- **浏览器兼容性差异**：尽管已处理绝大多数边界情况，个别细微行为可能因浏览器而异；
- **无障碍（a11y）支持待完善**：大量使用自定义元素，ARIA 支持仍在建设中。

## 最后的话

Effitor 仍处于探索阶段，部分 API 可能随时调整。例如，我们最初基于 Shadow DOM 构建 Effitor，但实践中发现：**当前 Shadow DOM 在富文本编辑场景中仍存在诸多兼容性与交互问题**，最终不得不放弃该方案。

我们计划在 **v0.3.0** 完成最后一次重大重构，并补充完整测试，推动 Effitor 走向成熟稳定。

## 文档

[中文文档](./docs/index_zh.md)

## 许可证

[MIT](https://choosealicense.com/licenses/mit/)
