<p align="center"><a href="#"><img src="./docs/assets/title.webp" alt="efficient editor"></a></p>
<p align="center">
  <a href="#">English</a> | 
  <a href="./README_zh.md">中文</a>
</p>

# Effitor

Effitor is a high-performance, plugin-based web rich-text editor. Its name comes from "**efficient editor**"—it embraces the latest web standards and technologies, aiming to deliver an exceptionally elegant editing experience.

> ⚠️ **Effitor is an experimental project**. It is not yet a fully stable editor and still has many known or unknown issues to be addressed. Currently, it only supports modern desktop browsers (Chrome, Edge, Firefox, Safari) and **does not support collaborative editing**.

## Why Effitor?

Unlike other editors, Effitor prioritizes **editing efficiency and user experience**, as reflected in its name: _efficient editor_. Built on `contenteditable`, it implements core functionality using fundamental DOM operations and **overrides nearly all of the browser’s default `contenteditable` behaviors** (except for IME input), enabling highly customized editing logic.

If you don’t need features like collaborative editing, spell-checking, auto-completion, or strict document structure—and you simply want a pleasant, personalized way to write content—then Effitor is a great fit. It’s intentionally simple, with **no abstract data model**. As long as you’re familiar with basic DOM manipulation, you can easily customize Effitor to build your own unique editor. Alternatively, if you’re happy with its default configuration, you can use it **out of the box**.

Moreover, within Effitor’s core package (`@effitor/core`), we’ve implemented numerous enhancements to improve the editing experience—and this work is ongoing.

### Decent Performance

// TODO: benchmark

### Format Continuation Problem

Most rich-text editors behave like a set of neatly arranged paintbrushes—you constantly need to switch between them. For example, to apply bold formatting, you press `Ctrl+B`, type your text, and then press `Ctrl+B` again to turn it off. Additionally, if bold (or any highlighted) text appears at the end of a paragraph, continuing to type will **automatically inherit that style**, unless you manually toggle it off. If you used both bold and italic, you’d need to press `Ctrl+B` _and_ `Ctrl+I` to exit both styles.

This behavior has become an unspoken norm across editors—but it’s **not a good user experience**.

Effitor try to solve this. Instead of forcing users to manage formatting states manually, the editor **responds instantly to intent**—switching "brushes" automatically. We introduce the concept of **effect elements**: formatting nodes like bold are treated as such. Pressing `Tab` lets you **escape the current effect element**, and double-pressing space allows you to **jump out of the outermost styling context**.

### Built-in Hotstrings

Hotstrings are similar to hotkeys: when you type a specific sequence of characters, it can be replaced with predefined text or trigger an action.

On Windows, tools like [AutoHotkey](https://www.autohotkey.com/) can implement hotstrings—but they require programming knowledge, can be unstable (sometimes failing to recognize triggers or unexpectedly switching IME modes), and **don’t support macOS**. While macOS has Hammerspoon, using it for hotstrings is far from ideal.

Effitor includes **native hotstring support**. You can define your own hotstrings via configuration. The matching algorithm is highly efficient—adding thousands of hotstrings has **negligible impact on performance** or editing fluency.

### Automatic Half-Width Punctuation for IME Input

Non-English speakers may have encountered this: while writing Markdown with a IME enabled, you press the backtick key `` ` `` to create inline code—but you get character else like `·` instead. You’re forced to constantly toggle between input methods or keyboard layouts to get the desired character. On macOS, switching system keyboard or IME is particularly frustrating.

You might try tweaking IME settings, but often there’s no clean solution. On Windows, AutoHotkey’s `T*` hotstring mode can help—but it may cause side effects.

In Effitor, we offer a more elegant fix: if you press `` ` `` and get `·`, just **press space once more**, and it becomes `` ` ``. Similarly: `【` → `[`, `！` → `!`. All you need is an extra space. If you prefer not to press space, you can configure Effitor to **automatically convert full-width punctuation to half-width upon insertion**, or disable this feature entirely.

### Language-Aware Cursor Navigation

When editing, you might use `Alt + ←/→` to jump by word—but browsers typically only recognize Latin words and half-width punctuation. Fortunately, modern browsers already support **language-aware word boundary detection** based on system or page language.

Effitor integrates this capability directly into the editor. You can **set a specific language** for the editor, enabling smooth, accurate word-by-word navigation—even for non-Latin scripts.

The same applies to `Alt + Backspace` for deleting individual semantic words.

## Installation

Install via npm:

```bash
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
  useBlockquotePlugin,
  useListPlugin,
  useCodePlugin,
  useLinkPlugin,
  useMediaPlugin,
  useTablePlugin,
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
    useBlockquotePlugin(),
    useListPlugin(),
    await useCodePlugin(),
    useLinkPlugin(),
    useMediaPlugin(),
    useTablePlugin(),
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

## Performance

_(To be documented)_

## Features

- Out-of-the-box usability
- Framework-agnostic & highly customizable
- Built-in undo stack
- [ ] Built-in cursor history (_in progress_)
- Built-in keyboard shortcuts & hotstrings
- Light/dark mode toggle
- Partial Markdown and HTML conversion
- Built-in assistants:
  - `assist-counter`: character count
  - `assist-dialog`: modal dialogs
  - `assist-dropdown`: dropdown menus
  - `assist-message`: notifications
  - `assist-popup`: tooltips & floating panels
- Built-in plugins:
  - `plugin-heading`: headings
  - `plugin-mark`: highlights
  - `plugin-link`: hyperlinks
  - `plugin-list`: ordered/unordered lists
  - `plugin-media`: images/audio/video
  - `plugin-code`: code blocks
  - `plugin-blockquote`: blockquotes
  - `plugin-table`: tables
  - [ ] `plugin-math`: math formulas (_planned; currently possible via LaTeX rendering in code blocks_)
  - [ ] `plugin-excalidraw`: (_in progress_)

### Characteristics

- **No abstract data model**—editing is done via direct DOM manipulation.
- Based on `contenteditable`, but **overrides almost all browser behaviors** (except IME input and clipboard handling).
- Built on modern **web standards**, including:
  - [`Input Events Level 2`](https://www.w3.org/TR/input-events-2/)
  - [`Selection API`](https://www.w3.org/TR/selection-api/)
  - [`Range`](https://www.w3.org/TR/DOM-Level-2-Traversal-Range/ranges.html)

### Limitations

Because Effitor lacks an abstract document model and operates directly on the DOM, **collaborative editing is extremely difficult to implement**—and was never part of its original vision. Effitor emerged as a high-performance rich-text framework during an exploration of elegant editing experiences.

Additionally, since Effitor relies heavily on web standard APIs—and browsers implement these inconsistently—it’s possible that **edge cases remain unhandled**, potentially causing instability in rare scenarios.

Finally, Effitor makes extensive use of **custom elements**, and its **accessibility (a11y) support is still incomplete**.

---

## Documentation

[Documentation](./docs/index_en.md)

## Acknowledgements

_(To be filled)_

## License

MIT
