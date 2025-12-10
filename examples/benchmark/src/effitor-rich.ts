/// <reference types="vite/client" />"

import dompurify from 'dompurify'
import '../shared/metric'

import '@effitor/themes/default/index.css'
import { Effitor } from 'effitor'
import {
  useCounterAssist,
  useDialogAssist,
  useDropdownAssist,
  useMessageAssist,
  usePopupAssist,
} from 'effitor/assists'
import {
  useBlockquotePlugin,
  useCodePlugin,
  useHeadingPlugin,
  useLinkPlugin,
  useListPlugin,
  useMarkPlugin,
  useMediaPlugin,
  useTablePlugin,
} from 'effitor/plugins'

import { listenWebMetrics } from '../shared/metric'
listenWebMetrics()

/* eslint-disable @typescript-eslint/no-non-null-assertion */
const app = document.getElementById('app')!
const host = document.createElement('div')
app.appendChild(host)

const editor = new Effitor({
  htmlOptions: {
    sanitizer: html => dompurify.sanitize(html),
  },
  config: {
    AUTO_CREATE_FIRST_PARAGRAPH: false,
  },
  assists: [
    useCounterAssist(),
    useDialogAssist(),
    useDropdownAssist(),
    useMessageAssist(),
    usePopupAssist(),
  ],
  plugins: [
    useHeadingPlugin(),
    useMarkPlugin(),
    useLinkPlugin(),
    useMediaPlugin(),
    useListPlugin(),
    useTablePlugin(),
    useBlockquotePlugin(),
    await useCodePlugin(),
  ],
})

editor.mount(host)

window.$initEditorContentfromHTML = (html: string) => {
  editor.fromHTML(html)
}
