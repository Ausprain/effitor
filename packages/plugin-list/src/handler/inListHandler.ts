import type { Et } from '@effitor/core'
import { cmd, cr, createEffectHandle, dom } from '@effitor/core'
import { HtmlCharEnum } from '@effitor/shared'

import { EtListElement, EtListItemElement } from '../EtListElement'

const checkDeleteList = (ctx: Et.UpdatedContext) => {
  const currLi = ctx.focusEtElement
  const currList = currLi.parentElement
  const listContent = currList.textContent
  if (!EtListItemElement.is(currLi)
    || (listContent !== '' && listContent !== HtmlCharEnum.ZERO_WIDTH_SPACE)
  ) {
    return false
  }
  const prevEl = currList.previousElementSibling as EtListElement | EtListItemElement | null
  if (prevEl) {
    // list有前兄弟, 光标至其末尾
    return ctx.commandManager
      .push(cmd.removeNode({
        node: currList,
        execAt: cr.caretOutStart(currList),
      }))
      .handleAndUpdate(cr.caret(prevEl, prevEl.childNodes.length))
  }
  else {
    // 没有前兄弟插回一个段落
    const newP = ctx.createPlainParagraph()
    return ctx.commandManager
      .push(cmd.replaceNode({
        oldNode: currList,
        newNode: newP,
      }))
      .handleAndUpdate(cr.caretInAuto(newP))
  }
}

type DeleteInputType
  = | 'EdeleteContentBackward'
    | 'EdeleteContentForward'
    | 'EdeleteWordBackward'
    | 'EdeleteWordForward'
const createDeleteHandle = <K extends DeleteInputType>(methodName: K) => {
  return createEffectHandle(methodName, function (ctx, payload) {
    if (payload.targetRange.collapsed && checkDeleteList(ctx)) {
      return true
    }
    return this.superHandler[methodName]?.(ctx, payload)
  })
}

/**
 * 无内容li中的enter处理, 若是最后一个, 则应考虑是否删除 list, 插入普通段落
 */
const enterAtEmptyListItem = (ctx: Et.UpdatedContext) => {
  const currLi = ctx.focusEtElement
  const prevLi = ctx.focusEtElement.previousElementSibling as EtListItemElement | null
  const nextLi = ctx.focusEtElement.nextElementSibling as EtListItemElement | null
  if (nextLi) {
    // 有下一个li, 向下插入新li
    return insertLiAt(ctx, cr.caretOutEnd(currLi))
  }
  const currList = currLi.parentElement as EtListElement
  const currListParent = currList.parentElement as EtListElement | HTMLElement | null
  if (prevLi) {
    // 有上一个li, 而无下一个li, 删除当前li, 在list下方插入段落或li(嵌套list, 相当于减缩进)
    if (!currList || !currListParent) {
      if (import.meta.env.DEV) {
        throw Error(`inListHandler.insertParagraphInLi: 当前listItem元素无父级List元素`)
      }
      return true
    }
    ctx.commandManager.push(cmd.removeNode({
      node: currLi,
      execAt: cr.caretOutStart(currLi),
    }))
    if (EtListElement.is(currListParent)) {
      // 嵌套list, 删除当前li, 在当前list下方插入li
      return insertLiAt(ctx, cr.caretOutEnd(currList))
    }
    else {
      // 非嵌套list, 删除当前li, 在当前list下方插入段落
      const newP = ctx.createPlainParagraph()
      return ctx.commandManager
        .push(cmd.insertNode({
          node: newP,
          execAt: cr.caretOutEnd(currList),
        }))
        .handleAndUpdate(cr.caretInAuto(newP))
    }
  }
  else {
    const removeAt = cr.caretOutStart(currLi)
    ctx.commandManager.push(cmd.removeNode({
      node: currList,
      execAt: removeAt,
    }))
    // 无上且无下li,
    if (EtListElement.is(currListParent)) {
      // 嵌套list, 删除当前list, 插回一个li
      const newLi = EtListItemElement.create()
      return ctx.commandManager.push(cmd.insertNode({
        node: newLi,
        execAt: removeAt,
      })).handleAndUpdate(cr.caret(newLi, 0))
    }
    else {
      // 删除当前list, 插回一个段落
      const newP = ctx.createPlainParagraph()
      return ctx.commandManager.push(cmd.insertNode({
        node: newP,
        execAt: removeAt,
      })).handleAndUpdate(cr.caretInAuto(newP))
    }
  }
}
const insertLiAt = (ctx: Et.UpdatedContext, insertAt: Et.EtCaret) => {
  const currLi = ctx.focusEtElement as EtListItemElement
  const li = dom.cloneEtElement(currLi, false)
  if (li.checked) li.checked = false
  return ctx.commandManager.push(cmd.insertNode({
    node: li,
    execAt: insertAt,
  })).handleAndUpdate(cr.caret(li, 0))
}

/**
 * 处理由listItem激活的效应, 挂在 EtListItemElement 上
 */
export const inListHandler: Et.EffectHandlerWith<EtListItemElement, EtListItemElement> = {

  EdeleteContentBackward: createDeleteHandle('EdeleteContentBackward'),
  EdeleteContentForward: createDeleteHandle('EdeleteContentForward'),
  EdeleteWordBackward: createDeleteHandle('EdeleteWordBackward'),
  EdeleteWordForward: createDeleteHandle('EdeleteWordForward'),
  EinsertParagraph(ctx, payload) {
    if (payload.targetRange.collapsed) {
      const text = ctx.focusEtElement.textContent
      if (text === '' || text === HtmlCharEnum.ZERO_WIDTH_SPACE) {
        if (enterAtEmptyListItem(ctx)) {
          return true
        }
      }
    }
    return this.superHandler.EinsertParagraph?.(ctx, payload)
  },
  InsertParagraphAtParagraphEnd(ctx, tc) {
    return insertLiAt(ctx, cr.caretOutEnd(tc.anchorParagraph))
  },
  InsertParagraphAtParagraphStart(ctx, tc) {
    return insertLiAt(ctx, cr.caretOutStart(tc.anchorParagraph))
  },

  listItemIndent(ctx, { targetCaret: tc }) {
    const currLi = tc.anchorParagraph
    const prevEl = currLi.previousElementSibling as EtListItemElement | null
    if (!prevEl) {
      // 无前兄弟, 禁止缩进
      return true
    }
    const srcCaretRange = ctx.selection.getCaretRange()

    if (EtListElement.is(prevEl)) {
      // 上一节点是list, 直接将当前li移入
      return ctx.commandManager
        .push(cmd.functional({
          meta: {
            li: currLi,
            list: prevEl,
            pos: 'beforeend' as InsertPosition,
            undoPos: 'afterend' as InsertPosition,
          },
          execCallback() {
            const { li, list, pos } = this.meta
            list.insertAdjacentElement(pos, li)
          },
          undoCallback() {
            const { li, list, undoPos } = this.meta
            list.insertAdjacentElement(undoPos, li)
          },
          srcCaretRange,
          destCaretRange: srcCaretRange,
        }))
        .handleAndUpdate()
    }

    const nextEl = currLi.nextElementSibling as EtListElement | EtListItemElement | null
    if (EtListElement.is(nextEl)) {
      // 下一节点是list, 直接将当前li移入
      return ctx.commandManager
        .push(cmd.functional({
          meta: {
            li: currLi,
            list: nextEl,
            pos: 'afterbegin' as InsertPosition,
            undoPos: 'beforebegin' as InsertPosition,
          },
          execCallback() {
            const { li, list, pos } = this.meta
            list.insertAdjacentElement(pos, li)
          },
          undoCallback() {
            const { li, list, undoPos } = this.meta
            list.insertAdjacentElement(undoPos, li)
          },
          srcCaretRange,
          destCaretRange: srcCaretRange,
        }))
        .handleAndUpdate()
    }
    const currList = currLi.parentElement as EtListElement
    if (!currList) {
      if (import.meta.env.DEV) {
        throw Error(`inListHandler.listIndent: listItem hasn't list parent`)
      }
      return true
    }
    // 下一节点是li 或
    // 无后li, 直接缩进: 删除当前li, 插入一个新list
    const newList = EtListElement.create({
      ordered: currList.ordered,
      styleType: currList.styleType,
    }, false)
    ctx.commandManager.startTransaction()
    ctx.commandManager.push(cmd.functional({
      meta: {
        li: currLi,
        list: newList,
      },
      execCallback() {
        const { list, li } = this.meta
        li.replaceWith(list)
        list.appendChild(li)
      },
      undoCallback() {
        const { list, li } = this.meta
        list.replaceWith(li)
      },
      srcCaretRange,
      destCaretRange: srcCaretRange,
    })).handleAndUpdate()
    ctx.commandManager.closeTransaction()

    return true
  },
  listItemOutdent(ctx, { targetCaret: tc }) {
    const currLi = tc.anchorParagraph
    const currList = currLi.parentElement as EtListElement
    if (!currList) {
      if (import.meta.env.DEV) {
        throw Error(`inListHandler.listOutdent: listItem hasn't list parent`)
      }
      return true
    }
    if (!EtListElement.is(currList.parentElement)) {
      // 非嵌套list, 不可减缩进
      return true
    }
    const prevEl = currLi.previousElementSibling as EtListElement | EtListItemElement | null
    const nextEl = currLi.nextElementSibling as EtListElement | EtListItemElement | null
    if (nextEl && prevEl) {
      // 有同级前后兄弟, 不可减缩进
      return true
    }
    const srcCaretRange = ctx.selection.getCaretRange()

    if (!nextEl && !prevEl) {
      // 当前唯一li, 删除list, li移到list的位置
      ctx.commandManager.startTransaction()
      ctx.commandManager.push(cmd.functional({
        meta: {
          li: currLi,
          list: currList,
        },
        execCallback() {
          const { list, li } = this.meta
          list.replaceWith(li)
          // ctx.setCaret(this.caretRanges[1]!)
        },
        undoCallback() {
          const { list, li } = this.meta
          li.replaceWith(list)
          list.appendChild(li)
          // ctx.setCaret(this.caretRanges[0])
        },
        srcCaretRange,
        destCaretRange: srcCaretRange,
      })).handleAndUpdate()
      ctx.commandManager.closeTransaction()

      return true
    }
    let insertPosition: InsertPosition
    let undoPos: InsertPosition
    if (nextEl) {
      // 将当前li摘到当前list后
      insertPosition = 'beforebegin'
      undoPos = 'afterbegin'
    }
    else {
      // 将当前li摘到当前list后
      insertPosition = 'afterend'
      undoPos = 'beforeend'
    }
    ctx.commandManager
      .push(cmd.functional({
        meta: {
          li: currLi,
          list: currList,
          pos: insertPosition,
          undoPos,
        },
        execCallback() {
          const { list, li, pos } = this.meta
          list.insertAdjacentElement(pos, li)
        },
        undoCallback() {
          const { list, li, undoPos } = this.meta
          list.insertAdjacentElement(undoPos, li)
        },
        srcCaretRange,
        destCaretRange: srcCaretRange,
      }))
      .handleAndUpdate()
    return true
  },
  listItemMoveUp(ctx, { targetCaret: tc }) {
    const currLi = tc.anchorParagraph
    const prevEl = currLi.previousSibling as EtListElement | EtListItemElement | null
    if (prevEl) {
      // 有前兄弟li 将前兄弟移动到当前 li 后边
      // ps. 无论前兄弟是 list 还是li, 都是如此, 如果想让当前 li 移入前兄弟 list, 应使用tab
      return ctx.commandManager.handleMoveNode(prevEl, cr.caretOutEndFuture(currLi))
    }
    // 无前兄弟li, 判断是否有前 list
    const currList = currLi.parentElement as EtListElement | null
    if (!currList) {
      ctx.assists.logger?.logError(`inListHandler.listItemMoveUp: listItem hasn't list parent`, '@plugin-list[Handler]')
      return true
    }
    const prevP = currList.previousSibling
    if (!prevP || (!EtListElement.is(prevP) && !EtListItemElement.is(prevP))) {
      return true
    }
    // 当前 list 只有一个 li, 删除当前 list
    if (currList.childNodes.length === 1) {
      ctx.commandManager.push(cmd.removeNode({ node: currList }))
    }
    // 有前 list, 将当前 li 移动到前 list 的最后; 否则移动到当前 list 的前 li 后边
    return ctx.commandManager.handleMoveNode(
      currLi,
      EtListElement.is(prevP) ? cr.caretInEnd(prevP) : cr.caretOutEndFuture(prevP),
      // 命令执行后用当前光标位置定位;
      // FIXME 如果光标位置在当前 li 内, 则这是"无害的", 因为移动该 li 不改变 EtCaret
      // 的定位上下文; 但如果当前光标位置依赖当前 li 所在 list 或前一 list 内部节点索引
      // 则可能导致定位失败, 甚至抛出异常 (Range 位置非法)
      ctx.selection.getCaretRange(),
    )
  },
  listItemMoveDown(ctx, { targetCaret: tc }) {
    const currLi = tc.anchorParagraph
    const nextEl = currLi.nextSibling as EtListElement | EtListItemElement | null
    if (nextEl) {
      // 有后兄弟li 将后兄弟移动到当前 li 前边
      return ctx.commandManager.handleMoveNode(nextEl, cr.caretOutStartFuture(currLi))
    }
    // 无后兄弟li, 判断是否有后 list
    const currList = currLi.parentElement as EtListElement | null
    if (!currList) {
      ctx.assists.logger?.logError(`inListHandler.listItemMoveDown: listItem hasn't list parent`, '@plugin-list[Handler]')
      return true
    }
    const nextP = currList.nextSibling
    if (!nextP || (!EtListElement.is(nextP) && !EtListItemElement.is(nextP))) {
      return true
    }
    // 当前 list 只有一个 li, 删除
    if (currList.childNodes.length === 1) {
      ctx.commandManager.push(cmd.removeNode({ node: currList }))
    }
    // 有后 list, 将当前 li 移动到后 list 的最前; 否则移动到当前 list 的后 li 前边
    return ctx.commandManager.handleMoveNode(
      currLi,
      EtListElement.is(nextP) ? cr.caretInStart(nextP) : cr.caretOutStartFuture(nextP),
      // 命令执行后用当前光标位置定位
      // FIXME 同上[listItemMoveUp]
      ctx.selection.getCaretRange(),
    )
  },
}
