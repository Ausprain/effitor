import { describe, expect, test } from 'vitest'

import { initEditor } from '../../../__tests__/shared.test'
import type { Et } from '../../../@types'
import { cr } from '../../../selection'
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
    ctx.setSelection(cr.rangeAllIn(p.firstChild as any))
    expect(deleteContent.call(ctx.effectInvoker.getEtElCtor(p), ctx, { targetRange: ctx.selection.getTargetRange()! })).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    expect(p.innerHTML).toBe('<b>bold<i>I123</i></b>B12')
  })

  test('deleteContentBackward', async () => {
    const editor = await initEditor('<et-p>Hello A78<b>bold<i>I123</i></b>B12</et-p>')
    const ctx = editor.context as Et.UpdatedContext
    const body = editor.bodyEl
    const p = body.children[0] as Et.EtParagraphElement

    // 测试光标在文本末尾的情况
    ctx.setSelection(cr.caretIn(p.firstChild as Et.Text, 5)) // 在"Hello"后
    expect(deleteContentBackward.call(ctx.effectInvoker.getEtElCtor(p), ctx, { targetRange: ctx.selection.getTargetRange()! })).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    expect(p.innerHTML).toBe('Hell A78<b>bold<i>I123</i></b>B12')
  })

  test('deleteContentForward', async () => {
    const editor = await initEditor('<et-p>Hello A78<b>bold<i>I123</i></b>B12</et-p>')
    const ctx = editor.context as Et.UpdatedContext
    const body = editor.bodyEl
    const p = body.children[0] as Et.EtParagraphElement

    // 测试光标在文本开头的情况
    ctx.setSelection(cr.caretIn(p.firstChild as Et.Text, 0))
    expect(deleteContentForward.call(ctx.effectInvoker.getEtElCtor(p), ctx, { targetRange: ctx.selection.getTargetRange()! })).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    expect(p.innerHTML).toBe('ello A78<b>bold<i>I123</i></b>B12')
  })
})
