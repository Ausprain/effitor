import './src/assets/font.css'

import { Effitor } from './src'

const editor = new Effitor()

const host = document.getElementById('effitor-host') as HTMLDivElement
editor.mount(host)

window.ctx = editor.context

export {}
