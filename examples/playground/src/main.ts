/// <reference types="vite/client" />

import 'rect-visualizer'

// import '@effitor/themes/default.min.css'
import '@effitor/themes/default/index.css'

import './assets/main.css'

import * as icons from '../../../packages/shared/src/icons'

import { Effitor, etcode, EtParagraphElement } from '@effitor/core'
import { HtmlAttrEnum } from '@effitor/shared'

// import { useAIAssist } from '@effitor/assist-ai'
import { useCounterAssist } from '@effitor/assist-counter'
import { useDialogAssist } from '@effitor/assist-dialog'
import { useDropdownAssist } from '@effitor/assist-dropdown'
import { useMessageAssist } from '@effitor/assist-message'
import { usePopupAssist } from '@effitor/assist-popup'
import { useBlockquotePlugin } from '@effitor/plugin-blockquote'
import { useCodePlugin } from '@effitor/plugin-code'
import { useHeadingPlugin } from '@effitor/plugin-heading'
import { useLinkPlugin } from '@effitor/plugin-link'
import { useListPlugin } from '@effitor/plugin-list/'
import { useMarkPlugin } from '@effitor/plugin-mark'
import { type CreateImageOptions, useMediaPlugin } from '@effitor/plugin-media'
import { EtTableCellElement, useTablePlugin } from '@effitor/plugin-table'
// import { renderExcalidraw } from '@effitor/plugin-excalidraw'
// import css from '@excalidraw/excalidraw/index.css?raw'
// console.log(css.length)  // 186452

// import md from '../../../README_zh.md?raw'
import DOMPurify from 'dompurify'
import md from '../demo.md?raw'

const onMediaFileSelected = (files: File[]) => {
  const opts: CreateImageOptions[] = []
  for (const file of files) {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    opts.push({
      alt: file.name,
      url: new Promise((resolve) => {
        reader.onloadend = async () => {
          const start = Date.now()
          await (async () => {
            return new Promise<void>((resolve) => {
              const it = setInterval(() => {
                // 添加一个延迟，模拟加载大文件效果
                if (Date.now() - start > 1000) {
                  resolve()
                  clearInterval(it)
                }
              }, 500)
            })
          })()
          resolve(reader.result as string)
        }
      }),
    })
  }
  return opts
}
const countSpan = initTextCountSpan()
const editor = new Effitor({
  // shadow: false,
  // customStyleText: css,
  config: {
    WITH_EDITOR_DEFAULT_LOGGER: true,
    AUTO_CREATE_FIRST_PARAGRAPH: false,
  },
  htmlOptions: {
    sanitizer: html => DOMPurify.sanitize(html),
  },
  assists: [
    // useAIAssist(),
    useCounterAssist({
      onUpdated: (count) => {
        countSpan.textContent = JSON.stringify(count)
      },
    }),
    useDialogAssist(),
    useDropdownAssist(),
    useMessageAssist(),
    usePopupAssist(),
  ],
  plugins: [
    useMarkPlugin({
      needMarkEffectElementCtors: [EtTableCellElement, EtParagraphElement],
    }),
    useHeadingPlugin(),
    useBlockquotePlugin(),
    useListPlugin(),
    await useCodePlugin({
      canRenderLangs: ['html', 'latex'],
      allowSMIL: true,
    }),
    useLinkPlugin(),
    useMediaPlugin({
      image: {
        onfileselected: onMediaFileSelected,
      },
      audio: {
        onfileselected: onMediaFileSelected,
      },
      video: {
        onfileselected: onMediaFileSelected,
        maxSize: 20 * 1024 * 1024,
      },
    }),
    useTablePlugin(),

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
editor.fromMarkdown(md)

// editor.context.commonHandler.initEditorContents(true)
// editor.bodyEl.dispatchEvent(new KeyboardEvent('keydown', {
//   key: '#AAA',
// }))
// requestAnimationFrame(() => {
//   editor.bodyEl.dispatchEvent(new KeyboardEvent('keydown', {
//     key: ' ',
//   }))
// })
// editor.bodyEl.contentEditable = 'false'

// aa\`bbb\`dde\\\`f
// \`\`\`js
// const a = 3;
// \`\`\`
// aa

// - 司法界
// - 上飞机诶

// 1. 的撒娇佛额
// 2. 的撒娇佛IE

// * 的sjfie
// * 是的就发i饿哦
// const mmd = `# 这是一个标题

// aaa[www](www.cc.com)gg
// `

// // 这是一个段落**aabb**DDeff==www==kkll*abbc*ddef**bold*italic*end**。
// editor.context.assists.ai.typingMarkdown(mmd, 50)

// const btn = dom.el('button', '', `
//   position: fixed;
//   top: 100px;
//   right: 100px;
//   z-index: 1000;
//   background-color: wheat;
//   width: 50px;
//   height: 50px;
//   `)
// document.body.appendChild(btn)
// btn.onclick = () => {
//   editor.context.actions.table.insertNewRowBottom(editor.context)
// }

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.ctx = editor.context
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.sel = editor.context.selection
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.etcode = etcode

const iconGlances = () => {
  const iconsHost = document.createElement('div')
  iconsHost.style.cssText = `
display: flex;
flex-wrap: wrap;`
  Object.keys(icons).forEach((key) => {
    if (key.endsWith('Icon')) {
      const span = document.createElement('span')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      span.appendChild((icons[key as keyof typeof icons] as any)())
      span.setAttribute(HtmlAttrEnum.EtTitle, key)
      span.style.margin = '8px'
      iconsHost.appendChild(span)
    }
  })
  editor.root.appendChild(iconsHost)
}
iconGlances()

function initTextCountSpan() {
  const div = document.createElement('div')
  Object.assign(div.style, {
    position: 'fixed',
    top: '8px',
    right: '8px',
    padding: '16px',
    whiteSpace: 'pre',
    border: '1px solid #ccc',
    borderRadius: '4px',
    backgroundColor: 'wheat',
  } as CSSStyleDeclaration)

  const span = document.createElement('span')
  div.appendChild(span)
  document.body.appendChild(div)
  return span
}
