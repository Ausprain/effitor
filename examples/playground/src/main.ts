/// <reference types="vite/client" />

import '@effitor/core/styles/font.css'

import './assets/main.css'

import * as icons from '../../../packages/shared/src/icons'

import { Effitor } from '@effitor/core'
import { useMarkPlugin } from '@effitor/plugin-mark'
import { useHeadingPlugin } from '@effitor/plugin-heading'
import { useListPlugin } from '@effitor/plugin-list'
import { useCounterAssist } from '@effitor/assist-counter'
import { useDialogAssist } from '@effitor/assist-dialog'
import { useDropdownAssist } from '@effitor/assist-dropdown'
import { useMessageAssist } from '@effitor/assist-message'
import { usePopupAssist } from '@effitor/assist-popup'
import { useCodePlugin } from '@effitor/plugin-code'
import { useLinkPlugin } from '@effitor/plugin-link'
import { HtmlAttrEnum } from '@effitor/shared'
// import { renderExcalidraw } from '@effitor/plugin-excalidraw'
// import css from '@excalidraw/excalidraw/index.css?raw'

import md from '../../../README_zh.md?raw'

// console.log(css.length)  // 186452

const editor = new Effitor({
  // effectorInline: true,
  shadow: false,
  // customStyleText: css,
  config: {
    WITH_EDITOR_DEFAULT_LOGGER: true,
  },
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
    await useCodePlugin(),
    useLinkPlugin(),
    {
      name: 'some',
      effector: {
        keydownSolver: {
          default: (ev, ctx) => {
            console.log('keydown in main')
            if (ctx.selection.rawEl) {
              return ctx.skipDefault()
            }
          },
        },
      },
    },

    // {
    //   name: 'excalidraw',
    //   effector: {
    //     onMounted: (ctx) => {
    //       const div = document.createElement('div')
    //       ctx.bodyEl.appendChild(div)
    //       renderExcalidraw(div)
    //     },
    //   },
    // },
  ],
})

const host = document.getElementById('effitor-host') as HTMLDivElement
editor.mount(host)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.ctx = editor.context
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.sel = editor.context.selection

const iconsHost = document.createElement('div')
iconsHost.style.cssText = `
display: flex;
flex-wrap: wrap;`
Object.keys(icons).forEach((key) => {
  if (key.endsWith('Icon')) {
    const span = document.createElement('span')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    span.appendChild((icons[key as keyof typeof icons] as any)())
    span.setAttribute(HtmlAttrEnum.HintTitle, key)
    span.style.margin = '8px'
    iconsHost.appendChild(span)
  }
})
editor.root.appendChild(iconsHost)

editor.fromMarkdown(md, false)
