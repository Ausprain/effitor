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

3. 光标在段落开头 Backspace
  3.1 当前段落有前兄弟
      1) 段落为空, 删除(不设置结束光标), 光标移动到前兄弟末尾 (需判断前兄弟段落类型), true
      2) 与前兄弟相同, 删除当前, 智能移动内容到前兄弟末尾 (需要处理合并问题), true
      3) 前兄弟是 Component 段落, 光标移入 Component 的编辑区末尾, true
      4) 前兄弟是 Blockquote 段落, 光标移入 Blockquote 的末段落末尾, true
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
              a. 段落非空, 光标移动到 prevTop 末尾 (需判断段落类型), true
              b. 当前段落有后兄弟,
                  删除段落 (不设置结束光标位置), 将光标移动到 prevTop 末尾 (需判断段落类型), true
              c. 当前段落无后兄弟
                  删除顶层节点, 光标移动到 prevTop 末尾 (需判断段落类型), true

4. 光标在段落结尾 Delete
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
              a. 光标移动到 nextTop 开头 (需判断段落类型), true
*/

import type { Et } from '~/core/@types'
import { etcode } from '~/core/element'
import { EtTypeEnum } from '~/core/enums'
import { cr } from '~/core/selection'

import { cmd } from '../../command'
import { createEffectHandle, createInputEffectHandle } from '../../config'
import { checkEqualParagraphAndSmartMerge, removeByTargetRange, removeParagraphAndMergeCloneContentsToOther } from './shared'

/**
 * 删除当前选区内容 (Chrome ~137 无此 inputType)
 */
export const deleteContent = createInputEffectHandle((_this, ctx) => {
  if (ctx.selection.isCollapsed) {
    return false
  }
  removeByTargetRange(ctx, ctx.selection.range)
  return false
})
/**
 * 删除光标后方(文档树前)一个字符, 或一个节点(当该节点是不可编辑或"整体"节点时)
 */
export const deleteContentBackward = createInputEffectHandle((_this, ctx) => {
  if (!ctx.selection.isCollapsed) {
    return removeByTargetRange(ctx, ctx.selection.range)
  }
  return checkBackspaceAtCaretDeleteText(ctx, false)
    // 光标在段落开头?
    || checkBackspaceAtCaretDeleteParagraph(_this, ctx)
    // 光标落在非文本节点边缘?
    || checkBackspaceAtCaretDeleteNode(ctx)
    // 光标落在文本节点开头?
    || checkBackspaceAtCaretInTextStart(ctx)
})
/**
 * 删除光标前方(文档树后)一个字符, 或一个节点(当节点是不可编辑或"整体"节点时)
 */
export const deleteContentForward = createInputEffectHandle((_this, ctx) => {
  if (!ctx.selection.isCollapsed) {
    return removeByTargetRange(ctx, ctx.selection.range)
  }
  return checkDeleteAtCaretDeleteText(ctx, false)
    // 光标在段落末尾
    || checkDeleteAtCaretDeleteParagraph(_this, ctx)
    // 光标在非文本节点边缘
    || checkDeleteAtCaretDeleteNode(ctx)
    // 光标落在文本节点末尾
    || checkDeleteAtCaretInTextEnd(ctx)
})

export const checkBackspaceAtCaretDeleteText = (ctx: Et.UpdatedContext, deleteWord: boolean) => {
  const removeChar = deleteWord ? ctx.selection.precedingWord : ctx.selection.precedingChar
  if (!removeChar) {
    return false
  }
  // anchorText必定存在且 anchorOffset不为 0
  ctx.commandManager.push(cmd.deleteText({
    text: ctx.selection.anchorText as Et.Text,
    data: removeChar,
    offset: ctx.selection.anchorOffset - removeChar.length,
    isBackward: true,
    setCaret: true,
  }))
  return true
}
export const checkBackspaceAtCaretDeleteParagraph = (
  _this: Et.EffectHandleThis, ctx: Et.UpdatedContext,
) => {
  if (!ctx.selection.isCaretAtParagraphStart) {
    return false
  }
  // 理论上的调用关系 (以 et-list 元素开头 Backspace 举例):
  // 光标在 et-list 内开头 按下 Backspace, ctx.effectInvoker.invoke 'deleteContentBackward' 效应
  // 执行此函数(若未被et-list重写), this 是 et-list效应元素构造器, ctx.paragraphEl 是第一个 listItem
  // et-list 元素实现BackspaceAtParagraphStart, 内部通过 ctx.effectInvoker.getEffectElCtor(this)
  // 获取原型(et-list 构造器的原型, 即 EffectElement或其子类构造器)
  // 调用原型的 BackspaceAtParagraphStart 方法, 若返回 true, 说明父类已经成功处理了该效应, 返回 true
  // 若返回 false, 说明未处理, et-list 自身应当继续处理该效应
  // 对于 BackspaceAtParagraphStart, 默认的处理函数还可能返回一个 Paragraph 元素对象
  // 表明说明处理了一半(希望将光标定位到该元素对象末尾, 但想征求子类处理函数的意见)
  // 若 et-list 对此有意见, 如判断 返回的 Paragraph 是否也是 et-list 实例, 进而处理列表合并问题
  // 若 et-list 对此没意见, 则原样返回, 于是这里的 res 就可以拿到这个元素对象,
  // 然后将光标定位到该元素末尾 (即完成默认处理逻辑)
  const res = _this.BackspaceAtParagraphStart?.(_this, ctx)
  if (typeof res === 'object') {
    ctx.setCaretToAParagraph(res, false)
    return true
  }
  return !!res
}
export const checkBackspaceAtCaretDeleteNode = (ctx: Et.UpdatedContext) => {
  const focusNode = ctx.selection.focusNode
  if (ctx.selection.anchorText || !focusNode) {
    return false
  }
  let removeNode = focusNode.childNodes.item(Math.max(0, ctx.selection.anchorOffset - 1))
  if (!removeNode) {
    removeNode = focusNode
  }
  if (removeNode === ctx.body || ctx.isParagraph(removeNode)) {
    return true
  }
  ctx.commandManager.push(cmd.removeNode({
    node: removeNode,
  }))
  return true
}
export const checkBackspaceAtCaretInTextStart = (ctx: Et.UpdatedContext) => {
  if (ctx.selection.modifyMulti(
    ['move', 'backward', 'character'],
    ['extend', 'forward', 'character'],
  )) {
    if (ctx.selection.isCollapsed) {
      return true
    }
    return removeByTargetRange(ctx, ctx.selection.range)
  }
  return false
}

export const checkDeleteAtCaretDeleteText = (ctx: Et.UpdatedContext, deleteWord: boolean) => {
  const removeChar = deleteWord ? ctx.selection.followingWord : ctx.selection.followingChar
  if (!removeChar) {
    return false
  }
  ctx.commandManager.push(cmd.deleteText({
    text: ctx.selection.anchorText as Et.Text,
    data: removeChar,
    offset: ctx.selection.anchorOffset,
    isBackward: false,
    setCaret: true,
  }))
  return true
}
export const checkDeleteAtCaretDeleteParagraph = (
  _this: Et.EffectHandleThis, ctx: Et.UpdatedContext,
) => {
  if (!ctx.selection.isCaretAtParagraphEnd) {
    return false
  }
  const res = _this.DeleteAtParagraphEnd?.(_this, ctx)
  if (typeof res === 'object') {
    ctx.setCaretToAParagraph(res, true)
    return true
  }
  return !!res
}
export const checkDeleteAtCaretDeleteNode = (ctx: Et.UpdatedContext) => {
  const focusNode = ctx.selection.focusNode
  if (ctx.selection.anchorText || !focusNode) {
    return false
  }
  let removeNode = focusNode.childNodes.item(ctx.selection.anchorOffset)
  if (!removeNode) {
    removeNode = focusNode
  }
  if (removeNode === ctx.body || ctx.isParagraph(removeNode)) {
    return true
  }
  ctx.commandManager.push(cmd.removeNode({
    node: removeNode,
  }))
  return true
}
export const checkDeleteAtCaretInTextEnd = (ctx: Et.UpdatedContext) => {
  if (ctx.selection.modifyMulti(
    ['move', 'forward', 'character'],
    ['extend', 'backward', 'character'],
  )) {
    if (ctx.selection.isCollapsed) {
      return true
    }
    return removeByTargetRange(ctx, ctx.selection.range)
  }
  return false
}

export const backspaceAtParagraphStart = createEffectHandle('BackspaceAtParagraphStart', (_this, ctx) => {
  const currP = ctx.paragraphEl
  const isEmpty = currP.isEmpty()
  let prevPT = currP.previousSibling as Et.Paragraph | null

  // 当前段落有后兄弟
  if (prevPT) {
    if (isEmpty) {
      ctx.commandManager.push(cmd.removeNode({
        node: currP,
        destCaretRange: null,
      }))
      ctx.setCaretToAParagraph(prevPT, false)
      return true
    }
    if (checkEqualParagraphAndSmartMerge(ctx, prevPT, currP)) {
      return true
    }
    let prevPinnerP = prevPT
    // blockquote末段落可能也是 Component
    if (etcode.check(prevPT, EtTypeEnum.Blockquote)) {
      prevPinnerP = prevPT.lastParagraph
    }
    if (etcode.check(prevPinnerP, EtTypeEnum.Component)) {
      prevPinnerP.focusToInnerEditable(ctx, false)
      return true
    }
    else if (prevPinnerP !== prevPT) {
      ctx.setSelection(prevPinnerP.innerEndEditingBoundary())
      return true
    }
    // prevP 与 currp 不同, 且既不是 Blockquote 也不是 Component
    // 删除 currp, 将 currp 内容克隆按效应规则插入 prevP 末尾
    return removeParagraphAndMergeCloneContentsToOther(ctx, prevPT, currP)
  }
  // 当前段落无前兄弟
  const topEl = ctx.topElement
  prevPT = topEl.previousSibling as Et.Paragraph | null

  // 段落和顶层节点均无前兄弟
  if (!prevPT) {
    if (!isEmpty) {
      return true
    }
    const nextP = currP.nextSibling as Et.Paragraph | null
    if (nextP) {
      ctx.commandManager.push(cmd.removeNode({
        node: currP,
        destCaretRange: null,
      }))
      ctx.setCaretToAParagraph(nextP, true)
      return true
    }
    if (ctx.isParagraph(topEl)) {
      return true
    }
    // 当前段落是顶层节点唯一子节点, 顶层节点回退为普通段落
    if (currP.parentNode === topEl) {
      const newP = topEl.regressToParagraphElement(ctx)
      ctx.commandManager.push(cmd.replaceNode({
        oldNode: topEl,
        newNode: newP,
        destCaretRange: cr.caretInStart(newP),
      }))
      return true
    }
    return false
  }

  // 顶层节点有前兄弟
  if (!isEmpty) {
    ctx.setCaretToAParagraph(prevPT, false)
  }
  // 段落无前后兄弟, 删除顶层节点
  const removeNode = currP.nextSibling ? currP : topEl
  ctx.commandManager.push(cmd.removeNode({
    node: removeNode,
    destCaretRange: null,
  }))
  ctx.setCaretToAParagraph(prevPT, false)
  return true
})
export const deleteAtParagraphEnd = createEffectHandle('DeleteAtParagraphEnd', (_this, ctx) => {
  const currP = ctx.paragraphEl
  const isEmpty = currP.isEmpty()
  let nextPT = currP.nextSibling as Et.Paragraph | null

  // 当前段落有后兄弟
  if (nextPT) {
    if (isEmpty) {
      ctx.commandManager.push(cmd.removeNode({
        node: currP,
        destCaretRange: null,
      }))
      ctx.setCaretToAParagraph(nextPT, true)
      return true
    }
    if (checkEqualParagraphAndSmartMerge(ctx, currP, nextPT)) {
      return true
    }
    let nextPinnerP = nextPT
    if (etcode.check(nextPT, EtTypeEnum.Blockquote)) {
      nextPinnerP = nextPT.firstParagraph
    }
    if (etcode.check(nextPinnerP, EtTypeEnum.Component)) {
      nextPinnerP.focusToInnerEditable(ctx, true)
      return true
    }
    if (nextPinnerP !== nextPT) {
      ctx.setSelection(nextPinnerP.innerStartEditingBoundary())
      return true
    }
    return removeParagraphAndMergeCloneContentsToOther(ctx, currP, nextPT)
  }

  // 当前段落无后兄弟
  const topEl = ctx.topElement
  nextPT = topEl.nextSibling as Et.Paragraph | null

  // 顶层节点无后兄弟
  if (!nextPT) {
    if (!isEmpty) {
      return true
    }
    const prevP = currP.previousSibling as Et.Paragraph | null
    if (prevP) {
      ctx.commandManager.push(cmd.removeNode({
        node: currP,
        destCaretRange: null,
      }))
      ctx.setCaretToAParagraph(prevP, false)
      return true
    }
    if (ctx.isParagraph(topEl)) {
      return true
    }
    if (currP.parentNode === topEl) {
      const newP = topEl.regressToParagraphElement(ctx)
      ctx.commandManager.push(cmd.replaceNode({
        oldNode: topEl,
        newNode: newP,
        destCaretRange: cr.caretInStart(newP),
      }))
      return true
    }
    return false
  }

  // 顶层节点有后兄弟
  ctx.setCaretToAParagraph(nextPT, true)
  return true
})
