/*

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

3. 光标在段落开头 Backspace {@link packages/core/src/handler/handles/no-standard/delete.ts backspaceAtParagraphStart}
  3.1 当前段落有前兄弟
      1) 段落为空, 删除(不设置结束光标), 光标移动到前兄弟末尾 (需判断前兄弟段落类型), true
      2) 与前兄弟相同, 删除当前, 智能移动内容到前兄弟末尾 (需要处理合并问题), true
      3) 前兄弟是 Component 段落, 光标移入 Component 的编辑区末尾, true
      4) 前兄弟是 Blockquote 段落
          a. 判断当前段落与 Blockquote 末段落相同, 合并
          b. 光标移入 Blockquote 的末段落末尾, true
      5) 克隆当前段落内容, 按效应规则过滤插入前兄弟末尾, true
  3.2 当前段落无前兄弟
      1) 当前段落是顶层节点 (无前兄弟)
          a. 段落非空 (编辑区开头 backspace), true
          b. 有后兄弟, 删除当前段落, 光标置于后兄弟开头 (需判断后兄弟的段落类型), true
          c. 无后兄弟
              是普通段落, true  (编辑区唯一段落)
              否则, 回退为普通段落, true
      2) 当前段落不是顶层节点
          A. 顶层节点无前兄弟(编辑区首节点)
              a. 段落非空, true
              b. 当前段落有后兄弟, 删除当前段落, 光标置于后兄弟开头 (需判断后兄弟段落类型), true
              c. 当前段落无后兄弟,
                  当前段落是顶层节点唯一段落, 顶层节点回退为普通段落, true
                  否则, false
          B. 顶层节点有前兄弟 prevTop
              a. 当前顶层节点与前兄弟相同, 合并, true
              b. 段落非空, 光标移动到 prevTop 末尾 (需判断段落类型), true
              c. 当前段落有后兄弟,
                  删除段落 (不设置结束光标位置), 将光标移动到 prevTop 末尾 (需判断段落类型), true
              d. 当前段落无后兄弟
                  删除顶层节点, 光标移动到 prevTop 末尾 (需判断段落类型), true

4. 光标在段落结尾 Delete {@link packages/core/src/handler/handles/no-standard/delete.ts deleteAtParagraphEnd}
  4.1 当前段落有后兄弟
      1) 段落为空, 移除(不设置结束光标), 光标移动到后兄弟开头
      2) 与后兄弟相同, 移除后兄弟, 智能移动内容到当前段落末尾 (自动处理合并问题), true
      3) 后兄弟是 Component 段落, 光标移入 Component 的编辑区开头, true
      4) 后兄弟是 Blockquote 段落, 光标移入 Blockquote 的首段落开头, true
      5) 克隆后兄弟内容, 按效应规则过滤插入当前段落末尾, true
  4.2 当前段落无后兄弟
      1) 当前段落是顶层节点 (无后兄弟)
          a. 段落非空 (编辑区末尾delete), true
          b. 有前兄弟, 删除当前, 光标置于前兄弟末尾 (需判断前兄弟段落类型) true
          c. 无前兄弟
              是普通段落, true (编辑区唯一段落)
              否则, 回退为普通段落, true
      2) 当前段落不是顶层节点
          A. 顶层节点无后兄弟(编辑区尾节点)
              a. 当前段落非空, true
              b. 当前段落有前兄弟, 删除当前段落, 光标置于前兄弟末尾 (需判断前兄弟段落类型), true
              c. 当前段落无前兄弟, true  (delete 不需要处理回退问题)
          B. 顶层节点有后兄弟 nextTop
              (不需要删除)
              a. 后兄弟是普通段落, 与当前段落相同, 合并, true
              b. 当前顶层节点与后段落相同, 合并, true
              c. 光标移动到 nextTop 开头 (需判断段落类型), true
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
  removeRangingContents,
} from './deleteAtRange'

/**
 * 删除当前选区内容 (Chrome ~137 无此 inputType)
 */
export const deleteContent = createInputEffectHandle((_this, ctx) => {
  return removeRangingContents(ctx)
})
/**
 * 删除光标后方(文档树前)一个字符, 或一个节点(当该节点是不可编辑或"整体"节点时)
 */
export const deleteContentBackward = createInputEffectHandle((_this, ctx) => {
  const tr = ctx.selection.getTargetRange()
  if (!tr) {
    return false
  }
  if (!tr.collapsed) {
    return removeByTargetRange(ctx, tr)
  }
  const tc = tr.toTargetCaret()
  return (
    // 光标在文本节点上
    checkBackspaceAtCaretDeleteText(ctx, tc, false)
    // 光标在段落开头?
    || checkBackspaceAtCaretDeleteParagraph(_this, ctx, tc)
    // 光标落在非文本节点边缘?
    || checkBackspaceAtCaretDeleteNode(ctx, tc)
    // 光标落在文本节点开头?
    || checkBackspaceAtCaretInTextStart(ctx, tc)
  )
})
/**
 * 删除光标前方(文档树后)一个字符, 或一个节点(当节点是不可编辑或"整体"节点时)
 */
export const deleteContentForward = createInputEffectHandle((_this, ctx) => {
  const tr = ctx.selection.getTargetRange()
  if (!tr) {
    return false
  }
  if (!tr.collapsed) {
    return removeByTargetRange(ctx, tr)
  }
  const tc = tr.toTargetCaret()
  return (
    // 光标在文本节点上
    checkDeleteAtCaretDeleteText(ctx, tc, false)
    // 光标在段落末尾
    || checkDeleteAtCaretDeleteParagraph(_this, ctx, tc)
    // 光标在非文本节点边缘
    || checkDeleteAtCaretDeleteNode(ctx, tc)
    // 光标落在文本节点末尾
    || checkDeleteAtCaretInTextEnd(ctx, tc)
  )
})
