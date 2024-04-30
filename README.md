# Effitor
a web editor

## Quick Start
```ts
// 1. install & import
$ npm i effitor
import et from 'effitor'

// 2. create effitor
const effitor = et.createEditor()

// 3. mount a div
const div = document.getElementById('editor-host')
effitor.mount(div)
```

## Featrues

### 缩写符
> 通过缩写词加前/后缀的方式触发的，插入特定样式和功能的节点  
> Insert some specific style and function node by inputed abbreviation word with prefix or suffix(default as `.`) and trigger Key(default as `Space` or `Enter`).  
- [api](#useabbrplugin)

### 图片、链接、列表、(代码块、表格)
> 目前仅支持粘贴图片、链接，创建列表  
- [api](#usecompplugin)

### 部分markdown（`/*/**/==/~~）
> 支持代码、粗体、斜体、高亮、删除线五种样式
- [api](#usemarkplugin)



## Plugins

### 内置插件
#### useAbbrPlugin
```ts
// 
```
#### useCompPlugin
```ts
// 
```
#### useMarkPlugin
```ts
// 
```

### Write a plugin
> Consider writting a plugin for effitor to change font color to `red` of current paragraph after input `fontred`.

#### directory structure
```
project
|- node_modules
    |- effitor
|- src
    |- effitor-plugins
        |- fontred
            |- effector.ts
            |- element.ts   // custom elements or omit
            |- handler.ts
            |- index.ts
    |- index.ts
```
#### coding
```ts
// fontred/effector.ts
import type { Et } from "effitor";

const tokenChecker = {
    pos: 0,
    chars: 'fontred'.split(''),
    checkChar(char: string, callback: () => void) {
        if (this.chars[this.pos] === char) {
            this.pos++
        }
        else {
            // 重新匹配第一个字符，避免`pps.`不匹配`ps.`的情况
            this.pos = this.chars[0] === char ? 1 : 0
        }
        if (this.pos === this.chars.length) {
            // console.log('check success: fontred')
            callback()
            this.pos = 0
        }
    },
    reset() {
        this.pos = 0
    }
}
const afterInputSolver: Et.InputTypeSolver = {
    default: (ev, ctx) => {
        if (ev.data && ev.data.length === 1) {
            tokenChecker.checkChar(ev.data, () => {
                // input事件未结束中, 未触发selectionchange, 需手动强制更新上下文, 以获取正确的光标位置
                ctx.forceUpdate()
                ctx.effectInvoker.invoke('fontred', ctx) && ctx.commandHandler.handle()
            })
        }
        else {
            tokenChecker.reset()
        }
    }
}

export const fontredEffector: Et.Effector = {
    afterInputSolver
}
```
```ts
// fontred/handler.ts
import { utils, type Et } from "effitor";
const domUtils = utils.dom

declare module 'effitor' {
    interface EffectHandlerDeclaration {
        // 添加自定义效果处理函数
        fontred: (ctx: Et.EditorContext) => boolean
    }
}

export const fontredHandler: Partial<Et.EffectHandlerDeclaration> = {
    fontred(ctx) {
        // Object.assign(ctx.paragraphEl.style, {
        //     color: 'red',
        // } as CSSStyleDeclaration )

        // with undo
        const srcCaretRange = domUtils.staticFromRange(ctx.range)
        ctx.commandHandler.push('Functional', {
            redoCallback: () => {
                // console.log('check success: fontred')
                Object.assign(ctx.paragraphEl.style, {
                    color: 'red',
                } as CSSStyleDeclaration)
            },
            undoCallback: () => {
                // console.log('check undo fontred')
                Object.assign(ctx.paragraphEl.style, {
                    color: '',
                } as CSSStyleDeclaration)
            },
            targetRanges: [srcCaretRange, srcCaretRange]
        })
        return true
    },
}
```
```ts
// fontred/index.ts
import et, { type Et } from 'effitor'
import { fontredEffector } from "./effector";
import { fontredHandler } from "./handler";

export const useFontred = (): Et.EditorPlugin => {
    return {
        name: 'fontred',
        effector: fontredEffector,
        registry(ctx) {
            et.handler.extentEtElement(ctx.schema.paragraph, fontredHandler)
        },
    }
}
```
```ts
// src/index.ts
import et from 'effitor'
import { useFontred } from './effitor-plugins/fontred'

const effitor = et.createEditor({
    plugins: [
        // add plugin
        useFontred()
    ]
})
// mount a div
const editorHost = document.getElementById('editor') as HTMLDivElement
editorHost && effitor.mount(editorHost)
```
