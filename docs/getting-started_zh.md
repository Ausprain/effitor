# 快速开始

欢迎使用 Effitor - 一个现代化、高性能的富文本编辑器。本指南将帮助您快速上手 Effitor，了解其基本使用方法和核心功能。

## 1. 安装

### 1.1 使用 npm

```bash
npm install @effitor/core
```

### 1.2 使用 yarn

```bash
yarn add @effitor/core
```

### 1.3 使用 pnpm

```bash
pnpm add @effitor/core
```

## 2. 基本使用

### 2.1 创建编辑器实例

```typescript
import { Effitor } from "@effitor/core";

// 创建编辑器实例
const editor = new Effitor();
```

### 2.2 挂载编辑器

```typescript
// 获取挂载点
const container = document.getElementById("editor-container");

// 挂载编辑器
editor.mount(container);
```

### 2.3 卸载编辑器

```typescript
// 卸载编辑器
editor.unmount();
```

### 2.4 设置初始内容

```typescript
// 使用 HTML 设置初始内容
editor.fromHTML("<p>Hello, Effitor!</p>");

// 或使用 Markdown 设置初始内容
editor.fromMarkdown("# Hello, Effitor!\n\nThis is a **rich text** editor.");
```

### 2.5 获取编辑器内容

```typescript
// 获取 HTML 内容
const htmlContent = editor.toHTML();

// 获取 Markdown 内容
const mdContent = editor.toMarkdown();
```

## 3. 编辑器配置

Effitor 提供了丰富的配置选项，您可以根据需求进行自定义：

```typescript
const editor = new Effitor({
  // 是否启用 Shadow DOM
  shadow: false,

  // 主题
  theme: "default",

  // 编辑器配置
  config: {
    // 是否自动创建第一个段落
    AUTO_CREATE_FIRST_PARAGRAPH: true,

    // 是否使用宿主元素作为滚动容器
    USE_HOST_AS_SCROLL_CONTAINER: false,

    // 自定义 CSS 样式
    customStyleText: ".et-p { margin: 10px 0; }",
  },

  // 回调函数
  callbacks: {
    // 编辑器焦点变化时触发
    onFocus: () => console.log("Editor focused"),

    // 编辑器失焦时触发
    onBlur: () => console.log("Editor blurred"),

    // 编辑器内容变化时触发
    onContentChange: () => console.log("Content changed"),
  },
});
```

## 4. 插件使用

Effitor 采用插件化设计，核心功能通过插件实现。您可以根据需要选择安装和使用插件：

### 4.1 安装插件

```bash
npm install @effitor/plugin-mark @effitor/plugin-heading @effitor/plugin-list
```

### 4.2 使用插件

```typescript
import { Effitor } from "@effitor/core";
import { useMark } from "@effitor/plugin-mark";
import { useHeading } from "@effitor/plugin-heading";
import { useList } from "@effitor/plugin-list";

const editor = new Effitor({
  plugins: [useMark(), useHeading(), useList()],
});
```

## 5. 基本编辑操作

### 5.1 插入文本

```typescript
// 直接输入文本即可插入
// 或使用 API 插入
editor.context.commonHandler.insertText("Hello, Effitor!");
```

### 5.2 格式化文本

```typescript
// 加粗选中文本
editor.context.commonHandler.formatBold();

// 斜体选中文本
editor.context.commonHandler.formatItalic();

// 删除线选中文本
editor.context.commonHandler.formatStrike();
```

### 5.3 插入段落

```typescript
// 按 Enter 键插入新段落
// 或使用 API 插入
editor.context.commonHandler.insertParagraph();
```

### 5.4 删除内容

```typescript
// 按 Backspace 或 Delete 键删除内容
// 或使用 API 删除
editor.context.commonHandler.deleteContent();
```

## 6. 选区操作

### 6.1 获取当前选区

```typescript
const selection = editor.context.selection;
const currentRange = selection.range;
```

### 6.2 设置选区

```typescript
// 设置光标位置到特定元素
const paragraph = editor.bodyEl.querySelector("et-p");
editor.context.setSelection(paragraph.innerStartEditingBoundary());

// 设置选中文本范围
const startBoundary = paragraph.innerStartEditingBoundary();
const endBoundary = paragraph.innerEndEditingBoundary();
editor.context.setSelection(startBoundary, endBoundary);
```

### 6.3 保存和恢复选区

```typescript
// 保存当前选区
editor.context.selection.save();

// 恢复保存的选区
editor.context.selection.restore();
```

## 7. 命令系统

### 7.1 执行命令

```typescript
// 执行撤销命令
editor.context.commandManager.undoTransaction();

// 执行重做命令
editor.context.commandManager.redoTransaction();
```

### 7.2 自定义命令

```typescript
import { cmd } from "@effitor/core";

// 创建自定义命令
const customCommand = cmd.functional({
  execCallback(ctx) {
    // 执行命令逻辑
    console.log("Command executed");
  },
  undoCallback(ctx) {
    // 撤销命令逻辑
    console.log("Command undone");
  },
});

// 执行自定义命令
editor.context.commandManager.push(customCommand);
editor.context.commandManager.handle();
editor.context.commandManager.commit();
```

## 8. 事件处理

### 8.1 监听编辑器事件

```typescript
// 监听键盘事件
editor.context.effector.keydown = (ev, ctx) => {
  console.log("Key pressed:", ev.key);
};

// 监听输入事件
editor.context.effector.input = (ev, ctx) => {
  console.log("Input event:", ev.inputType);
};
```

## 9. 主题定制

### 9.1 自定义 CSS 样式

```typescript
const editor = new Effitor({
  customStyleText: `
    .et-editor {
      font-family: Arial, sans-serif;
      font-size: 16px;
      line-height: 1.6;
    }
    
    .et-p {
      margin: 10px 0;
    }
    
    .et-h1 {
      font-size: 2em;
      font-weight: bold;
      margin: 0.67em 0;
    }
    
    /* 深色主题 */
    .dark .et-editor {
      color: #fff;
      background-color: #333;
    }
  `,
});
```

### 9.2 动态切换主题

```typescript
// 切换到深色主题
editor.setColorScheme(true);

// 切换到浅色主题
editor.setColorScheme(false);
```

## 10. 最佳实践

### 10.1 性能优化

- 避免频繁的 DOM 操作，尽量使用编辑器 API
- 合理使用插件，只加载必要的插件
- 对于大型文档，考虑分页加载或虚拟滚动
- 避免在编辑过程中执行复杂的计算

### 10.2 安全性

- 对用户输入进行适当的 sanitization
- 避免直接执行用户提供的代码
- 使用安全的内容过滤机制

### 10.3 可访问性

- 确保编辑器支持键盘导航
- 提供适当的 ARIA 属性
- 确保颜色对比度符合标准
- 支持屏幕阅读器

## 11. 故障排除

### 11.1 编辑器无法挂载

- 检查挂载点是否存在
- 检查挂载点是否为 HTMLDivElement
- 检查编辑器是否已被挂载

### 11.2 插件不工作

- 检查插件是否正确安装
- 检查插件是否正确注册
- 检查插件之间是否存在冲突

### 11.3 性能问题

- 检查是否加载了过多插件
- 检查是否存在内存泄漏
- 检查是否有频繁的重排/重绘

## 12. 下一步

- 深入了解 [核心概念](./core-concepts_zh.md)
- 学习 [插件开发](./plugin-development_zh.md)
- 查看 [API 文档](./api_zh.md)
- 探索 [示例代码](https://github.com/Ausprain/effitor/tree/main/examples)

## 13. 社区与支持

- [GitHub 仓库](https://github.com/Ausprain/effitor)
- [Issue 跟踪](https://github.com/Ausprain/effitor/issues)
- [讨论区](https://github.com/Ausprain/effitor/discussions)
- [贡献指南](https://github.com/Ausprain/effitor/blob/main/CONTRIBUTING.md)

祝您使用 Effitor 愉快！
