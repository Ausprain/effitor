import { test } from 'vitest'

import { Effitor } from '../../editor'

const host = document.createElement('div')
document.body.appendChild(host)

const editor = new Effitor()

test('mount', () => {
  editor.mount(host)
  console.log(editor, host)
})
