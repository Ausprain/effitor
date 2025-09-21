import { Window } from 'happy-dom'

import type { Et } from '../@types'
import { Effitor } from '../editor'
import { traversal } from '../utils'

const window = new Window()
const document = window.document
Object.assign(globalThis, {
  window,
  document,
  customElements: window.customElements,
  requestAnimationFrame: window.requestAnimationFrame,
  Range: window.Range,
  Selection: window.Selection,
  HTMLElement: window.HTMLElement,
})

export const initEditor = async (html: string, options?: Et.CreateEditorOptions) => {
  const host = document.createElement('div') as any
  document.body.appendChild(host)
  const editor = new Effitor(options)
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

export const clearHtmlAttrs = (html: string) => {
  const div = document.createElement('div')
  div.innerHTML = html
  traversal.traverseNode(div as any, null, {
    whatToShow: NodeFilter.SHOW_ELEMENT,
    filter(el) {
      if (el instanceof HTMLElement) {
        el.removeAttribute('style')
        el.removeAttribute('class')
      }
      return NodeFilter.FILTER_SKIP
    },
  })
  return div.innerHTML
}
