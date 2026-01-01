<p align="center">
  <a href="https://ausprain.github.io/effitor/"><img src="https://raw.githubusercontent.com/ausprain/effitor/main/docs/assets/title.webp" alt="Effitor - Efficient Editor"></a>
</p>
<p align="center">
  <a href="#">English</a> | 
  <a href="https://github.com/Ausprain/effitor/blob/main/README_zh.md">中文</a>
</p>

# Effitor

Effitor is a high-performance, pluggable web rich text editor that embraces modern web standards and aims for the **ultimate editing experience**. It can be used as an out-of-the-box editor library or as an underlying framework for building customized editors.

> ⚠️ Note: Currently in early exploration phase (v0.x)
>
> - Not yet production-ready stable, APIs may change;
> - Only supports modern desktop browsers (Chrome, Edge, Firefox, Safari);
> - Does not support collaborative editing (not a design goal).

## Why Choose Effitor?

Unlike other editors, Effitor has **editing efficiency and experience** as its core goal—hence the name: _**effi**cient edi**tor**_.

It's built on `contenteditable`, implemented through the most basic DOM operations, and **almost completely takes over browser's default behavior for `contenteditable`** (except for IME), enabling highly flexible and customizable editing logic.

If you:

- Don't need collaborative editing, spell checking, or auto-completion;
- Don't strictly require consistent document structure;
- Want to quickly build or customize an editor with minimal learning cost

Then Effitor is perfect for you. It has no complex abstract models, just familiarize yourself with basic DOM operations, and you can quickly build your own editor. Of course, you can also use the default configuration directly, "out of the box".

Additionally, Effitor's core package `@effitor/core` already includes extensive editing experience optimizations and will continue to iterate.

### 🚀 Notable Features

#### 1. More Reasonable Format Continuation

Most editors are like a set of painting tools: users need to manually switch brushes (toggle styles: like `Ctrl+B` for bold). If bold text is at the end of a paragraph, subsequent input will **automatically inherit the style**, requiring another key press (switching to normal brush) to exit—this has become an "industry convention," but it's not a good experience. For example, if a piece of text is bold+italic+underline, you need to press: `Ctrl+B+I+U` or another clear-style combination key to cancel all styles.

Effitor tries to change this: **style switching is done by the editor, not the user**. The core idea is: users insert special nodes through hotkeys or hotstrings, and the editor automatically applies specific styles or executes corresponding behaviors based on the cursor position and editor configuration (plugins, etc.).

- Introduces the concept of "effect elements," where all key nodes, including style nodes (like bold, italic), are "effect elements";
- Pressing `Tab` inside a style "effect element" allows you to jump out of the current style;
- Double-pressing space allows you to jump out of the outermost style nesting.
- Developers can customize "effect elements" and their internal editing behaviors (plugin-based).

#### 2. Built-in Hotstring

Similar to AutoHotkey's hotstring functionality, but without external tools and with cross-platform support.

- Supports custom hotstring rules;
- Efficient matching, even with thousands of configured rules, without affecting performance;
- Perfectly solves the problem of no AutoHotkey alternative on macOS.

#### 3. Automatic Half-width Punctuation Conversion for IME

When Chinese users use Chinese input methods to write markdown, they may often need to switch input methods or Chinese/English modes to insert correct markdown syntax characters (like `` ` ``, `[]`, instead of `·`, `【】`). On Windows, this is no issue, but on macOS, frequently switching input methods is an operation that extremely affects the editing experience.

Effitor provides two solutions:

- **Lightweight mode**: After entering a full-width symbol, press space again to automatically replace it with half-width (e.g., `·` → `` ` ``, `！` → `!`);
- **Automatic mode** (configurable): Automatically convert full-width characters to corresponding half-width when inserted;
- Can also completely disable this feature.

#### 4. Language-aware Caret Control

Browsers natively support `Alt + ←/→` to jump the caret by "semantic words," but this depends on system language.

Effitor integrates this capability into the editor:

- Can set editor language through API;
- Supports `Alt + ←/→` to skip words;
- Supports `Alt + Backspace` to delete entire semantic words.

## Installation

```sh
npm install effitor
```

## Usage

ESM only:

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

[Live Demo](https://effitor.top/)

---

## Performance

### Editors supporting basic markdown, loading 300k characters HTML (no tables and code blocks), and typing 1000 characters at the end paragraph

| Editor  | Duration (s) | LCP (ms) | CLS | INP (ms) | INPs (ms) | Memory (MB) |
| ------- | ------------ | -------- | --- | -------- | --------- | ----------- |
| effitor | 45.6         | 499.2    | 0   | 59.2     | 110.6     | 44.4        |
| lexical | 73.4         | 281.6    | 0   | 145.6    | 120.8     | 83.2        |
| tiptap  | 52.7         | 216.8    | 0.2 | 64       | 61.3      | 20.6        |

### Editors supporting basic markdown, loading 1 million characters HTML (no tables and code blocks), and typing 1000 characters at the end paragraph

| Editor  | Duration (s) | LCP (ms) | CLS | INP (ms) | INPs (ms) | Memory (MB) |
| ------- | ------------ | -------- | --- | -------- | --------- | ----------- |
| effitor | 50.5         | 1206.4   | 0   | 80       | 149.9     | 35.2        |
| tiptap  | 62.3         | 755.2    | 0.2 | 84.8     | 92.4      | 58.2        |

> From [effitor performance tests](./examples/benchmark/)
> Test environment: macOS: 8x[Apple M3] 16GB, nodejs: v24.3.0, playwright: 1.56.1
>
> - LCP reflects the total time for editor initialization and loading corresponding content, where effitor includes the time for loading the shiki highlighter;
> - INP reflects the response time after stable user input, the lower the better, indicating lower latency after stable input;
> - INPs is the average of INP metric recorded values, the lower the better, indicating more stable editor response, the higher the larger average response latency or existence of some operation causing high latency;
> - Duration is the total time for the editor to complete all operations, after subtracting LCP it's the time to simulate typing 1000 characters, the lower the better, indicating faster editor response and higher efficiency;
> - Memory is the memory size occupied by the editor, where effitor includes the shiki highlighter (~15MB).

## Feature Overview

- ✅ Out of the box
- ✅ Framework-agnostic, highly customizable
- ✅ Built-in undo/redo stack
- 🔄 Built-in cursor/selection history (in development)
- ✅ Built-in hotkeys and hotstrings
- ✅ Light/dark theme switching
- ✅ Partial Markdown, native HTML conversion
- ✅ Built-in assistants
  - ✅ `assist-counter`: Word count
  - ✅ `assist-dialog`: Dialog
  - ✅ `assist-dropdown`: Dropdown menu
  - ✅ `assist-message`: Message notification
  - ✅ `assist-popup`: Popup and floating tools
- ✅ Built-in plugins
  - ✅ `plugin-heading`: Headings
  - ✅ `plugin-mark`: Highlights (bold, italic, strikethrough, etc.)
  - ✅ `plugin-link`: Links
  - ✅ `plugin-list`: Ordered/unordered/task lists
  - ✅ `plugin-media`: Media (images/audio/video)
  - ✅ `plugin-code`: Code blocks (supports HTML, LaTeX rendering)
  - ✅ `plugin-table`: Tables
  - ✅ `plugin-blockquote`: Blockquotes (paragraph groups | columns)
- Other assistants or plugins
  - 🔄 `assist-ai`: AI assistant (in development)
  - 📐 `plugin-math`: Math formulas (planned)
  - 🎨 `plugin-excalidraw`: excalidraw whiteboard (in development)

## Design Philosophy

- **No abstract data model**: Direct DOM manipulation, reducing learning cost;
- **Deeply customizable `contenteditable`**: Except for IME and clipboard, all behaviors are controlled by Effitor;
- **Based on web standards**: Follows [`Input Events Level 2`](https://www.w3.org/TR/input-events-2/), [`Selection API`](https://www.w3.org/TR/selection-api/), [`Range`](https://www.w3.org/TR/DOM-Level-2-Traversal-Range/ranges.html) and other specifications.

## Limitations

- **No collaborative editing support**: Due to no intermediate data model, collaborative implementation is extremely difficult (but not a design goal anyway);
- **Browser compatibility differences**: Although most edge cases have been handled, individual subtle behaviors may vary by browser;
- **Accessibility (a11y) support to be improved**: Heavy use of custom elements, ARIA support is still under construction.

## Final Words

Effitor is still in the exploration phase, and some APIs may be adjusted at any time. For example, we initially built Effitor based on Shadow DOM, but in practice we found: **current Shadow DOM still has many compatibility and interaction issues in rich text editing scenarios**, and eventually had to abandon this approach.

We plan to complete the last major refactoring in **v0.3.0**, supplement complete tests, and push Effitor towards maturity and stability.

## Documentation

[Documentation](https://github.com/Ausprain/effitor/blob/main/docs/Index.md)

## License

[MIT](https://choosealicense.com/licenses/mit/)
