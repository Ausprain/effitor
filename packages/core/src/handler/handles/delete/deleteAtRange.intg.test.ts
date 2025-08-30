import { expect, test } from 'vitest'

import { initEditor, minifiedHtml } from '~/core/__tests__/shared.test'
import { Et } from '~/core/@types'

import { initContentsAndSetSelection } from '../__tests__/shared.test'
import { removeByTargetRange, removeRangingContents } from './deleteAtRange'

/**
 * each测试 handle delete range的执行结果, 光标位置, 及其撤回能力
 * @example
 * [
 *    `执行 handle 前编辑区内容及选区位置`,
 *    `执行 handle 后编辑区内容及光标位置`,
 *    `执行 handle 后光标所在节点的textContent, 用于判断一些合并情况是否按预期合并`
 * ]
 */
test.each([
  // 1. 选区范围在同一文本节点内
  [
    `<et-p>He^llo A|78<b>bold<i>I123</i></b>B12</et-p>`,
    `<et-p>He|78<b>bold<i>I123</i></b>B12</et-p>`,
    'He78',
  ],
  [
    `<et-p>Hello A78<b>^bold|<i>I123</i></b>B12</et-p>`,
    // `<et-p>Hello A78<b>|<i>I123</i></b>B12</et-p>`,
    `<et-p>Hello A78<b><i>|I123</i></b>B12</et-p>`, // EtCaret.toTextAffinity(), 让结束光标位置亲和到附近文本节点了
    'I123',
  ],
  // 1.1 删除文本节点, 连带删除祖先
  [
    `<et-p>Hello A78<b>bold<i>^I123|</i></b>B12</et-p>`,
    `<et-p>Hello A78<b>bold|</b>B12</et-p>`,
    'bold',
  ],
  [
    `<et-p>Hello A78<b><i>^I123|</i></b>B12</et-p>`,
    `<et-p>Hello A78|B12</et-p>`,
    `Hello A78B12`,
  ],
  // 1.2 不应连带删除段落
  [
    `<et-p>^Hello A78|</et-p>`,
    `<et-p>|</et-p>`,
    ``,
  ],
  // 2. 选区范围在同段落内跨节点
  [
    `<et-p>Hello A78<b>bo^ld<i>I123</i>|D12</b>B12</et-p>`,
    `<et-p>Hello A78<b>bo|D12</b>B12</et-p>`,
    `boD12`,
  ],
  [
    `<et-p>Hello A78<b>^bold<i>I1|23</i>D12</b>B12</et-p>`,
    `<et-p>Hello A78<b><i>|23</i>D12</b>B12</et-p>`,
    `23`,
  ],
  [
    `<et-p>Hello A78<b>^bold<i>I123</i>D12|</b>B12</et-p>`,
    `<et-p>Hello A78|B12</et-p>`,
    `Hello A78B12`,
  ],
  [
    `<et-p>Hello A78<b>^<i>I123</i>|</b>B12</et-p>`,
    `<et-p>Hello A78|B12</et-p>`,
    `Hello A78B12`,
  ],
  [
    `<et-p>Hello ^A78<b>bold<i>I123</i>D12</b>B1|2</et-p>`,
    `<et-p>Hello |2</et-p>`,
    `Hello 2`,
  ],
  [
    `<et-p>^Hello A78<b>bold<i>I123</i>D12</b>B12|</et-p>`,
    `<et-p>|</et-p>`,
    ``,
  ],
  // 3. 选区范围跨同层段落
  [`
    <et-p>Hello A78<b>bold<i>I123</i></b>B^12</et-p>
    <et-p>Hello A78<b>bold<i>I123</i></b>B1|2</et-p>
  `,
  `
    <et-p>Hello A78<b>bold<i>I123</i></b>B|2</et-p>
  `,
  'B2',
  ],
  [`
    <et-p>Hello ^A78<b>bold<i>I123</i></b>B12</et-p>
    <et-p>He|llo A78<b>bold<i>I123</i></b>B12</et-p>
  `,
  `
    <et-p>Hello |llo A78<b>bold<i>I123</i></b>B12</et-p>
  `,
  'Hello llo A78',
  ],
  [`
    <et-p>Hello A78<b>bo^ld<i>I123</i></b>B12</et-p>
    <et-p>He|llo A78<b>bold<i>I123</i></b>B12</et-p>
  `,
  `
    <et-p>Hello A78<b>bo|</b>llo A78<b>bold<i>I123</i></b>B12</et-p>
  `,
  'bo',
  ],
  [`
    <et-p>Hello A78<b>bold<i>I^123</i></b>B12</et-p>
    <et-p>Hello A78<b>bold<i>I|456</i></b>B12</et-p>
    <et-p>Hello A78<b>bold</b>B12</et-p>
  `,
  `
    <et-p>Hello A78<b>bold<i>I|456</i></b>B12</et-p>
    <et-p>Hello A78<b>bold</b>B12</et-p>
  `,
  'I456',
  ],
  // 4. 选区范围跨不同层段落
  // 4.1 不合并
  [`
    <et-bq>
      <et-p>Hello^ A78<b>bold<i>I123</i></b>B12</et-p>
      <list>
        <et-p>Hello A78<b>bold</b>B|12</et-p>
      </list>
    </et-bq>
  `,
  `
    <et-bq>
      <et-p>Hello|</et-p>
      <list>
        <et-p>12</et-p>
      </list>
    </et-bq>
  `,
  'Hello',
  ],
  // 4.2 连带删除后者空段落
  [`
    <et-bq>
      <list>
        <et-p>Hello^ A78<b>bold</b>B12</et-p>
        <et-p>World B78</et-p>
      </list>
      <et-p>Hello A78<b>bold<i>I123</i></b>B12|</et-p>
    </et-bq>
  `,
  `
    <et-bq>
      <list>
        <et-p>Hello|</et-p>
      </list>
    </et-bq>
  `,
  'Hello',
  ],
  [`
    <et-bq>
      <et-p>Hello^ A78<b>bold<i>I123</i></b>B12</et-p>
      <list>
        <et-p>Hello A78<b>bold</b>B12|</et-p>
      </list>
    </et-bq>
  `,
  `
    <et-bq>
      <et-p>Hello|</et-p>
    </et-bq>
  `,
  'Hello',
  ],
  // 4.3 后者段落并入前者顶层节点
  [`
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
        <et-p>Hello|12</et-p>
      </list>
    </et-bq>
  `,
  'Hello12',
  ],
  [`
    <et-bq>
      <et-p>Hello A78<b>bo^ld<i>I123</i></b>B12</et-p>
    </et-bq>
    <et-p>He|llo A78<b>bold</b>B12</et-p>
  `,
  `
    <et-bq>
      <et-p>Hello A78<b>bo|</b>llo A78<b>bold</b>B12</et-p>
    </et-bq>
  `,
  'bo',
  ],
  // 4.4 合并顶层节点
  [`
    <et-bq>
      <et-p>Hello A78<b>bold^123<i>I123</i></b>B12</et-p>
    </et-bq>
    <et-bq>
      <et-p><b>bold|789<i>I123</i></b>IJK</et-p>
      <et-p>Hello A78<b>bold</b>B12</et-p>
    </et-bq>
  `,
  `
    <et-bq>
      <et-p>Hello A78<b>bold|789<i>I123</i></b>IJK</et-p>
      <et-p>Hello A78<b>bold</b>B12</et-p>
    </et-bq>
  `,
  'bold789',
  ],

])('delete by range', async (input, output, destCaretContainerTextContent) => {
  input = minifiedHtml(input)
  output = minifiedHtml(output)

  const editor = await initEditor('')
  const ctx = editor.context as Et.UpdatedContext

  // 测试命令执行结果及光标落点位置的正确性
  initContentsAndSetSelection(ctx, input)
    .handleWith(() => {
      if (destCaretContainerTextContent === 'debug') {
        // debugger
      }
      expect(removeRangingContents(ctx)).toBe(true)
    })
    .handle(() => {
      expect(ctx.selection.range.startContainer.textContent).toBe(destCaretContainerTextContent)
    })
    .reveal((res) => {
      expect(res.success).toBe(true)
      expect(res.bodyHtmlWithCaret).toBe(output)
    })

  // 测试撤回后的内容及光标恢复的正确性
  initContentsAndSetSelection(ctx, input)
    .handleWith(() => {
      expect(removeRangingContents(ctx)).toBe(true)
    })
    .handle(() => {
      expect(ctx.selection.range.collapsed).toBe(true)
    })
    .restore((res) => {
      expect(res.success).toBe(true)
      expect(res.bodyOriginalHtml).toBe(input)
    })
})
