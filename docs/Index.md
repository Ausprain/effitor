<p align="center">
  <a href="./index.md">English</a> |
  <a href="./index_zh.md">中文</a>
</p>

# Core Concepts

Background

> In rich text editing scenarios, each user editing action requires immediate response from the editor, otherwise it will seriously affect the experience. The most direct way to achieve immediate response is to manipulate the DOM, but this must meet a key prerequisite: **avoid triggering a large number of DOM operations that cause browser reflow/repaint in a short time**.
>
> Since editing operations themselves require "low latency," we cannot use general optimization methods like debouncing, throttling, or batch delayed updates to avoid the "short time" constraint. Therefore, the key to optimization is to reduce the **DOM update amount** involved in each operation.
>
> To achieve this goal, `effitor` introduces the concept of `EffectElement`. Each `EffectElement` is a [CustomElement](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements). All key nodes are composed of `EffectElements`, which encapsulate data state and update logic internally. All user editing behaviors are determined by effect elements on how to handle, and these behaviors are collectively called `Effect`.
> When a user operation occurs, the `Effector` parses and `invokes` the corresponding `Effect`, which is then handled by the `EffectHandler` mounted on the `EffectElement` (executing specific DOM operations). This design ensures that each edit triggers only **local, precise, and minimal** DOM updates, thereby maintaining excellent runtime performance while guaranteeing response speed.

![Basic Architecture](./assets/editflow.png)

## Effector

The effector is a collection of DOM event callback functions inside the editor, responsible for handling user behaviors and activating corresponding effects.

There are multiple plugin effectors and one main effector inside the editor. For each registered DOM event, the plugin effector's corresponding callback function is executed first, and returns true only when terminating subsequent plugin execution. Within the corresponding callback function, you can set the editor context to skip the main effector's execution (similar to Event.preventDefault).

For keyboard events and input events, the callback function integrates into a `Solver` based on key type or input type.

```ts
const effector: Et.Effector = {
  keydownSolver: {
    Tab: (ev, ctx) => {
      /** Handle Tab key press event */
    },
    Enter: (ev, ctx) => {
      /** Handle Enter key press event */
    },
    // ...
  },
  beforeInputSolver: {
    insertText: (ev, ctx) => {
      /** Handle text insertion */
    },
    insertParagraph: (ev, ctx) => {
      /** Handle paragraph insertion */
    },
    // ...
  },
  copyCallback: (ev, ctx) => {
    /** Handle copy event */
  },
  selChangeCallback: (ev, ctx) => {
    /** Handle selectionchange event */
  },
  // ...
  onMounted: () => {
    /** Execute after editor is mounted */
  },
  onBeforeUnmount: () => {
    /** Execute before editor is unmounted */
  },
  // ...
};
```

In version `v0.2.0`, multiple plugin effectors are merged into one plugin effector when the editor is initialized, so the editor ultimately has only two effectors: the main effector and the plugin effector.

## EffectElement

Effect elements are implemented through custom elements ([CustomElement](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)). The effect element base class is `EffectElement`. Custom elements that inherit from this class are effect elements. At editor runtime, it checks whether the HTML element has the `ETCODE` symbol property. If it exists, the element is an effect element.

```ts
// @internal
const ETCODE = Symbol("ETCODE");
// @internal
const IN_ETCODE = Symbol("IN_ETCODE");
// @internal
const NOT_IN_ETCODE = Symbol("NOT_IN_ETCODE");

// Effect element base class
abstract class EffectElement extends HTMLElement {
  /**
   * Effect element name, used for registering custom elements
   * According to custom element specifications, must be in `kebab-case` format,
   * otherwise registration will fail
   */
  static abstract readonly elName: string;

  /** Effect element type code */
  static readonly etType = 0;
  /** Effect element type codes allowed as direct children of this effect element */
  static inEtType = 0;
  /** Effect element type codes not allowed as direct children of this effect element */
  static notInEtType = 0;

  /** Effect code of the effect element instance (html node), assigned directly through static etType when creating element instance */
  readonly [ETCODE]: number;
  /** Effect element type codes allowed to become direct child nodes of this effect element instance, equal to static inEtType */
  readonly [IN_ETCODE]: number;
  /** Effect element type codes not allowed to become direct child nodes of this effect element instance, equal to static notInEtType */
  readonly [NOT_IN_ETCODE]: number;

  get etCode() {
    return this[ETCODE];
  }
}
```

Create a paragraph effect element

```ts
class EtParagraphElement extends EffectElement {
  static readonly elName = "et-p";
}
```

Effect elements are the same as ordinary HTML elements. What an effect element looks like inside the editor depends on its CSS styles and child node content.

Every operation in the editor is an operation on effect elements and their descendant nodes. Before and after each operation, the editor updates the context, which records the effect element where the current cursor/selection is located (`focusEtElement & commonEtElement`). The editor decides how to execute the next editing operation based on that effect element.

> [!IMPORTANT]
> The `etCode` property of effect elements (i.e., `ETCODE`) is a `symbol` property maintained internally by the editor. During development, please note that **_do not mix development environment code and production environment code during testing_** (this usually depends on the project's directory structure and import method. Different import methods and tsconfig or vite configurations may cause vite to import from `src` source code or `dist` build artifacts), because the `ETCODE` created by the two codes is different. Although both output as `Symbol("ETCODE")` in the console, they correspond to two different Symbol objects.
> The effect code tool `etcode` (widely used inside the editor) uses the specified `ETCODE` to check effect elements. If the `ETCODE` property on a certain effect element is different from the specified `ETCODE`, `etcode.check` will consider it not an effect element, leading to unexpected test results.
> This is usually not encountered, but needs to be emphasized here. Because if you encounter this problem unknowingly, you may not even know where to start debugging.

## EffectHandler

The effect handler consists of a series of effect handling functions. The property names of the effect handler are `Effect`, and the property values are `effect handling functions`.

Use `ts` type augmentation to declare effects.

```ts
// augment.ts
import type { Et } from "@effitor/core";

type EffectAPayload = { data: string };
declare module "@effitor/core" {
  interface EffectHandleDeclaration {
    // Note: The parameter list of effect handling functions is fixed.
    // Additional declared effect handling functions can specify received parameter types by overloading the `payload` type.
    // If the effect does not need payload, it can be omitted or declared as `void` type.
    effectA: (this: Et.EffectHandleThis, ctx: Et.EditorContext, payload: EffectAPayload) => boolean;
    // Or declare directly through utility functions
    effectB: Et.EffectHandle<void>;
  }
}
export {};
```

Implementation

```ts
// handler.ts
export const handler: Et.EffectHandler = {
  effectA(ctx, { data }) {
    // Handle effect A
    // You can also call other effects through this
    this.effectB?.(ctx);
  },
};
```

Invoke effect

```ts
// Invoke effect A of the effect element where the current cursor is located
ctx.effectInvoker.invoke(ctx.focusEtElement, "effectA", ctx, { data: "hello" });
// Or directly get the effect handler and call (this is a convenience method and facilitates IDE tracking, but will ignore `effectBlocker`)
ctx.getEtHandler(ctx.focusEtElement).effectA?.(ctx, { data: "hello" });
```

For an effect handler to take effect, it must be mounted on a specified effect element. If mounted on the effect element base class `EffectElement`, the corresponding effects and effect handling functions are effective for all effect elements (unless overridden). Essentially, the effect handler will eventually be mounted on the effect element class object (constructor).

```ts
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

### Deep Dive into Effects

effitor refers to specific behaviors inside the editor as effects, declared through ts type augmentation and implemented through effect handling functions. Effect elements and effect handlers use object-oriented thinking. Thanks to JS prototype chain design, child class effect elements automatically inherit the parent class's effect handler. The effect handler rebound by the child class (more precisely, the effect handling function) will override the parent class's handling of the corresponding effect, which is equivalent to overriding the parent class's specified effect handling function.

The principle is simple. When mounting an effect handler to an effect element, we directly assign the effect handler object to the effect element class object (constructor). When activating a certain effect, we first get the class object (constructor) of the specified effect element (i.e., the custom html node), then get the corresponding effect handling function from the class object. According to JS prototype chain design, when accessing properties from a child class constructor, if the lookup fails, it will look up along the prototype chain, i.e., look up from the parent class constructor, thereby implementing effect inheritance and overriding.

Currently, many functions in effitor are implemented directly. We are considering gradually implementing these functions in the form of effects to improve the editor's extensibility and maintainability, gradually forming the idea of "everything in effitor is an effect."

### List of Built-in Effects:

// todo: supplement list

## Context

Context includes `EditorContext` and `PluginContext`.

### EditorContext

The editor context is the core of the editor. The editor's behavior is handled by various modules on the editor context. These modules include:

- `body`: Editor body module
- `pctx`: Plugin context module
- `assists`: Assistant (plugin) module (declared and implemented by plugins)
- `actions`: Editor action module (declared and implemented by plugins)
- `composition`: Input method module
- `segmenter`: Word segmentation module
- `selection`: Selection module
- `effectInvoker`: Effect invoker
- `commandManager`: Command manager
- `commonHandler`: Common effect handler
- `hotkeyManager`: Hotkey manager
- `hotstringManager`: Hotstring manager

### PluginContext

The plugin context `pctx` is an object attached to the `EditorContext`. Typically, plugins bind their own configuration information or tools to `pctx`, allowing plugins to access desired information through `ctx.pctx` at various stages of the editor lifecycle.

```ts
export interface EditorPluginContext {
  [k: string]: any;
}
interface EditorContext {
  pctx: EditorPluginContext;
}
```

> [!NOTE]
> The plugin context is only created in the specified editor context ctx instance when the plugin is registered.

# Plugin System

effitor's core only provides a set of APIs for handling DOM operations and implements basic text operations; "rich text" must be implemented through plugins. Each effitor plugin is a combination of effector, effect elements, and effect handlers. Generally, a plugin should have at least one effector.

effitor plugins are divided into two categories: assistant plugins and content plugins.

## Assistant Plugin

Assistant plugins usually don't carry effect elements and are eventually mounted on the `assists` property of the editor context for use by other plugins or to implement specific editor features, such as toolbars, floating menus, etc.

```ts
export interface EditorAssists {
  [k: string]: any;
}
interface EditorContext {
  assists: EditorAssists;
}
```

Built-in assistants include:

- [x] `assist-counter`: Word count
- [x] `assist-dialog`: Dialog
- [x] `assist-dropdown`: Dropdown menu
- [x] `assist-message`: Message notification
- [x] `assist-popup`: Popup or floating menu

## Content Plugin

Plugins are usually used to enrich editor document structures, allowing the editor to support specific rich text structures by registering additional effect elements.

Built-in plugins include:

- [x] `plugin-heading`: Headings
- [x] `plugin-mark`: Highlights (bold/italic/strikethrough/inline code/highlight)
- [x] `plugin-list`: Lists
- [x] `plugin-link`: Links
- [x] `plugin-media`: Media (images/audio/video)
- [x] `plugin-code`: Code blocks (supports rendering html and latex)
- [x] `plugin-table`: Tables
- [x] `plugin-blockquote`: Blockquotes (paragraph groups | columns)

## Custom Plugins

```ts
// All core types can be accessed uniformly through the Et namespace
import type { Et } from "@effitor/core";

// Plugin definition
type PluginOptions = {};
export const usePlugin = (options?: PluginOptions): Et.EditorPlugin => {
  return {
    name: "plugin-name",
    cssText: ``, // Plugin CSS styles
    effector: {}, // Effector, can also provide an array
    etElements: [], // Effect elements to register
    register(ctxMeta, setSchema, extendEtElement) {
      // Plugin registration function
    },
  };
};

// Use plugin
const editor = new Effitor({
  plugins: [usePlugin()],
});
```

> [!NOTE]
> The naming `usePlugin`'s `use` is literal, retained due to initial habit, and has nothing to do with `react` hooks; the function has no side effects when called, it just returns a plugin object.

# Command System

The command system is the foundation of effitor, giving the editor the ability to directly manipulate DOM and undo executed operations. Since effitor has no abstract data model, all document data and operations are based on DOM. Direct DOM operations can easily break document structure. Therefore, effitor's commands are based on strict configuration, and only correctly configured commands have safe undo capability.

## Command Object

effitor's command system has 10 basic commands (atomic commands), which are:

- `Insert_Composition_Text`: Insert IME text
- `Insert_Text`: Insert text
- `Delete_Text`: Delete text
- `Replace_Text`: Replace text
- `Insert_Node`: Insert node
- `Remove_Node`: Remove node
- `Replace_Node`: Replace node
- `Insert_Content`: Insert content (DocumentFragment)
- `Remove_Content`: Remove content (continuous same-level nodes)
- `Functional`: Functional command (functional command)

effitor provides a tool: `cmd` command factory for creating commands.

```ts
import { cmd } from "@effitor/core";

/** Create a command: insert IME text */
cmd.insertCompositionText(init);
/** Create a command: insert text into text node */
cmd.insertText(init);
/** Create a command: delete text from text node */
cmd.deleteText(init);
/** Create a command: replace text in text node */
cmd.replaceText(init);
/** Create a command: insert node */
cmd.insertNode(init);
/** Create a command: remove node */
cmd.removeNode(init);
/** Create a command: replace node */
cmd.replaceNode(init);
/** Create a command: insert content fragment */
cmd.insertContent(init);
/** Create a command: remove content fragment */
cmd.removeContent(init);
/** Create a command: functional command */
cmd.functional(init);
```

Commands created by `cmd` can be executed and undone. Usually we don't need or recommend manual execution and undo. effitor uses the command manager on the context to manage the command lifecycle.

## Command Manager

```ts
/** Command manager */
class CommandManager {
  // ...
}
/** Editor context */
class EditorContext {
  readonly commandManager: CommandManager;
}
```

Lifecycle of a command

```ts
// Create and add
ctx.commandManager.push(
  cmd.functional({
    execCallback(ctx) {
      // Execute or redo command
    },
    undoCallback(ctx) {
      // Undo command
    },
  }),
);
// Execute added command
ctx.commandManager.handle();
// Discard executed but unconfirmed command (auto undo)
// ctx.commandManager.discard()
// Confirm executed command
ctx.commandManager.commit();
// Undo confirmed command
ctx.commandManager.undoTransaction();
// Redo
ctx.commandManager.redoTransaction();
```

> [!NOTE]
> The underlying commands do not check document specification. They directly perform corresponding DOM operations according to command configuration. Therefore, when creating commands, you need to carefully judge the execution timing and position of commands to avoid illegal behaviors such as inserting paragraphs within paragraphs, or inserting nodes other than list items within lists.
> Or use a higher-level method `ctx.commonHandler` to execute corresponding DOM operations.

# Selection System

The selection is based on native `Selection API` and `Range API` encapsulation. Once you understand these two standard APIs, it's easy to understand effitor's selection system.

effitor's selection system consists of three parts: selection, target cursor/range, and cursor range.

## Selection (EtSelection)

Selection is mainly used for interaction, understanding the document location where the user's current behavior is, and updating context-related information.

## Target Cursor/Target Range (TargetCaret/TargetRange)

Target cursor/range is mainly used to initialize commands. The effector or effect handling function determines what effect to activate and what command to add based on the target cursor/range.

## Cursor/Range (CaretRange、SpanRange)

Cursor range is mainly used for commands, determining the cursor position to act on when commands are executed. SpanRange is used for deletion; CaretRange is used for insertion and determining the new selection (cursor/range) position after command execution.

effitor provides a tool `cr` for quickly creating cursor ranges.

```ts
import { cr } from "@effitor/core";
```
