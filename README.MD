<p align="center">
  <a href="./README.md">English</a> |
  <a href="./README_zh.md">中文</a>
</p>
<p align="center" style="font-style:italic"><span style="color:red;">effi</span>cient edi<span style="color:red;">tor</span></p>

# Effitor

> **Language Options: [English](#readme) | [中文](https://github.com/username/repo/blob/main/README_zh.md)**

Effitor is a high-performance, plugin-based web rich text editor framework, named for "efficient editor", aiming to provide the most elegant editing experience.

> effitor does not support collaborative editing, at least not at present.

## Installation

Install effitor with npm

```bash
npm install effitor
```

## Usage

Only supports esm

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

## Features

### Functionality

- Out-of-the-box usability
- Framework-agnostic and highly customizable
- Built-in undo/redo stack
- [ ] Built-in cursor history (In Progress)
- Built-in shortcuts and hotstrings
- Editor light/dark mode toggle
- Markdown conversion (to/from)
- Built-in Assistants
  - Word Count (`assist-counter`)
  - Dialog (`assist-dialog`)
  - Dropdown (`assist-dropdown`)
  - Message (`assist-message`)
  - Popup and Floating Tools (`assist-popup`)
- Built-in Plugins
  - Headings (`plugin-heading`)
  - Highlight (`plugin-mark`)
  - Link (`plugin-link`)
  - List (`plugin-list`)
  - Media (Image/Audio/Video) (`plugin-media`)
  - Code Block (`plugin-code`)
  - [ ] Table (//TODO)
  - [ ] Math Formula (//TODO)
  - [ ] Excalidraw (//In Progress)

### Characteristics

- **No Abstract Data Model**: Editing operates by directly manipulating the DOM.
- **`contenteditable`-based, but Fully Managed**: While built on `contenteditable`, the framework takes full control over all browser behaviors (except for IME input and clipboard actions).
- **Aligned with Latest W3C Standards**: Adheres to and implements the latest web standards, including but not limited to: [`Input Events Level 2`](https://www.w3.org/TR/input-events-2/), [`Selection API`](https://www.w3.org/TR/selection-api/), [`Range`](https://www.w3.org/TR/DOM-Level-2-Traversal-Range/ranges.html)

### Limitations

The absence of an abstract data model and its underlying implementation of direct DOM manipulation make it nearly impossible, or at least very difficult, to implement collaborative editing in Effitor. However, collaborative editing was never part of Effitor's original intention. It is primarily a rich text editor framework that, in the pursuit of an elegant editing experience, incidentally achieved high performance.

Furthermore, Effitor is implemented directly using standard web APIs. Due to variations in how different browsers implement these standards, and despite Effitor addressing the vast majority of edge cases, there remains a possibility of subtle, unaccounted-for differences. These differences might potentially lead to instabilities in the editor's behavior.

## Performance

## Demo

_Insert GIF or link to demo_

## Documentation

[Documentation](./docs/index.md)

## Acknowledgments

## License

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)

[MIT](https://choosealicense.com/licenses/mit/)
