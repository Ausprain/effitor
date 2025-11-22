import type { Et } from '@effitor/core'
import { cmd, cr } from '@effitor/core'

import { ListAttr } from '../config'
import { EtListElement, EtListItemElement } from '../EtListElement'

// listHandler 内容较少, 不挂载
export const listHandler: Et.EffectHandlerPick<'replaceParagraphWithList'> = {
  replaceParagraphWithList(ctx, {
    listType,
    paragraph,
    moveContents = false,
  }) {
    const prevP = paragraph.previousElementSibling
    if (EtListElement.is(prevP) && prevP.getAttribute(ListAttr.Style_Type) === listType.styleType) {
    // 上一个段落是list且同类, 则直接在上一个list插入一个li即可
      const li = EtListItemElement.create()
      return ctx.commandManager
        .push(
        // 删除当前段落
          cmd.removeNode({
            node: paragraph,
            execAt: cr.caretOutStart(paragraph),
          }),
          // 上一个list末尾插入一个li
          cmd.insertNode({
            node: li,
            execAt: cr.caret(prevP, prevP.childNodes.length),
          }),
        )
        .handleAndUpdate(cr.caret(li, 0))
    }
    const listEl = EtListElement.create(listType, true, false)
    const li = listEl.firstChild as EtListItemElement
    let destCaretRange
    if (moveContents) {
      const moveRange = cr.spanRangeAllIn(paragraph)
      if (moveRange) {
        ctx.commandManager.push(cmd.moveNodes(moveRange, cr.caretInStart(li)))
      }
      if (paragraph.lastChild) {
        if (paragraph.lastChild.nodeName === 'BR') {
          destCaretRange = cr.caretOutStart(paragraph.lastChild)
        }
        else {
          destCaretRange = cr.caretEndAuto(paragraph.lastChild)
        }
      }
    }
    else {
      destCaretRange = cr.caretInStart(li)
    }
    return ctx.commandManager
      .push(cmd.replaceNode({
        oldNode: paragraph,
        newNode: listEl,
      }))
      .handleAndUpdate(destCaretRange)
  },
}
