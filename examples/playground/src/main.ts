import '@effitor/core/styles/font.css'

import './assets/main.css'

import { Effitor } from '@effitor/core'
import { useMarkPlugin } from '@effitor/plugin-mark'
import { useCounterAssist } from '@effitor/assist-counter'
import { useDialogAssist } from '@effitor/assist-dialog'
import { useDropdownAssist } from '@effitor/assist-dropdown'
import { useMessageAssist } from '@effitor/assist-message'

const editor = new Effitor({
  // effectorInline: true,
  config: {
    WITH_EDITOR_DEFAULT_LOGGER: true,
  },
  plugins: [
    useCounterAssist(),
    useDialogAssist(),
    useDropdownAssist(),
    useMessageAssist(),
    useMarkPlugin(),
  ],
})

const host = document.getElementById('effitor-host') as HTMLDivElement
editor.mount(host)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.ctx = editor.context
