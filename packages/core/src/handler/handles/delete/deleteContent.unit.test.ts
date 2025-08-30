import { describe, expect, test } from 'vitest'

import { initEditor } from '~/core/__tests__/shared.test'
import { Et } from '~/core/@types'
import { cr } from '~/core/selection'

import {
  deleteContent,
  deleteContentBackward,
  deleteContentForward,
} from './deleteContent'

describe('integration', () => {
  test('deleteContent', async () => {
    const editor = await initEditor('<et-p>Hello A78<b>bold<i>I123</i></b>B12</et-p>')
    const ctx = editor.context as Et.UpdatedContext
    const body = editor.bodyEl
    const p = body.children[0] as Et.EtParagraphElement
    expect(deleteContent(ctx.effectInvoker.getEtElCtor(p), ctx, new InputEvent('beforeinput'))).toBe(false)
    ctx.setSelection(cr.rangeAllIn(p.firstChild as any))
    expect(deleteContent(ctx.effectInvoker.getEtElCtor(p), ctx, new InputEvent('beforeinput'))).toBe(true)
    expect(ctx.commandManager.handle()).toBe(true)
    expect(p.innerHTML).toBe('<b>bold<i>I123</i></b>B12')
  })

  test('deleteContentBackward', async () => {
    const editor = await initEditor('<et-p>Hello A78<b>bold<i>I123</i></b>B12</et-p>')
    const ctx = editor.context as Et.UpdatedContext
    const body = editor.bodyEl
    const p = body.children[0] as Et.EtParagraphElement

    // 测试光标在文本末尾的情况
    ctx.setSelection(cr.caretIn(p.firstChild as Et.Text, 5)) // 在"Hello"后
    expect(deleteContentBackward(ctx.effectInvoker.getEtElCtor(p), ctx, new InputEvent('beforeinput'))).toBe(true)
    expect(ctx.commandManager.handle()).toBe(true)
    expect(p.innerHTML).toBe('Hell A78<b>bold<i>I123</i></b>B12')
  })

  test('deleteContentForward', async () => {
    const editor = await initEditor('<et-p>Hello A78<b>bold<i>I123</i></b>B12</et-p>')
    const ctx = editor.context as Et.UpdatedContext
    const body = editor.bodyEl
    const p = body.children[0] as Et.EtParagraphElement

    // 测试光标在文本开头的情况
    ctx.setSelection(cr.caretIn(p.firstChild as Et.Text, 0))
    expect(deleteContentForward(ctx.effectInvoker.getEtElCtor(p), ctx, new InputEvent('beforeinput'))).toBe(true)
    expect(ctx.commandManager.handle()).toBe(true)
    expect(p.innerHTML).toBe('ello A78<b>bold<i>I123</i></b>B12')
  })
})
