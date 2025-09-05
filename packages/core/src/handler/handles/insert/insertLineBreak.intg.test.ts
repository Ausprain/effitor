import { expect, suite, test } from 'vitest'

import { initEditor, minifiedHtml } from '../../../__tests__/shared.test'
import type { Et } from '../../../@types'
import { EtBlockquote } from '../../../element'
import { registerEtElement } from '../../../element/register'
import { initContentsAndSetSelection } from '../__tests__/shared.test'

/**
 * each测试 handle insert的执行结果, 光标位置, 及其撤回能力
 * @example
 * [
 *    `插入段落前编辑区内容及光标位置`,
 *    `插入段落后编辑区内容及光标位置`,
 *    `插入段落后光标所在节点的textContent, 用于判断一些合并情况是否按预期合并`
 * ]
 */
suite.each([
  // 1. 段落末尾/开头
  [
    `<et-p>Hello|</et-p>`,
    `
      <et-p>Hello<br>|<br></et-p>
    `,
    '',
  ],
  [
    `<et-p>|Hello A78<b>bold</b>B12</et-p>`,
    `
      <et-p><br>|Hello A78<b>bold</b>B12<br></et-p>
    `,
    'Hello A78',
  ],
  // 2. 段落中间
  [
    `<et-p>Hello<b>bo|ld</b>A78</et-p>`,
    `
      <et-p>Hello<b>bo</b><br><b>|ld</b>A78<br></et-p>
    `,
    'ld',
  ],

])('insert paragraph at caret', async (before, after, caretAtText) => {
  await Promise.resolve().then(() => registerEtElement(EtBlockquote))
  const editor = await initEditor('', {
    config: {
      INSERT_BR_FOR_LINE_BREAK: true,
    },
  })
  const ctx = editor.context as Et.UpdatedContext

  before = minifiedHtml(before)
  after = minifiedHtml(after)

  test('handle successfully and dest caret correct', () => {
    initContentsAndSetSelection(ctx, before)
      .handleWith(() => {
        if (caretAtText === 'debug') {
          // debugger
        }
        expect(ctx.selection.getTargetRange()).not.toBe(null)
        ctx.effectInvoker.invoke(
          ctx.commonEtElement, 'EinsertLineBreak', ctx, {
            targetRange: ctx.selection.getTargetRange()!,
          },
        )
      })
      .handle(() => {
        // expect(ctx.selection.range.startContainer.textContent).toBe(caretAtText)
      })
      .reveal((res) => {
        // expect(res.success).toBe(true)
        expect(res.bodyHtmlWithCaret).toBe(after)
      })
  })

  test('restore successfully', () => {
    initContentsAndSetSelection(ctx, before)
      .handleWith(() => {
        if (caretAtText === 'debug') {
          // debugger
        }
        expect(ctx.selection.getTargetRange()).not.toBe(null)
        ctx.effectInvoker.invoke(
          ctx.commonEtElement, 'EinsertLineBreak', ctx, {
            targetRange: ctx.selection.getTargetRange()!,
          },
        )
      })
      .handle(() => {
        expect(ctx.selection.range.collapsed).toBe(true)
      })
      .restore((res) => {
        // expect(res.success).toBe(true)
        expect(res.bodyOriginalHtml).toBe(before)
      })
  })
})
