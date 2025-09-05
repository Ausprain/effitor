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
 *    `段落开头`Backspace`前 编辑区内容及光标位置`,
 *    `段落开头`Backspace`后 编辑区内容及光标位置`,
 *    `段落开头`Backspace`后 光标所在节点的textContent, 用于判断一些合并情况是否按预期合并`
 * ]
 */
suite.each([
  // 1. 首段落开头, 啥也不做
  [
    `<et-p>|Hello A78<b>bold</b>B12</et-p>`,
    `
      <et-p>|Hello A78<b>bold</b>B12</et-p>
    `,
    'Hello A78',
  ],
  [
    `<et-p><b><i>|Hello</i>A78bold</b>B12</et-p>`,
    `
      <et-p><b><i>|Hello</i> A78bold</b>B12</et-p>
    `,
    'Hello',
  ],
  // 1.1 首段落是非普通空段落, 回退为普通段落
  [
    `
      <et-bq>
        <et-p>|<br></et-p>
      </et-bq>
      <et-p><br></et-p>
    `,
    `
      <et-p>|<br></et-p>
      <et-p><br></et-p>
    `,
    '',
  ],

  // 2. 删除当前
  [
    `<et-p>Hello A78<b>bold</b>B12</et-p>
     <et-p>|<br></et-p>`,
    `
      <et-p>Hello A78<b>bold</b>B12|</et-p>
    `,
    'B12',
  ],
  // 并入上一段落末尾
  [
    `<et-p>Hello A78<b>bold</b>B12</et-p>
     <et-p>|Hello A78<b>bold</b>B12</et-p>`,
    `
      <et-p>Hello A78<b>bold</b>B12|Hello A78<b>bold</b>B12</et-p>
    `,
    'B12Hello A78',
  ],
  // 自动删除尾 br
  [
    `<et-p>Hello A78<b>bold</b>B##<br></et-p>
     <et-p>|Hello A78<b>bold</b>B##</et-p>`,
    `
      <et-p>Hello A78<b>bold</b>B##|Hello A78<b>bold</b>B##</et-p>
    `,
    'B##Hello A78',
  ],

  // 3. 普通段落并入上一相同段落
  [
    `
      <et-bq>
        <et-p>Hello A78<b>bold</b>B12</et-p>
      </et-bq>
      <et-p>|Hello A78<b>bold</b>B13</et-p>
    `,
    `
      <et-bq>
        <et-p>Hello A78<b>bold</b>B12|Hello A78<b>bold</b>B13</et-p>
      </et-bq>
    `,
    'B12Hello A78',
  ],

  // 4. 删除空段落
  [
    `
      <et-bq>
        <et-p>Hello A78<b>bold</b>B12</et-p>
      </et-bq>
      <et-p>|<br></et-p>
    `,
    `
      <et-bq>
        <et-p>Hello A78<b>bold</b>B12|</et-p>
      </et-bq>
    `,
    'B12',
  ],
  [
    `
      <et-p>AA<br></et-p>
      <et-bq>
        <et-p>|<br></et-p>
        <et-p>Hello A78<b>bold</b>B12</et-p>
      </et-bq>
    `,
    `
      <et-p>AA|<br></et-p>
      <et-bq>
        <et-p>Hello A78<b>bold</b>B12</et-p>
      </et-bq>
    `,
    'AA',
  ],
  // 无前段落, 光标置于后段落开头
  [
    `
      <et-bq>
        <et-p>|<br></et-p>
        <et-p>Hello<b>bold</b>B12</et-p>
      </et-bq>
      <et-p><br></et-p>
    `,
    `
      <et-bq>
        <et-p>|Hello<b>bold</b>B12</et-p>
      </et-bq>
      <et-p><br></et-p>
    `,
    'Hello',
  ],
  // 5. 连带删除顶层节点
  [
    `
      <et-p><br></et-p>
      <et-bq>
        <et-p>|<br></et-p>
      </et-bq>
    `,
    `
      <et-p>|<br></et-p>
    `,
    '',
  ],
  // 6. 合并顶层节点
  [
    `
      <et-bq>
        <et-p>AA<b>BB</b><br></et-p>
      </et-bq>
      <et-bq>
        <et-p>|CC<br></et-p>
      </et-bq>
    `,
    `
      <et-bq>
        <et-p>AA<b>BB|</b>CC<br></et-p>
      </et-bq>
    `,
    'BB',
  ],

])('Backspace at paragraph start', async (before, after, caretAtText) => {
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
        expect(ctx.selection.getTargetCaret()).not.toBe(null)
        ctx.effectInvoker.invoke(
          ctx.commonEtElement, 'BackspaceAtParagraphStart', ctx, ctx.selection.getTargetCaret()!,
        )
      })
      .handle(() => {
        expect(ctx.selection.range.startContainer.textContent).toBe(caretAtText)
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
        expect(ctx.selection.getTargetCaret()).not.toBe(null)
        ctx.effectInvoker.invoke(
          ctx.commonEtElement, 'BackspaceAtParagraphStart', ctx, ctx.selection.getTargetCaret()!,
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

/**
 * each测试 handle insert的执行结果, 光标位置, 及其撤回能力
 * @example
 * [
 *    `段落末尾`Delete`前 编辑区内容及光标位置`,
 *    `段落末尾`Delete`后 编辑区内容及光标位置`,
 *    `段落末尾`Delete`后 光标所在节点的textContent, 用于判断一些合并情况是否按预期合并`
 * ]
 */
suite.each([
  // 1. 末段落末尾, 啥也不做
  [
    `
      <et-p>AAA</et-p>
      <et-p>Hello A78<b>bold</b>B12|</et-p>
    `,
    `
      <et-p>AAA</et-p>
      <et-p>Hello A78<b>bold</b>B12|</et-p>
    `,
    'B12',
  ],
  [
    `
      <et-p>AAA</et-p>
      <et-p>Hello A78<b>bold</b>B12|<br></et-p>
    `,
    `
      <et-p>AAA</et-p>
      <et-p>Hello A78<b>bold</b>B12|<br></et-p>
    `,
    'B12',
  ],
  [
    `
      <et-p>AAA</et-p>
      <et-p>Hello A78<b>bold|</b><br></et-p>
    `,
    `
      <et-p>AAA</et-p>
      <et-p>Hello A78<b>bold|</b><br></et-p>
    `,
    'bold',
  ],
  // 1.1 末尾非普通空段落, 回退为普通段落
  [
    `
      <et-p><br></et-p>
      <et-bq>
        <et-p>|<br></et-p>
      </et-bq>
    `,
    `
      <et-p><br></et-p>
      <et-p>|<br></et-p>
    `,
    '',
  ],

  // 2. 删除当前
  [
    `
      <et-p>|<br></et-p>
      <et-p>Hello<b>bold</b>B12</et-p>
     `,
    `
      <et-p>|Hello<b>bold</b>B12</et-p>
    `,
    'Hello',
  ],
  // 并入下一段落开头
  [
    `<et-p>Hello<b>bold</b>B12|<br></et-p>
     <et-p>Hello<b>bold</b>B12</et-p>`,
    `
      <et-p>Hello<b>bold</b>B12|Hello<b>bold</b>B12</et-p>
    `,
    'B12Hello',
  ],

  // 3. 光标移动到下一顶层节点内开头
  [
    `
      <et-p>Hello<b>bold</b>B13|<br></et-p>
      <et-bq>
        <et-p>Hello<b>bold</b>B12</et-p>
      </et-bq>
    `,
    `
      <et-p>Hello<b>bold</b>B13<br></et-p>
      <et-bq>
        <et-p>|Hello<b>bold</b>B12</et-p>
      </et-bq>
    `,
    'Hello',
  ],

  // 4. 删除空段落
  [
    `
      <et-p>|<br></et-p>
      <et-bq>
        <et-p>Hello<b>bold</b>B12</et-p>
      </et-bq>
    `,
    `
      <et-bq>
        <et-p>|Hello<b>bold</b>B12</et-p>
      </et-bq>
    `,
    'Hello',
  ],
  [
    `
      <et-bq>
        <et-p>Hello A78<b>bold</b>B12</et-p>
        <et-p>|<br></et-p>
      </et-bq>
      <et-p>AA<br></et-p>
    `,
    `
      <et-bq>
        <et-p>Hello A78<b>bold</b>B12</et-p>
        <et-p>|AA<br></et-p>
      </et-bq>
    `,
    'AA',
  ],
  // 无后段落, 光标置于前段落末尾
  [
    `
    <et-p>AA<br></et-p>
      <et-bq>
        <et-p>Hello<b>bold</b>Bzz</et-p>
        <et-p>|<br></et-p>
      </et-bq>
    `,
    `
      <et-p>AA<br></et-p>
      <et-bq>
        <et-p>Hello<b>bold</b>Bzz|</et-p>
      </et-bq>
    `,
    'Bzz',
  ],
  // 5. 删除后一空段落

  [
    `
      <et-p>AA|<br></et-p>
      <et-bq>
        <et-p><br></et-p>
      </et-bq>
    `,
    `
      <et-p>AA|<br></et-p>
    `,
    'AA',
  ],
  // 6. 合并顶层节点
  [
    `
      <et-bq>
        <et-p>AA<b>BB|</b><br></et-p>
      </et-bq>
      <et-bq>
        <et-p>CC<br></et-p>
      </et-bq>
    `,
    // 由于是 Delete 前向删除, 光标优先定位于后段落
    `
      <et-bq>
        <et-p>AA<b>BB</b>|CC<br></et-p>
      </et-bq>
    `,
    'CC',
  ],

])('Delete at paragraph end', async (before, after, caretAtText) => {
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
        expect(ctx.selection.getTargetCaret()).not.toBe(null)
        ctx.effectInvoker.invoke(
          ctx.commonEtElement, 'DeleteAtParagraphEnd', ctx, ctx.selection.getTargetCaret()!,
        )
      })
      .handle(() => {
        expect(ctx.selection.range.startContainer.textContent).toBe(caretAtText)
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
        expect(ctx.selection.getTargetCaret()).not.toBe(null)
        ctx.effectInvoker.invoke(
          ctx.commonEtElement, 'DeleteAtParagraphEnd', ctx, ctx.selection.getTargetCaret()!,
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
