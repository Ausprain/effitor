# 核心概念

## 1. 设计背景

在富文本编辑场景中，用户的每个编辑动作都要求编辑器即时响应，否则将严重影响体验。而实现即时响应最直接的方式是操作 DOM，但这必须满足一个关键前提：**避免在短时间内触发大量导致浏览器重排/重绘的 DOM 操作**。

由于编辑操作本身要求“低延迟”，我们无法通过防抖、节流或批量延迟更新等通用优化手段来规避“短时间”这一约束。因此，优化的关键在于减少每次操作所涉及的 **DOM 更新量**。

为实现这一目标，`Effitor` 引入了`效应元素（EffectElement）` 的概念。每个`效应元素`，都是一个 [自定义元素（CustomElement）](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)。所有关键节点均由 `效应元素` 构成，其内部封装了数据状态与更新逻辑。用户的所有编辑行为，都由效应元素决定如何处理，这些行为统称为`效应（Effect）`。

当用户操作发生时，由 `效应器（Effector）` 解析并`激活（invoke)`对应的 `效应`，再由挂载在 `效应元素` 上的 `效应处理器（EffectHandler）` 处理这些`效应`（执行具体的 DOM 操作）。这种设计确保了每次编辑仅触发**局部、精确、最小化**的 DOM 更新，从而在保证响应速度的同时，维持优异的运行时性能。

![基本架构](./assets/editflow.png)

## 2. 核心概念详解

### 2.1 效应器（Effector）

效应器是编辑器内部一系列 DOM 事件回调函数的集合，负责处理用户行为，并激活对应的效应。

**工作原理**：

- 编辑器内部有多个插件效应器以及一个主效应器
- 对于每一个注册的 DOM 事件，先执行插件效应器对应的回调函数
- 当且仅当插件效应器返回 `true` 时，终止后续插件执行
- 可通过编辑器上下文设置跳过主效应器的执行（类似 `Event.preventDefault`）
- 对于键盘事件和输入事件，回调函数会根据按键类型或输入类型整合为一个 `Solver`

**示例**：

```typescript
const effector: Et.Effector = {
  keydownSolver: {
    Tab: (ev, ctx) => {
      /** 处理 Tab 键按下事件 */
    },
    Enter: (ev, ctx) => {
      /** 处理回车键按下事件 */
    },
    // ...
  },
  beforeInputSolver: {
    insertText: (ev, ctx) => {
      /** 处理插入文本 */
    },
    insertParagraph: (ev, ctx) => {
      /** 处理插入段落 */
    },
    // ...
  },
  copyCallback: (ev, ctx) => {
    /** 处理 copy 事件 */
  },
  selChangeCallback: (ev, ctx) => {
    /** 处理 selectionchange 事件 */
  },
  // ...
  onMounted: () => {
    /** 在编辑器挂载后执行 */
  },
  onBeforeUnmount: () => {
    /** 在编辑器卸载前执行 */
  },
  // ...
};
```

### 2.2 效应元素（EffectElement）

效应元素通过自定义元素（[CustomElement](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)）实现。效应元素基类是 `EffectElement`，继承该类的自定义元素，即为效应元素。

**核心特性**：

- 每个效应元素都有唯一的 `etCode` 标识
- 元素内部封装了状态和更新逻辑
- 支持继承和扩展
- 自动处理 DOM 事件委托
- 提供统一的 API 接口

**示例**：

```typescript
// 内部符号定义
const ETCODE = Symbol("ETCODE");
const IN_ETCODE = Symbol("IN_ETCODE");
const NOT_IN_ETCODE = Symbol("NOT_IN_ETCODE");

// 效应元素基类
abstract class EffectElement extends HTMLElement {
  static abstract readonly elName: string;

  static readonly etType = 0;
  static inEtType = 0;
  static notInEtType = 0;

  readonly [ETCODE]: number;
  readonly [IN_ETCODE]: number;
  readonly [NOT_IN_ETCODE]: number;

  get etCode() {
    return this[ETCODE];
  }
}

// 具体效应元素实现
class EtParagraphElement extends EffectElement {
  static readonly elName = "et-p";
}
```

### 2.3 效应处理器（EffectHandler）

效应处理器由一系列效应处理函数组成。效应处理器的属性名即 `效应`，属性值即 `效应处理函数`。

**声明效应**：

```typescript
// augment.ts
import type { Et } from "@effitor/core";

type EffectAPayload = { data: string };
declare module "@effitor/core" {
  interface EffectHandleDeclaration {
    // 注意：效应处理函数的参数列表是固定的，
    // 额外声明的效应处理函数，可通过重载`payload`的类型来指定接收的参数类型,
    // 如果该效应不需要 payload, 可省略或声明为`void`类型.
    effectA: (this: Et.EffectHandleThis, ctx: Et.EditorContext, payload: EffectAPayload) => boolean;
    // 或直接通过工具函数来声明
    effectB: Et.EffectHandle<void>;
  }
}
export {};
```

**实现效应处理函数**：

```typescript
// handler.ts
export const handler: Et.EffectHandler = {
  effectA(ctx, { data }) => {
    // 处理效应A
    // 也可通过this调用其他效应
    this.effectB?.(ctx)
  }
}
```

**激活效应**：

```typescript
// 激活当前光标所在效应元素的效应A
ctx.effectInvoker.invoke(ctx.focusEtElement, "effectA", ctx, { data: "hello" });
```

**挂载效应处理器**：

效应处理器想要生效，必须挂载到指定效应元素上。若挂载到效应元素基类 `EffectElement` 上，则对应的效应及效应处理函数对所有效应元素都有效（除非被覆盖）。

```typescript
import { EffectElement } from "@effitor/core";
import { handler } from "./handler";

const usePlugin = () => {
  return {
    // ...
    register(ctxMeta, setSchema, extendEtElement) {
      extendEtElement(EffectElement, handler, []);
    },
  };
};
```

### 2.4 上下文（Context）

上下文包括 `编辑器上下文（EditorContext）` 和 `插件上下文（PluginContext）`。

#### 2.4.1 编辑器上下文

编辑器上下文是编辑器的核心，编辑器的行为由编辑器上下文上的各个模块进行处理。

**核心模块**：

- `selection`：选区模块
- `composition`：输入法模块
- `pctx`：插件上下文
- `assists`：助手（插件）模块
- `effectInvoker`：效应激活器
- `commandManager`：命令管理器

#### 2.4.2 插件上下文

插件上下文 `pctx` 是一个挂在 `编辑器上下文` 上的对象，通常情况下，插件将自身的配置信息或工具绑定在 `pctx` 上，使得插件能够在编辑器各个生命周期阶段通过 `ctx.pctx` 访问到想要的信息。

```typescript
export interface EditorPluginContext {
  [k: string]: any;
}
interface EditorContext {
  pctx: EditorPluginContext;
}
```

> [!NOTE]
> `pctx` 在每个编辑器上下文 `ctx` 实例上都有一份。
> 插件上下文仅在插件被注册时创建到指定编辑器上下文 `ctx` 实例中。

### 2.5 命令系统

命令系统是 Effitor 的底层，它赋予了编辑器直接操作 DOM 和撤回已执行的操作的能力。由于 Effitor 没有抽象的数据模型，一切文档数据和操作都基于 DOM 进行，直接的 DOM 操作很容易破坏文档结构。为此，Effitor 的命令基于严格的配置，只有正确配置的命令，才具备安全的撤回能力。

**基础命令**：

Effitor 的命令系统有 10 个基础命令（原子命令），它们分别是：

- `Insert_Composition_Text`：插入输入法文本
- `Insert_Text`：插入文本
- `Delete_Text`：删除文本
- `Replace_Text`：替换文本
- `Insert_Node`：插入节点
- `Remove_Node`：删除节点
- `Replace_Node`：替换节点
- `Insert_Content`：插入内容（DocumentFragment）
- `Remove_Content`：删除内容（连续的同层节点）
- `Functional`：功能命令（函数式命令）

**命令工厂**：

Effitor 提供了一个工具：`cmd` 命令工厂，用于创建命令。

```typescript
import { cmd } from "@effitor/core";

/** 创建一个命令: 插入输入法文本 */
cmd.insertCompositionText(init);
/** 创建一个命令: 插入文本到文本节点 */
cmd.insertText(init);
/** 创建一个命令: 从文本节点删除文本 */
cmd.deleteText(init);
/** 创建一个命令: 从文本节点替换文本 */
cmd.replaceText(init);
/** 创建一个命令: 插入节点 */
cmd.insertNode(init);
/** 创建一个命令: 移除节点 */
cmd.removeNode(init);
/** 创建一个命令: 替换节点 */
cmd.replaceNode(init);
/** 创建一个命令: 插入内容片段 */
cmd.insertContent(init);
/** 创建一个命令: 移除内容片段 */
cmd.removeContent(init);
/** 创建一个命令: 功能命令 */
cmd.functional(init);
```

**命令管理器**：

```typescript
/** 命令管理器 */
class CommandManager {
  // ...
}
/** 编辑器上下文 */
class EditorContext {
  readonly commandManager: CommandManager;
}
```

**命令生命周期**：

```typescript
// 创建并添加
ctx.commandManager.push(
  cmd.functional({
    execCallback(ctx) {
      // 执行或重做命令
    },
    undoCallback(ctx) {
      // 撤回命令
    },
  }),
);
// 执行已添加的命令
ctx.commandManager.handle();
// 丢弃已执行但未确认的命令（自动撤销）
// ctx.commandManager.discard()
// 确认已执行的命令
ctx.commandManager.commit();
// 撤回已确认的命令
ctx.commandManager.undoTransaction();
// 重做
ctx.commandManager.redoTransaction();
```

### 2.6 选区系统

选区基于原生 `Selection API`，`Range API` 封装。只要理解这两个标准 API，就很容易理解 Effitor 的选区系统。

Effitor 的选区系统由三部分组成：

#### 2.6.1 选区（EtSelection）

选区主要用于交互，理解用户当前行为所处的文档位置，以及更新上下文相关信息。

#### 2.6.2 目标光标/目标范围（TargetCaret/TargetRange）

目标光标/范围主要用于初始化命令，效应器或效应处理函数，根据目标光标/范围来确定激活什么效应，添加什么命令。

#### 2.6.3 光标范围（CaretRange、SpanRange）

光标范围主要用于命令，在命令执行时确定要作用的光标位置，`SpanRange` 用于删除；`CaretRange` 用于插入，以及在命令执行后确定新的选区（光标/范围）位置。

Effitor 提供了一个工具 `cr`，用于快速创建光标范围。

```typescript
import { cr } from "@effitor/core";
```

## 3. 插件化设计

Effitor 的核心仅提供一套处理 DOM 操作的 API，并实现基础的文本操作；“富文本”则必须通过插件实现。每个 Effitor 插件，都是效应器、效应元素与效应处理器的组合。一般来说，插件应至少有一个效应器。

### 3.1 插件分类

Effitor 的插件分两类：

#### 3.1.1 助手插件（Assist）

助手插件通常不携带效应元素，并最终挂载到编辑器上下文的 assists 属性上，供其他插件使用，或实现特定的编辑器功能，如工具栏、悬浮菜单等。

**内置助手插件**：

- [ ] `assist-ai`：AI 助手
- [x] `assist-counter`：字数统计
- [x] `assist-dialog`：对话框
- [x] `assist-dropdown`：下拉菜单
- [x] `assist-message`：消息
- [x] `assist-popup`：弹窗或悬浮菜单
- [ ] `assist-toolbar`：工具栏

#### 3.1.2 内容插件（Plugin）

插件通常用于丰富编辑器文档结构，通过注册额外的效应元素，让编辑器支持特定的富文本结构。

**内置内容插件**：

- [x] `plugin-heading`：标题
- [x] `plugin-mark`：高亮（加粗/斜体/删除线/内敛代码/高亮）
- [x] `plugin-list`：列表
- [x] `plugin-link`：链接
- [x] `plugin-media`：媒体（图片/音/视频）
- [x] `plugin-code`：代码块（支持渲染 html 和 latex）
- [ ] `plugin-math`：数学公式
- [ ] `plugin-table`：表格
- [ ] `plugin-blockquote`：引用块
- [ ] `plugin-excalidraw`：Excalidraw

### 3.2 自定义插件

```typescript
// 核心的所有类型可统一地通过 Et 命名空间访问
import type { Et } from "@effitor/core";

// 插件定义
type PluginOptions = {};
export const usePlugin = (options?: PluginOptions): Et.EditorPlugin => {
  return {
    name: "plugin-name",
    cssText: ``, // 插件css样式
    effector: {}, // 效应器，也可提供一个数组
    elements: [], // 需要注册的效应元素
    register(ctxMeta, setSchema, extendEtElement) {
      // 插件注册函数
    },
  };
};

// 使用插件
const editor = new Effitor({
  plugins: [usePlugin()],
});
```

## 4. 深入理解效应

Effitor 将编辑器内的特定行为称为效应，通过 ts 类型增强来声明，通过效应处理函数来实现。效应元素和效应处理器使用了面向对象的思想，得益于 js 原型链的设计，子类效应元素自动继承父类的效应处理器。而子类重新绑定的效应处理器（准确的说，是效应处理函数），会覆盖父类对相应效应的处理方式，相当于重写（override）了父类指定效应的处理函数。

其原理很简单，挂载一个效应处理器到效应元素上时，我们将效应处理器这个对象直接 assign 到效应元素类对象（构造器）上。激活某个效应时，我们先获取指定效应元素（即自定义的 html 节点）的类对象（构造器），然后从类对象上获取对应效应的处理函数。根据 js 原型链的设计，从子类构造器上访问属性时，如果查找失败，会沿着原型链向上查找，即从父类构造器中查找，由此实现效应的继承和重写。

目前 Effitor 还有很多功能是直接实现的，我们正考虑逐步将这些功能都以效应的形式实现，以提高编辑器的可扩展性和可维护性，逐步形成“Effitor 内，一切皆效应”的思想。

### 4.1 现有内置效应列表

| 效应                              | 描述                           | 回调效应^1 | 备注                       |
| --------------------------------- | ------------------------------ | ---------- | -------------------------- |
| `InsertParagraphAtParagraphEnd`   | 在段落末尾插入段落             | ✅         |                            |
| `InsertParagraphAtParagraphStart` | 在段落开头插入段落             | ✅         |                            |
| `DeleteBackwardAtParagraphStart`  | 在段落开头删除内容             | ✅         |                            |
| `DeleteForwardAtParagraphEnd`     | 在段落末尾删除内容             | ✅         |                            |
| `InsertCompositionTextSuccess`    | 成功插入输入法文本             | ✅         |                            |
| `TransformInsertContents`         | 转换插入内容                   | ✅         |                            |
| ~~`DeleteContentsSpanningStart`~~ | 删除跨起始内容                 | ✅         |                            |
| ~~`DeleteContentsSpanningEnd`~~   | 删除跨结束内容                 | ✅         |                            |
| `InsertCompositionTextInRawEl`    | 在原生编辑节点内插入输入法文本 | ✅         | 选区在原生编辑节点^2内生效 |
| `InsertTextInRawEl`               | 在原生编辑节点内插入文本       | ✅         | 选区在原生编辑节点内生效   |
| `DeleteInRawEl`                   | 在原生编辑节点内删除内容       | ✅         | 选区在原生编辑节点内生效   |
| `DeleteTextInRawEl`               | 在原生编辑节点内删除文本       | ✅         | 选区在原生编辑节点内生效   |
| `ReplaceTextInRawEl`              | 在原生编辑节点内替换文本       | ✅         | 选区在原生编辑节点内生效   |
| `FormatIndentInRawEl`             | 在原生编辑节点内格式化缩进     | ✅         | 选区在原生编辑节点内生效   |
| `FormatOutdentInRawEl`            | 在原生编辑节点内格式化取消缩进 | ✅         | 选区在原生编辑节点内生效   |
| `tabout`                          | Tab 键切换                     | ✅         |                            |
| `dblSpace`                        | 双击空格                       | ✅         |                            |

**备注**：

1. 回调效应指编辑器核心会在特定时机主动调用的效应，如 `DeleteBackwardAtParagraphStart` 会在光标在段落开头按下退格键（`Backspace`）时被调用。
2. 原生编辑节点指的是 `textarea` 和 `input[type="text"]`。

## 5. 总结

Effitor 的核心设计理念是通过效应元素、效应器和效应处理器的组合，实现高效、可扩展的富文本编辑体验。这种设计允许编辑器在处理用户输入时，仅执行必要的 DOM 操作，从而保持优异的性能。

理解这些核心概念对于使用和扩展 Effitor 至关重要。通过深入了解效应元素、效应器和效应处理器的工作原理，您可以更好地使用 Effitor 的 API，开发自定义插件，以及优化编辑器性能。

Effitor 仍在不断发展和完善，我们欢迎社区贡献和反馈，共同推动富文本编辑技术的发展。
