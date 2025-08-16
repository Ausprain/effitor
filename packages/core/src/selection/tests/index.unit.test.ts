import type { Et } from '@effitor/core'
import { Window } from 'happy-dom'
import { describe, expect, test } from 'vitest'

import { cr } from '../cr'
import { EtRange } from '../EtRange'

const window = new Window()
const document = window.document
// 必须覆盖全局 document, 因内部使用了 document.createRange 创建 range 对象, 若使用原来的
// document, 会造成 range 永远只能 collapsed; 因为 range 来自原来的 document, 而选择的 dom 节点来自 happy-dom
Object.assign(globalThis, {
  document,
})
const fragment = document.createRange().createContextualFragment('<div>AAA<b>BBB</b>CCC</div>') as unknown as Et.Fragment
const initBody = (html = '<div>AAA<b>BBB</b>CCC</div>') => {
  document.body.innerHTML = html
  return document.body.firstElementChild as unknown as Et.HTMLElement
}

test('EtCaret', () => {
  const df = fragment.cloneNode(true)
  const caret = cr.caretIn(df.firstChild!, 1)
  // df not in DOM, range to be null
  expect(caret.toRange()).toBe(null)

  const div = initBody()
  caret.fromRange({
    startContainer: div,
    startOffset: 1,
    endContainer: div,
    endOffset: 1,
  })
  caret.toRange()?.insertNode(new Text('|'))
  expect(div.outerHTML).toBe('<div>AAA|<b>BBB</b>CCC</div>')

  caret.fromRange({
    startContainer: div,
    startOffset: 2,
    endContainer: div,
    endOffset: 2,
  })
  div.normalize()
  caret.toRange()?.insertNode(new Text('|'))
  expect(div.outerHTML).toBe('<div>AAA|<b>BBB</b>|CCC</div>')
  expect(caret.compareTo(caret.moved(-1)) > 0).toBe(true)

  div.normalize()
  const r = document.createRange() as unknown as Et.Range
  caret.adoptToRange(r, false, true)
  caret.moved(-2).adoptToRange(r, true, false)
  expect(r.toString()).toBe('AAA|BBB')
})

describe('EtCaret Affinity', () => {
  const div = initBody(`
    <div>
      <p>AA</p>
      <p>BB<b>CC</b>DD</p>
      <p><i>EE</i>FF<br></p>
    </div>
  `.replaceAll(/(?<=>)\s+(?=<)/g, '').trim())
  const [p1, p2, p3] = [...div.querySelectorAll('p')] as any
  const AA = p1.firstChild
  const BB = p2.firstChild
  const b = BB.nextSibling
  const CC = b.firstChild
  const DD = p2.lastChild
  const i = p3.firstChild
  const EE = i.firstChild
  const FF = i.nextSibling
  const br = FF.nextSibling

  const c1 = cr.caretInEnd(CC)
  const c2 = cr.caretInStart(DD)
  const c3 = cr.caretInEnd(FF)
  expect(c1.isAffinityTo(c2)).toBe(true)
  expect(c2.isAffinityTo(c3)).toBe(false)
  /**
   * 亲和组1:
   *    (div, 1) -> (p2, 0) -> (BB, 0)
   *    (p2, 0) -> (BB, 0)
   *    (BB, 0)
   *    (p1, 1) -> (AA, 2) => (p2, 0) -> (BB, 0)
   *    (AA, 2) => (BB, 0)
   */
  test('亲和组1', () => {
    const c1 = cr.caret(div, 1)
    const c2 = cr.caret(p2, 0)
    const c3 = cr.caret(BB, 0)
    const c4 = cr.caret(p1, 1)
    const c5 = cr.caret(AA, 2)
    expect(c1.isAffinityTo(c2)).toBe(true)
    expect(c2.isAffinityTo(c3)).toBe(true)
    expect(c3.isAffinityTo(c4)).toBe(true)
    expect(c4.isAffinityTo(c5)).toBe(true)
  })
  /**
   *
   * 亲和组2:
   *    (div, 2) -> (p3, 0) -> (i, 0) -> (EE, 0)
   *    (p2, 3) -> (DD, 2) => (p3, 0) -> (i, 0) -> (EE, 0)
   *    (p3, 0) -> (i, 0) -> (EE, 0)
   *    (i, 0) -> (EE, 0)
   *    (EE, 0)
   */
  test('亲和组2', () => {
    const c1 = cr.caret(div, 2)
    const c2 = cr.caret(p2, 3)
    const c3 = cr.caret(p3, 0)
    const c4 = cr.caret(i, 0)
    const c5 = cr.caret(EE, 0)
    expect(c1.isAffinityTo(c2)).toBe(true)
    expect(c2.isAffinityTo(c3)).toBe(true)
    expect(c3.isAffinityTo(c4)).toBe(true)
    expect(c4.isAffinityTo(c5)).toBe(true)
  })
  /**
   *
   * 亲和组3:
   *    (FF, 2) => (br, 0)
   *    (br, 0)
   *    (p3, 2) -> (br, 0)
   *    // 非亲和
   *    (p3, 3) -> (br, 1)
   *
   */
  test('亲和组3', () => {
    const c1 = cr.caret(FF, 2)
    const c2 = cr.caret(br, 0)
    const c3 = cr.caret(p3, 2)
    const c4 = cr.caret(p3, 3)
    expect(c1.isAffinityTo(c2)).toBe(true)
    expect(c2.isAffinityTo(c3)).toBe(true)
    expect(c3.isAffinityTo(c4)).toBe(false)
  })
})

/**
 * 内部使用了 document.createRange
 */
test('EtRange', () => {
  const df = fragment.cloneNode(true)
  const range = new EtRange(df.firstChild!, 0, df.lastChild!, 0)
  expect(range.toRange()).toBe(null)

  initBody()
  const div = document.body.firstElementChild! as unknown as Et.Element
  range.fromRange({
    startContainer: div,
    startOffset: 0,
    endContainer: div.firstElementChild!.firstChild!,
    endOffset: 1,
  })
  expect(range.isCollapsed).toBe(false)
  expect(range.toRange()?.toString()).toBe('AAAB')
})

test('cr caret', () => {
  initBody()
  const div = document.body.firstElementChild! as unknown as Et.Element
  let caret = cr.caretIn(div, 0)
  expect(!caret.toRange()).toBe(false)
  caret.toRange()?.insertNode(new Text('|'))
  div.normalize()
  expect(div.outerHTML).toBe('<div>|AAA<b>BBB</b>CCC</div>')

  caret = caret.moved(1)
  caret.toRange()?.insertNode(new Text('|'))
  div.normalize()
  expect(div.outerHTML).toBe('<div>|AAA|<b>BBB</b>CCC</div>')

  const b = div.firstElementChild!
  caret = cr.caretInEnd(b)
  caret.toRange()?.insertNode(new Text('|'))
  div.normalize()
  expect(div.outerHTML).toBe('<div>|AAA|<b>BBB|</b>CCC</div>')

  caret = cr.caretInStart(b)
  caret.toRange()?.insertNode(new Text('|'))
  div.normalize()
  expect(div.outerHTML).toBe('<div>|AAA|<b>|BBB|</b>CCC</div>')

  caret = cr.caretOutStart(b)
  caret.toRange()?.insertNode(new Text('^'))
  div.normalize()
  expect(div.outerHTML).toBe('<div>|AAA|^<b>|BBB|</b>CCC</div>')

  caret = cr.caretOutEnd(b)
  caret.toRange()?.insertNode(new Text('^'))
  div.normalize()
  expect(div.outerHTML).toBe('<div>|AAA|^<b>|BBB|</b>^CCC</div>')
})

test('cr caret', () => {
  initBody()
  const div = document.body.firstElementChild! as unknown as Et.Element
  const b = div.firstElementChild!
  let range = cr.range(div, 0, div, 1)
  expect(!range.toRange()).toBe(false)
  expect(range.toRange()?.toString()).toBe('AAA')

  range = cr.range(div, 0, b, 1)
  expect(range.toRange()?.extractContents().textContent).toBe('AAABBB')
  expect(div.outerHTML).toBe('<div><b></b>CCC</div>')
})
