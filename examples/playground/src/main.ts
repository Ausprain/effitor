import '@effitor/core/styles/font.css'

import './assets/main.css'

import { Effitor } from 'effitor'

const editor = new Effitor()

const host = document.getElementById('effitor-host') as HTMLDivElement
editor.mount(host)

export { }
