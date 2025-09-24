import type { Et } from '../../../@types'
import { cmd } from '../../command'
import {
  removeNodesAndChildlessAncestorAndMergeSiblings,
} from './delete.shared'
import { removeByTargetRange } from './deleteAtRange'

/**
 * 是否光标在文本节点非开头位置 Backspace, 若删除后文本节点为空, 则连带删除父节点
 */
export const checkBackspaceAtCaretDeleteText = (
  ctx: Et.EditorContext, targetCaret: Et.ValidTargetCaret, deleteWord: boolean,
) => {
  if (!targetCaret.isAtText()) {
    return false
  }
  const textNode = targetCaret.container
  const removeData = deleteWord
    ? ctx.segmenter.precedingWord(textNode.data, targetCaret.offset)
    : ctx.segmenter.precedingChar(textNode.data, targetCaret.offset)
  if (!removeData || !textNode) {
    return false
  }
  if (textNode.length === removeData.length) {
    // 删除后文本节点为空, 连带删除父节点
    return removeNodesAndChildlessAncestorAndMergeSiblings(
      ctx, textNode, textNode, targetCaret.anchorParagraph,
    )
  }
  else {
    ctx.commandManager.push(cmd.deleteText({
      text: textNode,
      data: removeData,
      offset: targetCaret.offset - removeData.length,
      isBackward: true,
      setCaret: true,
    }))
  }
  return true
}
/**
 * 判断光标是否在段落开头 Backspace, 然后智能处理段落删除和合并情况
 */
export const checkBackspaceAtCaretDeleteParagraph = function (
  this: Et.EffectHandleThis, ctx: Et.EditorContext, targetCaret: Et.ValidTargetCaret,
) {
  if (!targetCaret.isCaretAtParagraphStart()) {
    return false
  }
  // 首段落开头, 不用删除
  if (targetCaret.anchorParagraph === ctx.bodyEl.firstChild) {
    return true
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
  const res = this.BackspaceAtParagraphStart?.(ctx, targetCaret)
  if (typeof res === 'object') {
    ctx.setCaretToAParagraph(res, false)
    return true
  }
  return !!res
}
/**
 * 判断光标位置 Backspace 是否删除节点, 若删除节点, 则会连带删除以其为唯一子节点的祖先(包含自身),
 * 若前后节点可合并, 则继续连带删除前后节点, 并克隆前后节点合并插入删除位置
 */
export const checkBackspaceAtCaretDeleteNode = (
  ctx: Et.EditorContext, targetCaret: Et.ValidTargetCaret,
) => {
  if (targetCaret.isAtText()) {
    return false
  }
  let toRemoved = targetCaret.prevNode
  if (!toRemoved) {
    toRemoved = targetCaret.container
  }
  if (toRemoved === ctx.bodyEl || ctx.isPlainParagraph(toRemoved)) {
    return true
  }
  // 查找删除当前节点后可能为空的祖先
  // 并判断前后节点是否可合并
  return removeNodesAndChildlessAncestorAndMergeSiblings(
    ctx, toRemoved, toRemoved, targetCaret.anchorParagraph,
  )
}
/**
 * 在文本开头 Backspace 删除内容, 上游已经判断了 checkBackspaceAtCaretDeleteParagraph,
 * 此处不再考虑段落开头 Backspace 的情况; 采用选区 modify, 前移一个字符, 再向后扩展一个字符,
 * 若选区collapsed, 则不处理, 否则根据选区位置, 移除选区内容
 */
export const checkBackspaceAtCaretInTextStart = (
  ctx: Et.EditorContext, _targetCaret: Et.ValidTargetCaret,
) => {
  // FIXME 这里需要优化, 将下面与 Selection强关联的逻辑替换为与 targetCaret 强关联的逻辑
  // 接触对 Selection 对象的依赖
  if (ctx.selection.modifyMulti([
    ['move', 'backward', 'character'],
    ['extend', 'forward', 'character'],
  ])) {
    if (ctx.selection.selection?.isCollapsed) {
      return true
    }
    // 更新上下文和选区
    ctx.forceUpdate()
    const tr = ctx.selection.getTargetRange()
    return tr ? removeByTargetRange(ctx, tr) : false
  }
  return false
}

export const checkDeleteAtCaretDeleteText = (
  ctx: Et.EditorContext, targetCaret: Et.ValidTargetCaret, deleteWord: boolean,
) => {
  if (!targetCaret.isAtText()) {
    return false
  }
  const textNode = targetCaret.container
  const removeData = deleteWord
    ? ctx.segmenter.followingWord(textNode.data, targetCaret.offset)
    : ctx.segmenter.followingChar(textNode.data, targetCaret.offset)
  if (!removeData || !textNode) {
    return false
  }
  if (textNode.length === removeData.length) {
    // 删除后文本节点为空, 连带删除父节点
    return removeNodesAndChildlessAncestorAndMergeSiblings(
      ctx, textNode, textNode, targetCaret.anchorParagraph,
    )
  }
  ctx.commandManager.push(cmd.deleteText({
    text: textNode,
    data: removeData,
    offset: targetCaret.offset,
    isBackward: false,
    setCaret: true,
  }))
  return true
}
export const checkDeleteAtCaretDeleteParagraph = function (
  this: Et.EffectHandleThis, ctx: Et.EditorContext, targetCaret: Et.ValidTargetCaret,
) {
  if (!targetCaret.isCaretAtParagraphEnd()) {
    return false
  }
  const res = this.DeleteAtParagraphEnd?.(ctx, targetCaret)
  if (typeof res === 'object') {
    ctx.setCaretToAParagraph(res, true)
    return true
  }
  return !!res
}
export const checkDeleteAtCaretDeleteNode = (
  ctx: Et.EditorContext, targetCaret: Et.ValidTargetCaret,
) => {
  if (targetCaret.isAtText()) {
    return false
  }
  let toRemoved = targetCaret.nextNode
  if (!toRemoved) {
    toRemoved = targetCaret.container
  }
  if (toRemoved === ctx.bodyEl || ctx.isPlainParagraph(toRemoved)) {
    return true
  }
  return removeNodesAndChildlessAncestorAndMergeSiblings(
    ctx, toRemoved, toRemoved, targetCaret.anchorParagraph,
  )
}
export const checkDeleteAtCaretInTextEnd = (
  ctx: Et.EditorContext, _targetCaret: Et.ValidTargetCaret,
) => {
  /**
   * // FIXME 同 {@link checkBackspaceAtCaretInTextStart}
   */
  if (ctx.selection.modifyMulti([
    ['move', 'forward', 'character'],
    ['extend', 'backward', 'character'],
  ])) {
    if (ctx.selection.selection?.isCollapsed) {
      return true
    }
    // 更新上下文和选区
    ctx.forceUpdate()
    const tr = ctx.selection.getTargetRange()
    return tr ? removeByTargetRange(ctx, tr) : false
  }
  return false
}
