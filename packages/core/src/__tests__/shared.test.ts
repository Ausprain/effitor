import { Window } from 'happy-dom'

import { Et } from '~/core/@types'
import { Effitor } from '~/core/editor'

const window = new Window()
const document = window.document
Object.assign(globalThis, {
  window,
  document,
  customElements: window.customElements,
  requestAnimationFrame: window.requestAnimationFrame,
})

export const initEditor = async (html: string) => {
  const host = document.createElement('div') as any
  document.body.appendChild(host)
  const editor = new Effitor()
  editor.mount(host)
  editor.bodyEl.innerHTML = minifiedHtml(html)
  // 等待节点挂载, 测试环境可能不支持自定义元素的 connectedCallback 回调,
  // 这里手动设置 contenteditable
  await Promise.resolve().then(() => {
    editor.bodyEl.contentEditable = 'true'
  })
  return editor
}

export const minifiedHtml = (html: string) => {
  return html.replaceAll(/(?<=>)\s+|\s+(?=<)/g, '').trim()
}
