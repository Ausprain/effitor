// import '@effitor/themes/default.min.css'

import { Effitor } from '@effitor/core'

import { useTablePlugin } from './src'

const editor = new Effitor({
  plugins: [
    useTablePlugin(),
  ],
})

const host = document.getElementById('effitor-host') as HTMLDivElement
editor.mount(host)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.ctx = editor.context
