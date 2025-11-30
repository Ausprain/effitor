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

/**
 * 清除 html 元素的指定属性
 * @param html
 * @param attrs 要清除的属性列表, 默认清除 style 和 class 属性
 */
export const clearHtmlAttrs = (html: string, attrs: string[] = ['style', 'class']) => {
  const div = document.createElement('div')
  div.innerHTML = html
  traversal.traverseNode(div as any, null, {
    whatToShow: NodeFilter.SHOW_ELEMENT,
    filter(el) {
      if (el instanceof HTMLElement) {
        attrs.forEach((attr) => {
          el.removeAttribute(attr)
        })
      }
      return NodeFilter.FILTER_SKIP
    },
  })
  return div.innerHTML
}
