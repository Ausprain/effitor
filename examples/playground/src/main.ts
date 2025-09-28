import '@effitor/core/styles/font.css'

import './assets/main.css'

import { Effitor } from '@effitor/core'
import { useMarkPlugin } from '@effitor/plugin-mark'
import { useHeadingPlugin } from '@effitor/plugin-heading'
import { useCounterAssist } from '@effitor/assist-counter'
import { useDialogAssist } from '@effitor/assist-dialog'
import { useDropdownAssist } from '@effitor/assist-dropdown'
import { useMessageAssist } from '@effitor/assist-message'
import { usePopupAssist } from '@effitor/assist-popup'
import { renderExcalidraw } from '@effitor/plugin-excalidraw'
import css from '@excalidraw/excalidraw/index.css?raw'

// console.log(css.length)  // 186452

const editor = new Effitor({
  // effectorInline: true,
  // shadow: false,
  customStyleText: css,
  config: {
    WITH_EDITOR_DEFAULT_LOGGER: true,
  },
  plugins: [
    useCounterAssist(),
    useDialogAssist(),
    useDropdownAssist(),
    useMessageAssist(),
    usePopupAssist(),
    useMarkPlugin(),
    useHeadingPlugin(),

    {
      name: 'excalidraw',
      effector: {
        onMounted: (ctx) => {
          const div = document.createElement('div')
          ctx.bodyEl.appendChild(div)
          renderExcalidraw(div)
        },
      },
    },
  ],
})

const host = document.getElementById('effitor-host') as HTMLDivElement
editor.mount(host)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.ctx = editor.context
