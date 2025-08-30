import { Window } from 'happy-dom'
import { expect, test } from 'vitest'

import { dom } from '..'
import { traversal } from '../traversal'

const window = new Window()
const document = window.document
Object.assign(globalThis, {
  document,
})
const initBody = () => {
  document.body.innerHTML = `<div>ABC<b>BCD</b><span>IJK</span>XYZ</div>`
}

test('traversal.traverseRange', () => {
  initBody()
  const div = document.body.firstChild!
  const b = document.querySelector('b')!
  const span = document.querySelector('span')!
  const range = document.createRange()
  // startContainer === endContainer, both are #text
  Promise.resolve().then(() => {
    range.setStart(div.firstChild!, 0)
    range.setEnd(div.firstChild!, 2)
    let s = ''
    traversal.traverseRange(range as unknown as Range, (node) => {
      s += node.textContent
      return false
    })
    expect(s).toBe('ABC')
  })
  // startContainer === endContainer, both are element
  Promise.resolve().then(() => {
    range.setStart(div, 0)
    range.setEnd(div, dom.nodeLength(div as any))
    const nodeNames: string[] = []
    traversal.traverseRange(range as any, (node) => {
      nodeNames.push(node.nodeName)
      return false
    })
    expect(nodeNames).toEqual(['#text', 'B', '#text', 'SPAN', '#text', '#text'])
  })
  // startContainer is commonAncestor
  Promise.resolve().then(() => {
    range.setStart(div, 0)
    range.setEnd(span.firstChild!, 2)
    const nodeNames: string[] = []
    traversal.traverseRange(range as any, (node) => {
      nodeNames.push(node.nodeName)
      return false
    }, {
      whatToShow: 4,
    })
    expect(nodeNames).toEqual(['#text', '#text', '#text'])
  })
  Promise.resolve().then(() => {
    range.setStart(document.body, 0)
    range.setEnd(span.lastChild!, 2)
    const nodeNames: string[] = []
    traversal.traverseRange(range as any, (node) => {
      nodeNames.push(node.nodeName)
      return false
    })
    expect(nodeNames).toEqual(['DIV', '#text', 'B', '#text', 'SPAN', '#text'])
  })
  // endContainer is commonAncestor
  Promise.resolve().then(() => {
    range.setStart(b, 1)
    range.setEnd(div, dom.nodeLength(div as any))
    const nodeNames: string[] = []
    traversal.traverseRange(range as any, (node) => {
      nodeNames.push(node.nodeName)
      return false
    })
    expect(nodeNames).toEqual(['SPAN', '#text', '#text'])
  })
  Promise.resolve().then(() => {
    range.setStart(b.lastChild!, 2)
    range.setEnd(document.body, 1)
    const nodeNames: string[] = []
    traversal.traverseRange(range as any, (node) => {
      nodeNames.push(node.nodeName)
      return false
    })
    // `<div>ABC<b>BC^D</b><span>IJK</span>XYZ</div>|`
    expect(nodeNames).toEqual(['#text', 'B', 'SPAN', '#text', '#text', 'DIV'])
  })
  // start/endContainer both are not commonAncestor
  Promise.resolve().then(() => {
    range.setStart(b.firstChild!, 1)
    range.setEnd(div.lastChild!, 2)
    const nodeNames: string[] = []
    traversal.traverseRange(range as any, (node) => {
      nodeNames.push(node.nodeName)
      return false
    })
    expect(nodeNames).toEqual(['#text', 'B', 'SPAN', '#text', '#text'])
  })
})
