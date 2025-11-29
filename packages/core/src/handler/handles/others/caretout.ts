import { EtTypeEnum, HtmlCharEnum } from '@effitor/shared'

import { Et } from '../../../@types'
import { etcode } from '../../../element'
import { cr } from '../../../selection'
import { dom, traversal } from '../../../utils'
import { cmd } from '../../command'
import { createEffectHandle } from '../../utils'

const caretToNextText = (node: Et.Node, ctx: Et.EditorContext) => {
  const nextNode = node.nextSibling
  if (nextNode && dom.isText(nextNode)) {
    // 下一个文本节点不是零宽字符开头, 插入一个零宽字符, 否则光标无法定位到其开头
    if (!nextNode.data.startsWith(HtmlCharEnum.ZERO_WIDTH_SPACE)) {
      if (ctx.commandManager.handleUpdateText(nextNode, 0, 0, HtmlCharEnum.ZERO_WIDTH_SPACE, false)) {
        return ctx.setSelection(cr.caret(nextNode, 1))
      }
    }
    return ctx.setSelection(cr.caret(nextNode, 1))
  }
  const zws = dom.zwsText()
  ctx.commandManager.push(cmd.insertNode({
    node: zws,
    execAt: cr.caretOutEnd(node),
  }))
  return ctx.commandManager.handleAndUpdate(cr.caret(zws, 1))
}

export const tabout = createEffectHandle('tabout', (ctx, tc) => {
  // TODO 判断 ctx.selection.rawEl
  // 有光标跳出效应, 跳出光标
  if (etcode.check(tc.anchorEtElement, EtTypeEnum.CaretOut)) {
    return caretToNextText(tc.anchorEtElement, ctx)
  }
  // 无此效应, 插入制表符
  else if (tc.isAtText()) {
    ctx.commonHandler.insertText('\t', tc)
    return true
  }
  return false
})

export const dblSpace = createEffectHandle('dblSpace', (ctx, tc) => {
  if (ctx.selection.rawEl) {
    const currP = tc.anchorParagraph
    if (currP && etcode.check(currP, EtTypeEnum.Component)) {
      const nextP = currP.nextSibling
      if (nextP) {
        return ctx.setCaretToAParagraph(nextP, true, true)
      }
      else {
        const newP = ctx.createPlainParagraph()
        const destCaretRange = cr.caretInAuto(newP)
        return ctx.commandManager.push(cmd.insertNode({
          node: newP,
          execAt: cr.caretOutEnd(currP),
          destCaretRange,
        })).handleAndUpdate()
      }
    }
    else {
      const nextNode = traversal.treeNextSibling(ctx.selection.rawEl)
      if (dom.isText(nextNode) && nextNode.parentElement?.isContentEditable) {
        return ctx.commonHandler.caretToTextStartWithZWS(nextNode)
      }
    }
    return false
  }
  if (!etcode.check(tc.anchorEtElement, EtTypeEnum.CaretOut)) {
    return false
  }
  if (tc.isAtText()) {
    const text = tc.container
    // 移除已经插入的两个空格
    if (text.data.slice(tc.offset - 2, tc.offset) === '  ') {
      ctx.commandManager.handleUpdateText(text, tc.offset - 2, '  ', '', false)
    }
  }
  const etGen = ctx.body.outerEtElements(tc.anchorEtElement)
  let outer = tc.anchorEtElement
  for (const el of etGen) {
    if (etcode.check(el, EtTypeEnum.CaretOut)) {
      outer = el
    }
    else {
      break
    }
  }
  return caretToNextText(outer, ctx)
})
