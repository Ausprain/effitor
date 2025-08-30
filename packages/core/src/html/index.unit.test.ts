import { expect, test } from 'vitest'

import { initEditor, minifiedHtml } from '../__tests__/shared.test'
import { dom } from '../utils'

test('computed style', () => {
  const div = document.createElement('div')
  div.style.display = 'block'
  document.body.appendChild(div)
  const css = window.getComputedStyle(div)
  expect(css.display).toBe('block')
})

test('to html', async () => {
  const editor = await initEditor(`
    <et-p>AA<b>BB</b>CC</et-p>
    <et-p>AA<b>BB</b>CC</et-p>
    <script>let hello = 'world';</script>
    `)
  const ctx = editor.context
  const body = ctx.bodyEl
  const originHtml = body.innerHTML

  expect(editor.htmlProcessor.toHtml(ctx)).toBe('<div><p>AA<b>BB</b>CC</p><p>AA<b>BB</b>CC</p></div>')
  // 不影响编辑器内容
  expect(editor.bodyEl.innerHTML).toBe(originHtml)
})
test('from html', async () => {
  const editor = await initEditor('')
  const ctx = editor.context

  const html = minifiedHtml(`
    <p>AA<b>BB</b>CC</p>
    <p>AA<svg>G</svg>CC</p>
    <script>let hello = 'world';</script>
  `)

  expect(dom.fragmentToHTML(editor.htmlProcessor.fromHtml(ctx, html))).toBe('<et-p>AABBCC</et-p><et-p>AA<svg>G</svg>CC</et-p>')
})
