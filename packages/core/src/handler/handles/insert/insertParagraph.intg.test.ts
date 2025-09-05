import { describe, expect, suite, test } from 'vitest'

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
  // 1. 段落开头
  [
    `<et-p>|Hello A78<b>bold</b>B12</et-p>`,
    `
      <et-p><br></et-p>
      <et-p>|Hello A78<b>bold</b>B12</et-p>
    `,
    'Hello A78',
  ],
  [
    `<et-p><b><i>|Hello</i>A78bold</b>B12</et-p>`,
    `
      <et-p><br></et-p>
      <et-p><b><i>|Hello</i> A78bold</b>B12</et-p>
    `,
    'Hello',
  ],

  // 2. 段落末尾
  [
    `<et-p>Hello A78<b>bold</b>B12|</et-p>`,
    `
      <et-p>Hello A78<b>bold</b>B12</et-p>
      <et-p>|<br></et-p>
    `,
    '',
  ],
  [
    `<et-p>Hello A78<b>bold</b>B12|<br></et-p>`,
    `
      <et-p>Hello A78<b>bold</b>B12<br></et-p>
      <et-p>|<br></et-p>
    `,
    '',
  ],
  [
    `<et-p>Hello A78<b>bold|</b><br></et-p>`,
    `
      <et-p>Hello A78<b>bold</b><br></et-p>
      <et-p>|<br></et-p>
    `,
    '',
  ],

  // 3. 段落下文本节点边缘
  [
    `<et-p><i>italic</i>|Hello A78<b>bold</b><br></et-p>`,
    `
      <et-p><i>italic</i></et-p>
      <et-p>|Hello A78<b>bold</b><br></et-p>
    `,
    'Hello A78',
  ],
  [
    `<et-p>Hello A78|<b>bold</b><br></et-p>`,
    `
      <et-p>Hello A78</et-p>
      <et-p><b>|bold</b><br></et-p>
    `,
    'bold',
  ],

  // 4. 段落中间
  [
    `<et-p>Hello A78<b>bo|ld</b><br></et-p>`,
    `
      <et-p>Hello A78<b>bo</b></et-p>
      <et-p><b>|ld</b><br></et-p>
    `,
    'ld',
  ],
  [
    `<et-p>Hello A78<b>bo<i>AA</i>|ld</b><br></et-p>`,
    `
      <et-p>Hello A78<b>bo<i>AA</i></b></et-p>
      <et-p><b>|ld</b><br></et-p>
    `,
    'ld',
  ],
  [
    `<et-p>Hello A78<b>bo<i>AA|</i>ld</b><br></et-p>`,
    `
      <et-p>Hello A78<b>bo<i>AA</i></b></et-p>
      <et-p><b>|ld</b><br></et-p>
    `,
    'ld',
  ],
  [
    `<et-p>Hello A78<b>bo<i>AA|BB</i>ld</b><br></et-p>`,
    `
      <et-p>Hello A78<b>bo<i>AA</i></b></et-p>
      <et-p><b><i>|BB</i>ld</b><br></et-p>
    `,
    'BB',
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
          ctx.commonEtElement, 'EinsertParagraph', ctx, {
            targetRange: ctx.selection.getTargetRange()!,
          },
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
        expect(ctx.selection.getTargetRange()).not.toBe(null)
        ctx.effectInvoker.invoke(
          ctx.commonEtElement, 'EinsertParagraph', ctx, {
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

/**
 * each测试 handle insert的执行结果, 光标位置, 及其撤回能力
 * @example
 * [
 *    `插入段落前编辑区内容及选区位置`,
 *    `插入段落后编辑区内容及光标位置`,
 *    `插入段落后光标所在节点的textContent, 用于判断一些合并情况是否按预期合并`
 * ]
 */
suite.each([
  // 1. 选区范围在同一文本节点内
  [
    `<et-p>He^llo A|78<b>bold<i>I123</i></b>B12</et-p>`,
    `
      <et-p>He</et-p>
      <et-p>|78<b>bold<i>I123</i></b>B12</et-p>
    `,
    '78',
  ],
  [
    `<et-p>Hello A78<b>^bold|<i>I123</i></b>B12</et-p>`,
    // `<et-p>Hello A78<b><i>|I123</i></b>B12</et-p>`,
    `
      <et-p>Hello A78</et-p>
      <et-p><b><i>|I123</i></b>B12</et-p>
    `,
    'I123',
  ],
  // 1.1 删除文本节点, 连带删除祖先
  [
    `<et-p>Hello A78<b>bold<i>^I123|</i></b>B12</et-p>`,
    // `<et-p>Hello A78<b>bold|</b>B12</et-p>`,
    `
      <et-p>Hello A78<b>bold</b></et-p>
      <et-p>|B12</et-p>
    `,
    'B12',
  ],
  [
    `<et-p>Hello A78<b><i>^I123|</i></b>B13<br></et-p>`,
    // `<et-p>Hello A78|B13<br></et-p>`,
    `
      <et-p>Hello A78</et-p>
      <et-p>|B13<br></et-p>
    `,
    `B13`,
  ],
  // 自动添加尾 br
  [
    `<et-p>Hello A78<b><i>^I123|</i></b>B13</et-p>`,
    // `<et-p>Hello A78|B13</et-p>`,
    `
      <et-p>Hello A78</et-p>
      <et-p>|B13<br></et-p>
    `,
    `B13`,
  ],
  // 1.2 不应连带删除段落
  [
    `<et-p>^Hello A78|</et-p>`,
    // `<et-p>|</et-p>`,
    `
      <et-p></et-p>
      <et-p>|<br></et-p>
    `,
    ``,
  ],
  // 2. 选区范围在同段落内跨节点
  [
    `<et-p>Hello A78<b>bo^ld<i>I123</i>|D12</b>B12</et-p>`,
    // `<et-p>Hello A78<b>bo|D12</b>B12</et-p>`,
    `
      <et-p>Hello A78<b>bo</b></et-p>
      <et-p><b>|D12</b>B12</et-p>
    `,
    `D12`,
  ],
  [
    `<et-p>Hello A78<b>^bold<i>I1|23</i>D12</b>B12</et-p>`,
    //   `<et-p>Hello A78<b><i>|23</i>D12</b>B12</et-p>`,
    `
      <et-p>Hello A78</et-p>
      <et-p><b><i>|23</i>D12</b>B12</et-p>
    `,
    `23`,
  ],
  [
    `<et-p>Hello A78<b>^bold<i>I123</i>D12|</b>B12</et-p>`,
    //   `<et-p>Hello A78|B12</et-p>`,
    `
      <et-p>Hello A78</et-p>
      <et-p>|B12</et-p>
    `,
    `B12`,
  ],
  [
    `<et-p>Hello A78<b>^<i>I123</i>|</b>B12</et-p>`,
    //   `<et-p>Hello A78|B12</et-p>`,
    `
      <et-p>Hello A78</et-p>
      <et-p>|B12</et-p>
    `,
    `B12`,
  ],
  [
    `<et-p>Hello^A78<b>bold<i>I123</i>D12</b>B1|2</et-p>`,
    //   `<et-p>Hello|2</et-p>`,
    `
      <et-p>Hello</et-p>
      <et-p>|2<br></et-p>
    `,
    `2`,
  ],
  [
    `<et-p>^Hello A78<b>bold<i>I123</i>D12</b>B12|</et-p>`,
    //   `<et-p>|</et-p>`,
    `
      <et-p></et-p>
      <et-p>|<br></et-p>
    `,
    ``,
  ],
  // // 3. 选区范围跨同层段落
  [
    `
    <et-p>Hello A78<b>bold<i>I123</i></b>B^12</et-p>
    <et-p>Hello A78<b>bold<i>I123</i></b>B1|2</et-p>
    `,
    //     <et-p>Hello A78<b>bold<i>I123</i></b>B|2</et-p>
    `
      <et-p>Hello A78<b>bold<i>I123</i></b>B</et-p>
      <et-p>|2</et-p>
    `,
    `2`,
  ],
  [
    `
    <et-p>Hello^A78<b>bold<i>I123</i></b>B12</et-p>
    <et-p>He|llo A781<b>bold<i>I123</i></b>B12</et-p>
    `,
    //     <et-p>Hello |llo A781<b>bold<i>I123</i></b>B12</et-p>
    `
      <et-p>Hello</et-p>
      <et-p>|llo A781<b>bold<i>I123</i></b>B12</et-p>
    `,
    `llo A781`,
  ],
  [
    `
    <et-p>Hello A78<b>bo^ld<i>I123</i></b>B12</et-p>
    <et-p>He|llo A782<b>bold<i>I123</i></b>B12</et-p>
    `,
    //     <et-p>Hello A78<b>bo|</b>llo A78<b>bold<i>I123</i></b>B12</et-p>
    `
      <et-p>Hello A78<b>bo</b></et-p>
      <et-p>|llo A782<b>bold<i>I123</i></b>B12</et-p>
    `,
    `llo A782`,
  ],
  [
    `
    <et-p>Hello A78<b>bold<i>I^123</i></b>B12</et-p>
    <et-p>Hello A78<b>bold<i>I|456</i></b>B12</et-p>
    <et-p>Hello A78<b>bold</b>B12</et-p>
    `,
    //     <et-p>Hello A78<b>bold<i>I|456</i></b>B12</et-p>
    //     <et-p>Hello A78<b>bold</b>B12</et-p>
    `
      <et-p>Hello A78<b>bold<i>I</i></b></et-p>
      <et-p><b><i>|456</i></b>B12</et-p>
      <et-p>Hello A78<b>bold</b>B12</et-p>
    `,
    `456`,
  ],
  // // 4. 选区范围跨不同层段落
  // // 4.1 不合并
  [
    `
    <et-bq>
      <et-p>Hello^ A78<b>bold<i>I123</i></b>B12</et-p>
      <list>
        <et-p>Hello A78<b>bold</b>B|12</et-p>
      </list>
    </et-bq>
    `,
    //     <et-bq>
    //       <et-p>Hello|</et-p>
    //       <list>
    //         <et-p>12</et-p>
    //       </list>
    //     </et-bq>
    `
      <et-bq>
        <et-p>Hello</et-p>
        <list>
          <et-p>|12</et-p>
        </list>
      </et-bq>
    `,
    `12`,
  ],
  // // 4.2 连带删除后者空段落
  [
    `
    <et-bq>
      <list>
        <et-p>Hello^ A78<b>bold</b>B12</et-p>
        <et-p>World B78</et-p>
      </list>
      <et-p>Hello A78<b>bold<i>I123</i></b>B12|</et-p>
    </et-bq>
    `,
    //     <et-bq>
    //       <list>
    //         <et-p>Hello|</et-p>
    //       </list>
    //     </et-bq>
    `
      <et-bq>
        <list>
          <et-p>Hello</et-p>
          <et-p>|<br></et-p>
        </list>
      </et-bq>
    `,
    ``,
  ],
  [
    `
    <et-bq>
      <et-p>Hello^ A78<b>bold<i>I123</i></b>B12</et-p>
      <list>
        <et-p>Hello A78<b>bold</b>B12|</et-p>
      </list>
    </et-bq>
    `,
    //     <et-bq>
    //       <et-p>Hello|</et-p>
    //     </et-bq>
    `
      <et-bq>
        <et-p>Hello</et-p>
        <et-p>|<br></et-p>
      </et-bq>
    `,
    ``,
  ],
  // // 4.3 后者段落非空, 光标留在后者段落开头
  [
    `
      <et-bq>
        <list>
          <et-p>Hello^ A78<b>bold</b>B12</et-p>
          <et-p>World B78</et-p>
        </list>
        <et-p>Hello A78<b>bold<i>I123</i></b>B|12</et-p>
      </et-bq>
    `,
    `
      <et-bq>
        <list>
          <et-p>Hello</et-p>
        </list>
        <et-p>|12</et-p>
      </et-bq>
    `,
    `12`,
  ],
  [
    `
      <et-bq>
        <et-p>Hello A78<b>bo^ld<i>I123</i></b>B12</et-p>
      </et-bq>
      <et-p>He|llo A78<b>bold</b>B12</et-p>
    `,
    `
      <et-bq>
        <et-p>Hello A78<b>bo</b></et-p>
      </et-bq>
      <et-p>|llo A78<b>bold</b>B12</et-p>
    `,
    `llo A78`,
  ],
  // // 4.4 光标留在后者顶层节点内
  [
    `
      <et-bq>
        <et-p>Hello A78<b>bold^123<i>I123</i></b>B12</et-p>
        <et-p>Hello p2</et-p>
      </et-bq>
      <et-bq>
        <et-p><b>bold|789<i>I123</i></b>IJK</et-p>
        <et-p>Hello A78<b>bold</b>B12</et-p>
      </et-bq>
    `,
    `
      <et-bq>
        <et-p>Hello A78<b>bold</b></et-p>
      </et-bq>
      <et-bq>
        <et-p><b>|789<i>I123</i></b>IJK</et-p>
        <et-p>Hello A78<b>bold</b>B12</et-p>
      </et-bq>
    `,
    `789`,
  ],
])('insert paragraph at range', async (before, after, caretAtText) => {
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
          ctx.commonEtElement, 'EinsertParagraph', ctx, {
            targetRange: ctx.selection.getTargetRange()!,
          },
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
        expect(ctx.selection.getTargetRange()).not.toBe(null)
        ctx.effectInvoker.invoke(
          ctx.commonEtElement, 'EinsertParagraph', ctx, {
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
