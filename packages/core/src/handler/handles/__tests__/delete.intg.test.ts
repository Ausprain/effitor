import { describe, expect, suite, test } from 'vitest'

import type { Et } from '~/core/@types'
import { cr } from '~/core/selection'

import { initEditor, minifiedHtml } from '../../../__tests__/shared.test'

suite('delete backward at caret', async () => {
  const editor = await initEditor(`<et-p class="etp et">Hello ABC<b>bold</b></et-p>`)
  const body = editor.bodyEl
  const ctx = editor.context
  const p = body.children[0] as Et.EtParagraphElement

  test('in same text', () => {
    ctx.setSelection(cr.caretIn(p.firstChild!, 6))
    ctx.dispatchInputEvent('beforeinput', {
      inputType: 'deleteContentBackward',
    })
    expect(p.innerHTML).toBe(`HelloABC<b>bold</b>`)

    ctx.dispatchInputEvent('beforeinput', {
      inputType: 'deleteWordBackward',
    })
    expect(p.innerHTML).toBe(`ABC<b>bold</b>`)

    ctx.setSelection(cr.caretInEnd(p.children[0].firstChild as any))
    ctx.dispatchInputEvent('beforeinput', {
      inputType: 'deleteWordBackward',
    })
    expect(p.innerHTML).toBe(`ABC`)
  })

  test('in samp paragraph (removeNode)', () => {
    body.innerHTML = `<et-p class="etp et">Hello ABC<b>bold</b></et-p>`
    let p = body.children[0] as Et.EtParagraphElement
    ctx.setSelection(cr.caretInEnd(p.children[0] as any))
    ctx.dispatchInputEvent('beforeinput', {
      inputType: 'deleteWordBackward',
    })
    expect(p.innerHTML).toBe(`Hello ABC`)

    body.innerHTML = `<et-p class="etp et">Hello ABC<b>bold</b></et-p>`
    p = body.children[0] as Et.EtParagraphElement
    ctx.setSelection(cr.caretOutEnd(p.children[0] as any))
    ctx.dispatchInputEvent('beforeinput', {
      inputType: 'deleteWordBackward',
    })
    expect(p.innerHTML).toBe(`Hello ABC`)

    body.innerHTML = `<et-p class="etp et">Hello ABC<b>bold</b></et-p>`
    p = body.children[0] as Et.EtParagraphElement
    ctx.setSelection(cr.caretOutEnd(p.children[0] as any))
    ctx.dispatchInputEvent('beforeinput', {
      inputType: 'deleteContentBackward',
    })
    expect(p.innerHTML).toBe(`Hello ABC`)
  })

  test('delete backward at paragraph start', () => {
    body.innerHTML = `<et-p class="etp et">Hello ABC<b>bold</b></et-p>`
    const p = body.children[0] as Et.EtParagraphElement
    ctx.setSelection(cr.caretInStart(p as any))
    ctx.dispatchInputEvent('beforeinput', {
      inputType: 'deleteContentBackward',
    })
    expect(p.innerHTML).toBe(`Hello ABC<b>bold</b>`)
    expect(ctx.selection.range?.collapsed).toBe(true)
    expect(ctx.selection.range?.startOffset).toBe(0)
    expect(ctx.selection.range?.startContainer).toBe(p)

    body.innerHTML = minifiedHtml(`
      <et-p class="etp et">Hello ABC<b>bold</b></et-p>
      <et-p class="etp et">Hello ABC<b>bold</b></et-p>
    `)
    const p1 = body.children[0] as Et.EtParagraphElement
    const p2 = body.children[1] as Et.EtParagraphElement
    ctx.setSelection(cr.caretInStart(p2 as any))
    ctx.dispatchInputEvent('beforeinput', {
      inputType: 'deleteContentBackward',
    })
    expect(body.childNodes.length).toBe(1)
    expect(body.firstChild?.localName).toBe('et-p')
    expect((body.firstChild as HTMLElement)?.innerHTML).toBe(`Hello ABC<b>bold</b>Hello ABC<b>bold</b>`)
  })
})
