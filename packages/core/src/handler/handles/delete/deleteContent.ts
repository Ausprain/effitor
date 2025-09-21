/**

删除逻辑

1. 选区 range 状态, 删除 range 内容

2. 选区 caret 状态
  2.1 光标在文本节点中间, 删除一个"视觉字符" (被删除的字符串.length >=1 )
  2.2 光标在段落开头Backspace, 3
  2.3 光标在段落结尾Delete, 4
  2.4 光标在文本节点边缘, 扩展选区, 删除 range 内容
      扩展算法: 先 modify 往前跳一个 character 再往回 extend 一个 character,
        避免直接往前 extend 一个 character 时将当前节点也包含在 range 内
        ps. 2.1 不使用此方法是因为 modify 方法太耗性能(每次调用都会计算布局)
  2.5 光标在节点边缘, 删除前/后方节点 (光标能落在该节点边缘, 说明该节点不可编辑, 整体删除)

3. 光标在段落开头 Backspace {@link "./deleteParagraph.ts" backspaceAtParagraphStart}

4. 光标在段落结尾 Delete {@link "./deleteParagraph.ts" deleteAtParagraphEnd}

*/

import { createInputEffectHandle } from '../../utils'
import {
  checkBackspaceAtCaretDeleteNode,
  checkBackspaceAtCaretDeleteParagraph,
  checkBackspaceAtCaretDeleteText,
  checkBackspaceAtCaretInTextStart,
  checkDeleteAtCaretDeleteNode,
  checkDeleteAtCaretDeleteParagraph,
  checkDeleteAtCaretDeleteText,
  checkDeleteAtCaretInTextEnd,
} from './deleteAtCaret'
import {
  removeByTargetRange,
} from './deleteAtRange'

/**
 * 删除当前选区内容 (Chrome ~137 无此 inputType)
 */
export const deleteContent = createInputEffectHandle((_that, ctx, pl) => {
  if (pl.targetRange.collapsed) {
    return true
  }
  return removeByTargetRange(ctx, pl.targetRange)
})
/**
 * 删除光标后方(文档树前)一个字符, 或一个节点(当该节点是不可编辑或"整体"节点时)
 */
export const deleteContentBackward = createInputEffectHandle((_that, ctx, pl) => {
  ctx.setCaretAffinityPreference(true)
  if (!pl.targetRange.collapsed) {
    return removeByTargetRange(ctx, pl.targetRange)
  }
  const tc = pl.targetRange.toTargetCaret()
  return (
    // 光标在文本节点上
    checkBackspaceAtCaretDeleteText(ctx, tc, false)
    // 光标在段落开头?
    || checkBackspaceAtCaretDeleteParagraph(_that, ctx, tc)
    // 光标落在非文本节点边缘?
    || checkBackspaceAtCaretDeleteNode(ctx, tc)
    // 光标落在文本节点开头?
    || checkBackspaceAtCaretInTextStart(ctx, tc)
  )
})
/**
 * 删除光标前方(文档树后)一个字符, 或一个节点(当节点是不可编辑或"整体"节点时)
 */
export const deleteContentForward = createInputEffectHandle((_that, ctx, pl) => {
  ctx.setCaretAffinityPreference(false)
  if (!pl.targetRange.collapsed) {
    return removeByTargetRange(ctx, pl.targetRange)
  }
  const tc = pl.targetRange.toTargetCaret()
  return (
    // 光标在文本节点上
    checkDeleteAtCaretDeleteText(ctx, tc, false)
    // 光标在段落末尾
    || checkDeleteAtCaretDeleteParagraph(_that, ctx, tc)
    // 光标在非文本节点边缘
    || checkDeleteAtCaretDeleteNode(ctx, tc)
    // 光标落在文本节点末尾
    || checkDeleteAtCaretInTextEnd(ctx, tc)
  )
})
