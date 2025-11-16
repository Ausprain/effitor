import { describe, expect, suite, test } from 'vitest'

import { initEditor, minifiedHtml } from '../../../__tests__/shared.test'
import type { Et } from '../../../@types'
import { EtBlockquote } from '../../../element'
import { registerEtElement } from '../../../element/register'
import { initContentsAndSetSelection } from '../__tests__/shared.test'
import { insertContentsAtCaret, insertContentsAtCaretTemporarily } from './insert.shared'

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
suite.each([
  // 1. 插入文本
  [
    `<et-p>He|12<b>bold<i>I123</i></b>B12</et-p>`,
    'I123',
    `<et-p>HeI123|12<b>bold<i>I123</i></b>B12</et-p>`,
    'HeI12312',
  ],
  // 2. 插入节点
  // [
  //   `<et-p>He|12<b>bold<i>I123</i></b>B12</et-p>`,
  //   '<i>II</i>',
  //   `<et-p>He<i>II|</i>12<b>bold<i>I123</i></b>B12</et-p>`,
  //   'II',
  // ],
  // [
  //   `<et-p>He12<b>bo|ld<i>I123</i></b>B12</et-p>`,
  //   '<i>II</i>',
  //   `<et-p>He12<b>bo<i>II|</i>ld<i>I123</i></b>B12</et-p>`,
  //   'II',
  // ],
  // 3. 插入片段 (不含段落)
  // 3.1 直插
  [
    `<et-p>|</et-p>`,
    '<i>II</i><b>AA</b>',
    `<et-p><i>II</i><b>AA|</b></et-p>`,
    'AA',
  ],
  // 3.2 拆文本
  [
    `<et-p>He|12<b>bold<i>I123</i></b>B12</et-p>`,
    '<i>II</i><b>AA</b>',
    `<et-p>He<i>II</i><b>AA</b>|12<b>bold<i>I123</i></b>B12</et-p>`,
    '12',
  ],
  // 3.3 拆节点
  [
    `<et-p>He12<b>bold<i>I|123</i></b>B12</et-p>`,
    '<i>II</i><b>AA</b>',
    `<et-p>He12<b>bold<i>I</i></b><i>II</i><b>AA|<i>123</i></b>B12</et-p>`,
    'AA',
  ],
  // 4. 插入片段, 普通段落
  [
    `<et-p>He12<b>bold<i>I123</i></b>|B12<b>ZZ</b></et-p>`,
    '<et-p>AA</et-p><et-p>BB</et-p>',
    `<et-p>He12<b>bold<i>I123</i></b>AA</et-p><et-p>BB|B12<b>ZZ</b></et-p>`,
    'BBB12',
  ],
  // 5. 插入片段, 含特殊段落
  [
    `<et-p>He12<b>bold<i>I123</i></b>|B12<b>ZZ</b></et-p>`,
    `
      <et-p>AA</et-p>
      <et-bq>
        <et-p>BB</et-p>
      </et-bq>
    `,
    `
      <et-p>He12<b>bold<i>I123</i></b>AA</et-p>
      <et-bq>
        <et-p>BB</et-p>
      </et-bq>
      <et-p>|B12<b>ZZ</b></et-p>
    `,
    'B12',
  ],
  [
    `<et-p>He12<b>bold<i>I123</i></b>|B12<b>ZZ</b></et-p>`,
    `
      <et-bq>
        <et-p>BB</et-p>
      </et-bq>
      <et-p>AA</et-p>
    `,
    `
      <et-p>He12<b>bold<i>I123</i></b></et-p>
      <et-bq>
        <et-p>BB</et-p>
      </et-bq>
      <et-p>AA|B12<b>ZZ</b></et-p>
    `,
    'AAB12',
  ],
  [
    `<et-p>He12<b>bold<i>I123</i></b>|B12<b>ZZ</b></et-p>`,
    `
      <et-bq><et-p>AA</et-p></et-bq>
      <et-bq><et-p>BB</et-p></et-bq>
    `,
    `
      <et-p>He12<b>bold<i>I123</i></b></et-p>
      <et-bq><et-p>AA</et-p></et-bq>
      <et-bq><et-p>BB</et-p></et-bq>
      <et-p>|B12<b>ZZ</b></et-p>
    `,
    'B12',
  ],
  [
    `
      <et-bq>
        <et-p>He12<b>bold<i>I123</i></b>|B12<b>ZZ</b></et-p>
      </et-bq>
    `,
    `
      <et-p>AA</et-p>
      <et-p>BB</et-p>
    `,
    `
      <et-bq>
        <et-p>He12<b>bold<i>I123</i></b>AA</et-p>
        <et-p>BB|B12<b>ZZ</b></et-p>
      </et-bq>
    `,
    'BBB12',
  ],
  [
    `
      <et-p>He12<b>bold<i>I123</i></b>|B12<b>ZZ</b></et-p>
    `,
    `
      <et-p>AA</et-p>
      <et-bq><et-p>BB</et-p></et-bq>
    `,
    `
      <et-p>He12<b>bold<i>I123</i></b>AA</et-p>
      <et-bq>
        <et-p>BB</et-p>
      </et-bq>
      <et-p>|B12<b>ZZ</b></et-p>
    `,
    'B12',
  ],
  // 6. 插入片段, 拆顶层节点
  [
    `
      <et-bq>
        <et-p>He12<b>bold<i>I123</i></b>|B12<b>ZZ</b></et-p>
      </et-bq>
    `,
    `
      <et-bq><et-p>AA</et-p></et-bq>
      <et-bq><et-p>BB</et-p></et-bq>
    `,
    `
      <et-bq>
        <et-p>He12<b>bold<i>I123</i></b>AA</et-p>
      </et-bq>
      <et-bq>
        <et-p>BB|B12<b>ZZ</b></et-p>
      </et-bq>
    `,
    'BBB12',
  ],
  [
    `
      <et-bq>
        <et-p>He12<b>bold<i>I123</i></b>|B12<b>ZZ</b></et-p>
      </et-bq>
    `,
    `
      <et-p>AA</et-p>
      <et-bq><et-p>BB</et-p></et-bq>
    `,
    `
      <et-bq>
        <et-p>He12<b>bold<i>I123</i></b>AA</et-p>
      </et-bq>
      <et-bq>
        <et-p>BB|B12<b>ZZ</b></et-p>
      </et-bq>
    `,
    'BBB12',
  ],

])('insert contents at caret', async (before, insert, after, caretAtText) => {
  await Promise.resolve().then(() => registerEtElement(EtBlockquote))
  const editor = await initEditor('')
  const ctx = editor.context as Et.UpdatedContext

  before = minifiedHtml(before)
  insert = minifiedHtml(insert)
  after = minifiedHtml(after)

  test('handle successfully and dest caret correct', () => {
    const df = ctx.createFragment(insert)
    initContentsAndSetSelection(ctx, before)
      .handleWith(() => {
        if (caretAtText === 'debug') {
          // debugger
        }
        expect(ctx.selection.getTargetCaret()).not.toBe(null)
        insertContentsAtCaret(ctx, df, ctx.selection.getTargetCaret()!)
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
    const df = ctx.createFragment(insert)
    initContentsAndSetSelection(ctx, before)
      .handleWith(() => {
        if (caretAtText === 'debug') {
          // debugger
        }
        expect(ctx.selection.getTargetCaret()).not.toBe(null)
        insertContentsAtCaret(ctx, df, ctx.selection.getTargetCaret()!)
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

suite.each([
  // 1. 插入文本
  [
    `<et-p>He|12<b>bold<i>I123</i></b>B12</et-p>`,
    'I123',
    `<et-p>HeI123|12<b>bold<i>I123</i></b>B12</et-p>`,
    'HeI12312',
  ],
  // 2. 插入节点
  [
    `<et-p>He|12<b>bold<i>I123</i></b>B12</et-p>`,
    '<i>II</i>',
    `<et-p>He<i>II|</i>12<b>bold<i>I123</i></b>B12</et-p>`,
    'II',
  ],
  [
    `<et-p>He12<b>bo|ld<i>I123</i></b>B12</et-p>`,
    '<i>II</i>',
    `<et-p>He12<b>bo<i>II|</i>ld<i>I123</i></b>B12</et-p>`,
    'II',
  ],
  // 3. 插入片段 (不含段落)
  // 3.1 直插
  [
    `<et-p>|</et-p>`,
    '<i>II</i><b>AA</b>',
    `<et-p><i>II</i><b>AA|</b></et-p>`,
    'AA',
  ],
  // 3.2 拆文本
  [
    `<et-p>He|12<b>bold<i>I123</i></b>B12</et-p>`,
    '<i>II</i><b>AA</b>',
    `<et-p>He<i>II</i><b>AA|</b>12<b>bold<i>I123</i></b>B12</et-p>`,
    'AA',
  ],
  // 3.3 temporary 插入不拆节点, 不处理合并
  [
    `<et-p>He12<b>bold<i>I|123</i></b>B12</et-p>`,
    '<i>II</i><b>AA</b>',
    `<et-p>He12<b>bold<i>I<i>II</i><b>AA|</b>123</i></b>B12</et-p>`,
    'AA',
  ],

])('insert contents at caret temporarily', async (before, insert, after, caretAtText) => {
  await Promise.resolve().then(() => registerEtElement(EtBlockquote))
  const editor = await initEditor('')
  const ctx = editor.context as Et.UpdatedContext

  before = minifiedHtml(before)
  insert = minifiedHtml(insert)
  after = minifiedHtml(after)

  test('handle successfully and dest caret correct', () => {
    const df = ctx.createFragment(insert)
    initContentsAndSetSelection(ctx, before)
      .handleWith(() => {
        if (caretAtText === 'debug') {
          // debugger
        }
        expect(ctx.selection.getTargetCaret()).not.toBe(null)
        insertContentsAtCaretTemporarily(ctx, df, ctx.selection.getTargetCaret()!)
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
    const df = ctx.createFragment(insert)
    initContentsAndSetSelection(ctx, before)
      .handleWith(() => {
        if (caretAtText === 'debug') {
          // debugger
        }
        expect(ctx.selection.getTargetCaret()).not.toBe(null)
        insertContentsAtCaretTemporarily(ctx, df, ctx.selection.getTargetCaret()!)
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
