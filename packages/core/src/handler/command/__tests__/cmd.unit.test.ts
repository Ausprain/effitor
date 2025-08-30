import { Window } from 'happy-dom'
import { describe, expect, test } from 'vitest'

import type { Et } from '~/core/@types'

import { cr } from '../../../selection'
import { cmd } from '../cmds'

const window = new Window()
const document = window.document

Object.assign(globalThis, { document })

const init = () => {
  document.body.innerHTML = `<div>A12<b>B34</b>C56</div>`
  return document.body.firstElementChild as unknown as HTMLDivElement
}
init()
describe('cmd.insertText', () => {
  // 1. insertText 测试
  test('cmd.insertText', () => {
    const div = init()
    const text = div.firstChild as unknown as Et.Text
    const _cmd = cmd.insertText({
      text,
      data: 'Hello',
      offset: 2,
      setCaret: true,
    })
    expect(_cmd.exec()).toBe(true)
    expect(text.data).toBe('A1Hello2')
    expect(div.innerHTML).toBe('A1Hello2<b>B34</b>C56')
    expect(_cmd.destCaretRange?.toCaret().anchor).toBe(div.firstChild)
    expect(_cmd.destCaretRange?.toCaret().offset).toBe(7)
    expect(_cmd.undo()).toBe(true)
    expect(text.data).toBe('A12')
    expect(div.innerHTML).toBe('A12<b>B34</b>C56')
  })

  // 当setCaret为false时测试
  test('cmd.insertText with setCaret false', () => {
    const div = init()
    const text = div.firstChild as unknown as Et.Text
    const _cmd = cmd.insertText({
      text,
      data: 'NoCaret',
      offset: 1,
      setCaret: false,
    })
    expect(_cmd.exec()).toBe(true)
    expect(text.data).toBe('ANoCaret12')
    expect(div.innerHTML).toBe('ANoCaret12<b>B34</b>C56')
    expect(_cmd.destCaretRange).toBeUndefined()
    expect(_cmd.undo()).toBe(true)
    expect(text.data).toBe('A12')
    expect(div.innerHTML).toBe('A12<b>B34</b>C56')
  })
})

// 2. deleteText 测试
test('cmd.deleteText', () => {
  const div = init()
  const text = div.firstChild as unknown as Et.Text
  const _cmd = cmd.deleteText({
    text,
    offset: 1,
    data: '12',
    isBackward: false,
    setCaret: true,
  })
  expect(_cmd.exec()).toBe(true)
  expect(text.data).toBe('A')
  expect(div.innerHTML).toBe('A<b>B34</b>C56')
  expect(_cmd.destCaretRange?.toCaret().anchor).toBe(div.firstChild)
  expect(_cmd.destCaretRange?.toCaret().offset).toBe(1)
  expect(_cmd.undo()).toBe(true)
  expect(text.data).toBe('A12')
  expect(div.innerHTML).toBe('A12<b>B34</b>C56')
})

// 3. replaceText 测试
test('cmd.replaceText', () => {
  const div = init()
  const text = div.firstChild as unknown as Et.Text
  const _cmd = cmd.replaceText({
    text,
    offset: 1,
    data: 'XX',
    delLen: 2,
    setCaret: true,
  })
  expect(_cmd.exec()).toBe(true)
  expect(text.data).toBe('AXX')
  expect(div.innerHTML).toBe('AXX<b>B34</b>C56')
  expect(_cmd.destCaretRange?.toCaret().anchor).toBe(div.firstChild)
  expect(_cmd.destCaretRange?.toCaret().offset).toBe(3)
  expect(_cmd.undo()).toBe(true)
  expect(text.data).toBe('A12')
  expect(div.innerHTML).toBe('A12<b>B34</b>C56')
})

// 4. insertNode 测试
test('cmd.insertNode', () => {
  const div = init() as unknown as Et.HTMLElement
  const newNode = document.createElement('i') as unknown as Et.HTMLNode
  newNode.textContent = 'Inserted'
  const execAt = cr.caretIn(div, 1)
  const _cmd = cmd.insertNode({
    node: newNode,
    execAt,
    setCaret: true,
  })
  expect(_cmd.exec()).toBe(true)
  expect(div.innerHTML).toBe('A12<i>Inserted</i><b>B34</b>C56')
  expect(_cmd.destCaretRange?.toCaret().anchor).toBe(newNode)
  expect(_cmd.destCaretRange?.toCaret().offset).toBe(0)
  expect(_cmd.undo()).toBe(true)
  expect(div.innerHTML).toBe('A12<b>B34</b>C56')
})

// 5. removeNode 测试
test('cmd.removeNode', () => {
  const div = init()
  const nodeToRemove = div.children[0] as unknown as Et.HTMLNode
  const _cmd = cmd.removeNode({
    node: nodeToRemove,
    setCaret: true,
  })
  expect(_cmd.exec()).toBe(true)
  expect(div.innerHTML).toBe('A12C56')
  // 底层命令在删除节点时, 并不会考虑前后节点合并问题, 此处光标位置依旧在 div 上
  expect(_cmd.destCaretRange?.toCaret().anchor).toBe(div)
  expect(_cmd.destCaretRange?.toCaret().offset).toBe(1)
  expect(_cmd.undo()).toBe(true)
  expect(div.innerHTML).toBe('A12<b>B34</b>C56')
})

// 6. replaceNode 测试
test('cmd.replaceNode', () => {
  const div = init()
  const oldNode = div.children[0] as unknown as Et.HTMLNode
  const newNode = document.createElement('u') as unknown as Et.HTMLNode
  newNode.textContent = 'Replaced'
  const _cmd = cmd.replaceNode({
    oldNode,
    newNode,
    setCaret: true,
  })
  expect(_cmd.exec()).toBe(true)
  expect(div.innerHTML).toBe('A12<u>Replaced</u>C56')
  expect(_cmd.destCaretRange?.toCaret().anchor).toBe(newNode)
  expect(_cmd.destCaretRange?.toCaret().offset).toBe(0)
  expect(_cmd.undo()).toBe(true)
  expect(div.innerHTML).toBe('A12<b>B34</b>C56')
})

// 7. insertContent 测试
test('cmd.insertContent', () => {
  const div = init() as unknown as Et.HTMLElement
  const fragment = document.createDocumentFragment() as unknown as Et.Fragment
  const span = document.createElement('span') as unknown as Et.HTMLNode
  // <span>Fragment</span>
  span.textContent = 'Fragment'
  fragment.appendChild(span)
  const execAt = cr.caretIn(div, 1)
  const _cmd = cmd.insertContent({
    content: fragment,
    execAt,
    destCaretRange: cr.range(div, 1, div, 3),
  })
  expect(_cmd.exec()).toBe(true)
  expect(div.innerHTML).toBe('A12<span>Fragment</span><b>B34</b>C56')
  expect(_cmd.destCaretRange?.toRange()?.toString()).toBe('FragmentB34')
  expect(_cmd.undo()).toBe(true)
  expect(div.innerHTML).toBe('A12<b>B34</b>C56')
})

// 8. removeContent 测试
test('cmd.removeContent', () => {
  const div = init() as unknown as Et.HTMLElement
  // `<div>A12<b>B34</b>C56</div>`
  // 假设我们要删除从第一个文本节点到 <b> 节点的内容
  let removeRange = cr.spanRangeFromTo(div, 0, 1) as Et.SpanRange
  let _cmd = cmd.removeContent({
    removeRange,
  })
  expect(_cmd.exec()).toBe(true)
  expect(div.innerHTML).toBe('C56')
  expect(_cmd.undo()).toBe(true)
  expect(div.innerHTML).toBe('A12<b>B34</b>C56')

  removeRange = cr.spanRangeFromTo(div, 1, 1) as Et.SpanRange
  _cmd = cmd.removeContent({
    removeRange,
  })
  expect(_cmd.exec()).toBe(true)
  expect(div.innerHTML).toBe('A12C56')
  expect(_cmd.undo()).toBe(true)
  expect(div.innerHTML).toBe('A12<b>B34</b>C56')

  removeRange = cr.spanRangeFromTo(div, 2, 1) as Et.SpanRange
  _cmd = cmd.removeContent({
    removeRange,
  })
  expect(_cmd.exec()).toBe(true)
  expect(div.innerHTML).toBe('A12')
  expect(_cmd.undo()).toBe(true)
  expect(div.innerHTML).toBe('A12<b>B34</b>C56')
})

// 9. functional 测试
test('cmd.functional', () => {
  const div = init() as unknown as Et.HTMLElement
  const _cmd = cmd.functional({
    execCallback() {
      div.innerHTML = 'Functional'
    },
    undoCallback() {
      div.innerHTML = 'A12<b>B34</b>C56'
    },
  })
  _cmd.exec({} as Et.UpdatedContext)
  expect(div.innerHTML).toBe('Functional')
  _cmd.undo({} as Et.UpdatedContext)
  expect(div.innerHTML).toBe('A12<b>B34</b>C56')
})
