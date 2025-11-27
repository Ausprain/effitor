/// <reference types="vite/client" />"

import dompurify from 'dompurify'

import '@effitor/themes/default.min.css'
import { Effitor } from 'effitor'
import { useHeadingPlugin } from 'effitor/plugins'

import { listenWebMetrics } from '../shared/metric'
listenWebMetrics()

const app = document.getElementById('app') as HTMLDivElement
const host = document.createElement('div')
app.appendChild(host)

const editor = new Effitor({
  htmlOptions: {
    sanitizer: html => dompurify.sanitize(html),
  },
  config: {
    AUTO_CREATE_FIRST_PARAGRAPH: false,
  },
  plugins: [
    useHeadingPlugin(),
  ],
})

editor.mount(host)

window.$initEditorContentfromHTML = (html: string) => {
  editor.fromHTML(html)
}
