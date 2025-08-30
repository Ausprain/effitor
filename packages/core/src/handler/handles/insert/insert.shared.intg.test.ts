import { expect, test } from 'vitest'

import { initEditor } from '~/core/__tests__/shared.test'
import { Et } from '~/core/@types'

import { initContentsAndSetSelection } from '../__tests__/shared.test'
import { insertContentsAtCaret } from './insert.shared'

/**
 * each测试 handle insert的执行结果, 光标位置, 及其撤回能力
 * @example
 * [
 *    `执行 handle 前编辑区内容及选区位置`,
 *    `要插入的内容`,
 *    `执行 handle 后编辑区内容及光标位置`,
 *    `执行 handle 后光标所在节点的textContent, 用于判断一些合并情况是否按预期合并`
 * ]
 */
test.each([
  [
    `<et-p>He|12<b>bold<i>I123</i></b>B12</et-p>`,
    'I123',
    `<et-p>HeI123|12<b>bold<i>I123</i></b>B12</et-p>`,
    'HeI12312',
  ],
])('insert', async (before, insert, after, caretAtText) => {
  const editor = await initEditor('')
  const ctx = editor.context as Et.UpdatedContext

  const df = ctx.createFragment(insert)

  initContentsAndSetSelection(ctx, before)
    .handleWith(() => {
      insertContentsAtCaret(ctx, df, ctx.selection.getTargetCaret()!)
    })
    .handle(() => {
      expect(ctx.selection.range.startContainer.textContent).toBe(caretAtText)
    })
    .reveal((res) => {
      expect(res.success).toBe(true)
      expect(res.bodyHtmlWithCaret).toBe(after)
    })
})
