import { Effitor } from '@effitor/core'

import { useCodeAreaPlugin } from './src/ca'
import { useCodePlugin } from './src/index'

const editor = new Effitor({
  plugins: [
    await useCodePlugin(),
    useCodeAreaPlugin(),
  ],
  callbacks: {
    firstInsertedParagraph: (ctx) => {
      const p = ctx.createPlainParagraph()
      p.append('aaa', document.createElement('textarea'), 'bbb')
      return [p]
    },
  },
})

const host = document.getElementById('effitor-host') as HTMLDivElement
editor.mount(host)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.ctx = editor.context
