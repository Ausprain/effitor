import type * as Et from '../@types'
import { EtTypeEnum, HtmlCharEnum } from '../@types/constant'
import cr from '../caretRange'
import { etcode, type EtParagraphElement } from '../element'
import { dom } from '../utils'
import { insertTextAtCaret } from './builtin'
import { cmd } from './undo'

/* -------------------------------------------------------------------------- */
/*                            handler utils                                   */
/* -------------------------------------------------------------------------- */

/**
 * 获取段落内Range边缘端点的段落内最外层祖先节点; range必须在同一个段落（pNode）内; 否则返回的节点可能为空
 * @param range 范围在pNode内的选区对象
 * @param pNode
 */
export const getRangeOutermostContainerUnderTheParagraph = (
  range: Range | StaticRange,
  pNode: EtParagraphElement,
) => {
  const startNode = range.startContainer, endNode = range.endContainer
  const startOutermost = startNode === pNode ? pNode.childNodes.item(range.startOffset) : dom.outermostAncestorUnderTheNode(startNode, pNode)
  const endOutermost = endNode === pNode ? pNode.childNodes.item(range.endOffset) : dom.outermostAncestorUnderTheNode(endNode, pNode)
  return [startOutermost, endOutermost]
}

/**
 * 扩大选区整体删除, 并将未选取的前半和后半部分内容克隆, 合并插入删除位置（可选在该位置插入节点）\
 * * 此处不会对insertNode的内容校验, 调用时需先判断insertNode是否允许插入到指定位置
 * @param startExpandNode `delTargetRange.startContainer`的扩大节点（要一并移除的最前节点）
 * @param endExpandNode `delTargetRange.endContainer`的扩大节点（要一并删除的最后节点）
 * @param delTargetRange 原本要删除内容的区域
 * @param srcCaretRange 原来光标位置
 * @param includes 克隆片段是否包含扩大节点边缘（true: 插入内容将包含边缘节点`<tag>`, false: 插入的内容不会出现边缘节点`<tag>`）
 * @param insertContent 插入到光标位置或替换选区的内容, 片段 或者字符串; null则不插入任何内容, 仅删除选中内容
 * @param setCaret 是否设置光标位置, 默认true
 */
export const expandRemoveInsert = (
  ctx: Et.EditorContext,
  startExpandNode: Node,
  endExpandNode: Node,
  delTargetRange: Range | StaticRange,
  includes: boolean,
  insertContent: DocumentFragment | string | null = null,
  setCaret = true,
) => {
  if (!insertContent && delTargetRange.collapsed) {
    // 不插入节点, 光标collapsed, 直接返回不用处理
    return false
  }
  // 计算要删除内容的范围
  const r = document.createRange()
  r.setStartBefore(startExpandNode)
  r.setEndAfter(endExpandNode)
  const commonP = r.commonAncestorContainer
  // 继续扩大到commonParent的子节点
  if (startExpandNode.parentElement !== commonP) {
    startExpandNode = dom.outermostAncestorUnderTheNode(startExpandNode, commonP)
    r.setStartBefore(startExpandNode)
  }
  if (endExpandNode.parentElement !== commonP) {
    endExpandNode = dom.outermostAncestorUnderTheNode(endExpandNode, commonP)
    r.setEndAfter(endExpandNode)
  }
  const removeRange = dom.staticFromRange(r)
  const removeAt = dom.caretStaticRangeInNode(removeRange.startContainer, removeRange.startOffset)

  // 克隆前后未选择片段 用于后续插回
  const [f1, f2] = getUnselectedCloneFragment(delTargetRange, startExpandNode, endExpandNode, includes, true)

  let out, mergedF
  if (insertContent) {
    if (typeof insertContent === 'string') {
      out = dom.mergeFragmentsWithText(f1, f2, insertContent, false, false)
    }
    else {
      mergedF = dom.mergeFragments(f1, insertContent, false)
      out = dom.mergeFragmentsWithCaretRange(mergedF, f2, false, false)
    }
  }
  else {
    out = dom.mergeFragmentsWithCaretRange(f1, f2, false, false)
  }
  // 删除扩大选区内容
  ctx.commandManager.push(cmd.removeContent({
    removeRange,
    destCaretRange: !out && setCaret ? removeAt : null,
  }))
  // 合并片段为空, 无需插入直接返回，光标置于删除后的位置
  if (!out) {
    // 既然不会插入内容了, 就必须判断removeRange是否将et-body清空了, 若是, 则应插回一个段落
    if (
      removeRange.startContainer === removeRange.endContainer && removeRange.endContainer === ctx.body
      && removeRange.startOffset === 0 && removeRange.endOffset === ctx.body.childNodes.length
    ) {
      let newP, dest
      const out = ctx.editor.callbacks.firstInsertedParagraph?.() ?? ctx.createParagraph()
      if (Array.isArray(out)) {
        newP = out[0]
        dest = out[1]
      }
      else {
        newP = out
        dest = cr.staticIn(newP, 0)
      }
      ctx.commandManager.push(cmd.insertNode({
        node: newP,
        execAt: cr.staticIn(ctx.body, 0),
        destCaretRange: dest,
      }))
    }
    return true
  }

  const [fragment, dest] = out
  // 清除状态
  dom.traverseNode(fragment, (el) => {
    if (etcode.check(el)) dom.removeStatusClassForEl(el)
  }, { whatToShow: NodeFilter.SHOW_ELEMENT })

  ctx.commandManager.push(cmd.insertContent({
    content: fragment,
    execAt: removeAt,
    destCaretRange: setCaret ? dest : null,
  }))

  return true
}

/**
 * 判断移除节点前后是否为文本节点, 是则移除并合并前后文本节点
 */
const checkRemoveNodeAndMergeTextNode = (ctx: Et.EditorContext, removeNode: Et.HTMLNode, prev: Node, next: Node) => {
  if (!dom.isTextNode(prev) || !dom.isTextNode(next)) return false
  // 光标在前节点, 删除后节点, 补充前节点
  if (ctx.caret.staticRange.startContainer === prev) {
    const delTr = document.createRange()
    delTr.setStartBefore(removeNode)
    delTr.setEndAfter(next)
    ctx.commandManager.push(cmd.removeContent({
      removeRange: delTr,
    }))
    const data = next.data.replace(HtmlCharEnum.ZERO_WIDTH_SPACE, '')
    ctx.commandManager.push(cmd.insertText({
      data,
      text: prev,
      offset: prev.length,
    }))
  }
  // 光标在后节点, 删除前节点, 补充后节点
  else if (ctx.caret.staticRange.startContainer === next) {
    const delTr = document.createRange()
    delTr.setStartBefore(prev)
    delTr.setEndAfter(removeNode)
    ctx.commandManager.push(cmd.removeContent({
      removeRange: delTr,
    }))
    const data = (prev.data[0] === HtmlCharEnum.ZERO_WIDTH_SPACE ? HtmlCharEnum.ZERO_WIDTH_SPACE : '') + prev.data.replace(HtmlCharEnum.ZERO_WIDTH_SPACE, '')
    ctx.commandManager.push(cmd.insertText({
      data,
      text: next,
      offset: 0,
    }))
  }
  // 一起删除
  else {
    const delTr = document.createRange()
    delTr.setStartBefore(prev)
    delTr.setEndAfter(next)
    ctx.commandManager.push(cmd.removeContent({
      removeRange: delTr,
    }))
    const data = (prev.data[0] === HtmlCharEnum.ZERO_WIDTH_SPACE ? HtmlCharEnum.ZERO_WIDTH_SPACE : '') + prev.data.replace(HtmlCharEnum.ZERO_WIDTH_SPACE, '') + next.data.replace(HtmlCharEnum.ZERO_WIDTH_SPACE, '')
    const text = document.createTextNode(data)
    ctx.commandManager.push(cmd.insertNode({
      node: text,
      execAt: dom.caretStaticRangeOutNode(prev, -1),
    }))
  }
  return true
}
/**
 * 移除一个节点，并合并前后可合并节点
 * * 该方法只push命令, 不handle
 * @param node 要移除的节点
 * @param setCaret 是否设置光标位置, 默认true
 */
export const removeNodeAndMerge = (
  ctx: Et.EditorContext,
  node: Et.HTMLNode,
  setCaret = true,
) => {
  const prev = node.previousSibling,
    next = node.nextSibling
    // 没有前/后节点 或 前后节点不同类, 直接删除, 不用考虑合并
  if (!prev || !next || prev.nodeName !== next.nodeName) {
    const removeAt = dom.caretStaticRangeOutNode(node, -1)
    ctx.commandManager.push(cmd.removeNode({
      node,
      execAt: removeAt,
      destCaretRange: removeAt,
    }))
    return true
  }
  if (!setCaret && checkRemoveNodeAndMergeTextNode(ctx, node, prev, next)) return true
  const delTr = dom.caretStaticRangeOutNode(node, 0)
  return expandRemoveInsert(ctx, prev, next, delTr, true, null, setCaret)
}
/**
 * 使用片段替换当前节点, 并合并入前/后节点
 * * 该方法只push命令, 不handle
 * @param currNode 被替换的节点
 * @param fragment 插入的片段
 * @param setCaret 是否设置光标位置
 * @param caretToStart 光标设置到fragment开始位置
 */
export const replaceNodeAndMerge = (
  ctx: Et.EditorContext,
  currNode: Et.HTMLNode,
  fragment: DocumentFragment,
  setCaret = true,
  caretToStart = true,
) => {
  if (fragment.childNodes.length === 0) return removeNodeAndMerge(ctx, currNode, setCaret)

  const r = document.createRange(),
    prev = currNode.previousSibling,
    next = currNode.nextSibling
  let removeAt = dom.caretStaticRangeOutNode(currNode, -1),
    delTr: StaticRange,
    fg: DocumentFragment = fragment,
    lastChild: Node,
    destCaretRange: Et.CaretRange | null = null

  // 前后均有
  if (prev && next) {
    const f1 = document.createDocumentFragment(),
      f2 = document.createDocumentFragment()
    f1.appendChild(prev.cloneNode(true))
    f2.appendChild(next.cloneNode(true))

    r.setStartBefore(prev)
    r.setEndAfter(next)
    delTr = dom.staticFromRange(r)
    removeAt = dom.caretStaticRangeOutNode(prev, -1)

    let out = dom.mergeFragmentsWithCaretRange(f1, fragment)!
    if (setCaret && caretToStart) {
      destCaretRange = out[1]
    }
    out = dom.mergeFragmentsWithCaretRange(out[0], f2)!
    if (setCaret && !caretToStart) {
      destCaretRange = out[1]
    }
    fg = out[0]
    // lastChild = fg.lastChild!
  }
  // 只有前
  else if (prev) {
    const f1 = document.createDocumentFragment()
    f1.appendChild(prev.cloneNode(true))
    r.setStartBefore(prev)
    r.setEndAfter(currNode)
    delTr = dom.staticFromRange(r)
    removeAt = dom.caretStaticRangeOutNode(prev, -1)

    const out = dom.mergeFragmentsWithCaretRange(f1, fragment)!
    if (setCaret && caretToStart) {
      destCaretRange = out[1]
    }
    fg = out[0]
    lastChild = fg.lastChild! // 若光标定位到末尾, 此处需记录末节点
  }
  // 只有后
  else if (next) {
    const f2 = document.createDocumentFragment()
    f2.appendChild(next.cloneNode(true))
    r.setStartBefore(currNode)
    r.setEndAfter(next)
    delTr = dom.staticFromRange(r)

    const out = dom.mergeFragmentsWithCaretRange(fragment, f2)!
    if (setCaret && !caretToStart) {
      destCaretRange = out[1]
    }
    fg = out[0]
    // lastChild = fg.lastChild!
  }
  // 无前后节点, 直接删除, 替换
  else {
    r.selectNode(currNode)
    delTr = dom.staticFromRange(r)
    lastChild = fg.lastChild!
  }

  // 整体删除
  ctx.commandManager.push(cmd.removeContent({
    removeRange: delTr,
  }))
  if (!destCaretRange && setCaret) {
    if (caretToStart) {
      destCaretRange = dom.caretStaticRangeInNode(fg.firstChild!, 0)
    }
    else {
      destCaretRange = cr.staticIn(lastChild! as any, Infinity)
    }
  }
  // 整体插入
  ctx.commandManager.push(cmd.insertContent({
    content: fg,
    execAt: removeAt,
    destCaretRange: setCaret ? destCaretRange : null,
  }))
  return true
}

/**
 * 在当前光标位置插入一个节点, 若当前光标为range, 则会先collapse到末尾; 若希望删除选区内容, 可先调用 removeRangingContents
 * * 该方法只push命令, 不handle
 */
export const insertNodeAtCaret = (
  ctx: Et.EditorContext,
  node: Et.HTMLNode,
) => {
  const srcCaretRange = ctx.caret.staticRange
  if (!ctx.node) {
    ctx.commandManager.push(cmd.insertNode({
      node: node,
      execAt: srcCaretRange,
      destCaretRange: cr.movedStatic(srcCaretRange, 1),
    }))
  }
  // 在开头
  else if (srcCaretRange.startOffset === 0 || (
    srcCaretRange.startOffset === 1 && ctx.node.data[0] === HtmlCharEnum.ZERO_WIDTH_SPACE
  )) {
    const outermost = dom.outermostInlineAncestorAtEdge(ctx.node, 'start')
    const insertAt = dom.caretStaticRangeOutNode(outermost, -1)
    ctx.commandManager.push(cmd.insertNode({
      node: node,
      execAt: insertAt,
      destCaretRange: cr.movedStatic(insertAt, 1),
    }))
  }
  // 在结尾
  else if (srcCaretRange.startOffset === ctx.node.length || (
    srcCaretRange.startOffset === ctx.node.length - 1 && ctx.node.data.slice(-1) === HtmlCharEnum.ZERO_WIDTH_SPACE
  )) {
    const outermost = dom.outermostInlineAncestorAtEdge(ctx.node, 'end')
    const insertAt = dom.caretStaticRangeOutNode(outermost, 1)
    ctx.commandManager.push(cmd.insertNode({
      node: node,
      execAt: insertAt,
      destCaretRange: cr.movedStatic(insertAt, 1),
    }))
  }
  // 在中间
  else {
    const outermost = dom.outermostAncestorWithSelfAsOnlyChild(ctx.node, ctx.paragraphEl.localName)
    const df = document.createDocumentFragment()
    df.appendChild(node)
    expandRemoveInsert(ctx, outermost, outermost, srcCaretRange, true, df)
  }
}
/**
 * 在光标位置处插入dom片段, 调用此方法有两个前提: 1. df非空, 2. 光标collapsed
 * @param destCaretRange 最终光标位置, 若缺省该值, 则使用df的最后一个子节点的外末尾 (若为#text节点, 则为内末尾(若合并了相邻内容, 则在合并处))
 */
export const insertContentAtCaret = (ctx: Et.EditorContext, df: DocumentFragment, setCaret = false) => {
  if (df.childNodes.length === 0) {
    return
  }
  // 纯文本, 直接插入
  if (df.childElementCount === 0) {
    return insertTextAtCaret(df.textContent!, ctx)
  }

  let hasParagraph = false, hasBlockquote = false
  for (const el of df.children) {
    if (etcode.check(el, EtTypeEnum.Blockquote)) {
      hasBlockquote = true
      hasParagraph = true
      break
    }
    if (hasParagraph) {
      continue
    }
    if (etcode.check(el, EtTypeEnum.Paragraph)) {
      hasParagraph = true
    }
  }
  const currP = ctx.paragraphEl
  const srcCaretRange = ctx.caret.staticRange
  if (hasParagraph) {
    // 规范df, 让每个子节点都是段落; 因为含段落时, 会直接插入et-body, 而et-body的子节点必须是段落
    const resDf = document.createDocumentFragment()
    // 当前段落父节点是否允许普通段落, 如et-list下只允许et-list和et-li而不允许et-p, 此时就不能创建et-p而应创建et-li
    const effectParent = dom.findEffectParent(currP.parentElement!)! // ! 断言 编辑器内段落父节点必定存在, 且必定存在效应祖先
    const plainParagraphAllowed = effectParent && etcode.checkIn(effectParent, EtTypeEnum.Paragraph)
    // 段落构造器, 构造与当前光标所在段落类型相同的段落, 如list中的et-li也属于段落, 则应构造et-li而不是et-p
    const paragraphCreator = plainParagraphAllowed
      ? () => ctx.cloneParagraph(false)
      : () => dom.cloneEtParagraph(currP)

    let p: EtParagraphElement | null = null
    let node
    while (node = df.firstChild) {
      if (etcode.check(node, EtTypeEnum.Paragraph)) {
        if (p) {
          resDf.appendChild(p)
          p = null
        }
        // 判断该段落是否被允许在当前段落父节点下, 不允许则创建新“段落”来替换
        if (!etcode.checkIn(effectParent, node.etCode)) {
          const newP = paragraphCreator()
          node.remove()
          newP.append(...node.childNodes)
          resDf.appendChild(newP)
        }
        else {
          // blockquote下, 或同类段落, 直接插入
          resDf.appendChild(node)
        }
      }
      else {
        if (!p) {
          p = paragraphCreator()
        }
        p.appendChild(node)
      }
    }
    df = resDf
  }

  dom.cleanAndNormalizeFragment(df, hasParagraph ? -1 : currP.inEtCode)
  if (!df.childNodes.length) {
    return
  }
  let outermost

  // 有blockquote段落组, 应拆分顶层节点, 即插入到et-body下
  if (hasBlockquote) {
    outermost = ctx.topElement
  }
  else if (hasParagraph) {
    outermost = currP
  }
  // 片段不包含段落, 直接插入当前段落
  else {
    // 片段所有子节点均符合当前效应元素, 直接插入
    if (etcode.checkIn(ctx.effectElement, etcode.checkSum(df))) {
      let insertAt, dest, text
      if (text = ctx.caret.text) {
        if (ctx.caret.offset === 0) {
          insertAt = cr.staticOut(text, -1)
          if (setCaret) dest = cr.staticIn(text, 0)
        }
        else if (ctx.caret.offset === text.length) {
          insertAt = cr.staticOut(text, 1)
        }
        else {
          insertAt = null
        }
      }
      else {
        insertAt = srcCaretRange
      }
      // 光标在文本节点开头/末尾, 或节点间隙中
      if (insertAt) {
        if (setCaret && !dest) {
          const innerLast = dom.innermostEditableEndingNode(df) as Et.HTMLNode
          if (dom.isTextNode(innerLast)) {
            dest = cr.staticIn(innerLast, innerLast.length)
          }
          else {
            dest = cr.dynamicOut(innerLast, 1)
          }
        }
        // 直接插入
        ctx.commandManager.push(cmd.insertContent({
          content: df,
          execAt: insertAt,
          destCaretRange: setCaret ? dest : null,
        }))
        return
      }
      // 光标在文本节点中间
      else {
        // 拆分文本节点插入
        outermost = text!
      }
    }
    // 否则, 拆分效应节点
    else {
      outermost = ctx.effectElement
    }
  }
  // 删除扩大节点, 拆分前后部份尝试与df合并, 并插入被删除位置
  return expandRemoveInsert(ctx, outermost, outermost, srcCaretRange, true, df, setCaret)
}
/**
 * 移除当前选区内容, 若collapsed, 则直接返回
 * * 该方法只push命令, 不handle
 */
export const removeRangingContents = (ctx: Et.EditorContext, isBackward = true) => {
  if (ctx.caret.isCollapsed) {
    return
  }
  const srcCaretRange = ctx.caret.staticRange
  checkTargetRangePosition(ctx, srcCaretRange,
    (currP, text) => {
      if (srcCaretRange.startOffset === 0 && srcCaretRange.endOffset === text.length) {
        ctx.commandManager.push(cmd.removeNode({ node: text }))
      }
      else {
        ctx.commandManager.push(cmd.deleteText({
          text,
          data: text.data.slice(srcCaretRange.startOffset, srcCaretRange.endOffset),
          offset: srcCaretRange.startOffset,
          isBackward,
        }))
      }
    },
    (currP, is) => {
      const [startOutermost, endOutermost] = getRangeOutermostContainerUnderTheParagraph(srcCaretRange, currP)
      expandRemoveInsert(ctx, startOutermost, endOutermost, srcCaretRange, true)
    },
    (p1, p2) => {
      // todo 这里可以优化, 若p1/p2是很大的段落, 那么整体移除会增加内存压力; 对数据而言, 整个段落删除, 也不利于以段落为最小存储单元的应用
      expandRemoveInsert(ctx, p1, p2, srcCaretRange, true)
    },
  )
}
