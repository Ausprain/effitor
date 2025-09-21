import '@effitor/core/styles/font.css'

import { Effitor } from '@effitor/core'

import { useMarkPlugin } from './src'

const editor = new Effitor({
  plugins: [
    useMarkPlugin(),
  ],
})

const host = document.getElementById('effitor-host') as HTMLDivElement

editor.mount(host)

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.ctx = editor.context
