import { HtmlCharEnum } from '@effitor/shared'

import type { Et } from '../../../@types'
import { etcode } from '../../../element'
import { cr } from '../../../selection'
import { dom } from '../../../utils'
import { cmd } from '../../command'
import { fragmentUtils } from '../../utils'
import { expandRemoveInsert } from '../delete/delete.shared'
import { cloneRangeUnselectedContents } from '../shared'
import { insertParagraphAtCaret } from './insertParagraph'

/**
 * 在光标位置插入文本
 */
export const insertTextAtCaret = (
  ctx: Et.EditorContext,
  data: string,
  targetCaret: Et.ValidTargetCaret,
): true => {
  if (!data) {
    return true
  }
  if (targetCaret.isAtText()) {
    // 若前一个字符是零宽空格, 则替换为当前字符
    const offset = targetCaret.offset
    if (offset > 0 && targetCaret.container.data[offset - 1] === HtmlCharEnum.ZERO_WIDTH_SPACE) {
      ctx.commandManager.push(cmd.replaceText({
        text: targetCaret.container,
        data,
        delLen: 1,
        offset: offset - 1,
        setCaret: true,
      }))
    }
    else {
      ctx.commandManager.push(cmd.insertText({
        text: targetCaret.container,
        data,
        offset: targetCaret.offset,
        setCaret: true,
      }))
    }
  }
  else {
    // 不在#text节点上, 插入新节点
    const node = dom.createText(data)
    ctx.commandManager.push(cmd.insertNode({
      node,
      execAt: targetCaret.etCaret,
      destCaretRange: cr.caret(node, node.length),
    }))
  }
  return true
}

export const insertTextAtRange = (
  ctx: Et.EditorContext,
  data: string,
  targetRange: Et.ValidTargetRange,
) => {
  if (!data) {
    return true
  }
  // 选区在文本节点上, 直接替换
  if (targetRange.isTextCommonAncestor()) {
    ctx.commandManager.push(cmd.replaceText({
      text: targetRange.commonAncestor,
      data,
      delLen: targetRange.endOffset - targetRange.startOffset,
      offset: targetRange.startOffset,
      setCaret: true,
    }))
    return true
  }
  // 选区跨文本节点, 先删除选区
  return ctx.commonHandlers.checkRemoveTargetRange(targetRange, (ctx, caret) => {
    insertTextAtCaret(ctx, data, caret)
    return true
  })
}

/**
 * 在光标位置插入元素
 * @param ctx 编辑器上下文
 * @param element 元素
 * @param targetCaret 目标光标
 * @param destCaretRange 命令结束后光标位置, 若未提供, 则使用插入元素末尾
 */
export const insertElementAtCaret = (
  ctx: Et.EditorContext,
  element: Et.Element,
  targetCaret: Et.ValidTargetCaret,
  destCaretRange?: Et.CaretRange,
) => {
  // 0. 过滤元素, 只接受合法br, 段落, 其他效应元素
  // 1. 是 br, 拆 partial 节点插入
  // 2. 段落效应元素, 先 insertParagraph, 再在光标落点段落前插入
  // 3. 其他效应元素, 逐级向上找到接受此元素效应的效应祖先, 拆该祖先下的 partial 节点插入
  //    若未找到, 则禁止插入

  if (dom.isBrElement(element)) {
    if (!targetCaret.anchorParagraph) {
      return false
    }
    if (splitPartialToInsertElementInEtElement(
      ctx, element, targetCaret.anchorParagraph, targetCaret, destCaretRange,
    )) {
      if (ctx.isPlainParagraph(targetCaret.anchorParagraph)
        && targetCaret.anchorParagraph.lastChild
        && !dom.isBrElement(targetCaret.anchorParagraph.lastChild)
      ) {
        // 普通段落末尾无 br, 则补充一个
        ctx.commandManager.push(cmd.insertNode({
          node: dom.createElement('br'),
          execAt: cr.caretInEndFuture(targetCaret.anchorParagraph),
        }))
      }
      return true
    }
    return false
  }
  if (ctx.isEtParagraph(element)) {
    return insertParagraphElementAtCaret(ctx, element, targetCaret, destCaretRange)
  }
  if (etcode.check(element)) {
    return insertElseEtElementAtCaret(ctx, element, targetCaret, destCaretRange)
  }
  ctx.assists.logger?.warn('deny inserting element', 'handler')
  return false
}
/**
 * 在效应元素(partialParent)节点内部指定光标位置插入元素, 可能需要拆分该节点下的`partial`节点
 * @param ctx 编辑器上下文
 * @param el 元素
 * @param insertIn 要插入元素的效应元素节点
 * @param targetCaret 目标光标
 * @param destCaretRange 命令结束后光标位置, 若未提供, 则使用插入元素末尾
 */
const splitPartialToInsertElementInEtElement = (
  ctx: Et.EditorContext,
  el: Et.Element,
  insertIn: Et.EtElement,
  targetCaret: Et.ValidTargetCaret,
  destCaretRange?: Et.CaretRange,
) => {
  const anchorNode = targetCaret.container
  let insertAt
  if (anchorNode === insertIn) {
    insertAt = targetCaret.etCaret
  }
  else if (dom.isText(anchorNode) && anchorNode.parentNode === insertIn) {
    if (targetCaret.offset === 0) {
      insertAt = cr.caretOutStart(anchorNode)
    }
    else if (targetCaret.offset === anchorNode.length) {
      insertAt = cr.caretOutEnd(anchorNode)
    }
  }
  if (insertAt) {
    ctx.commandManager.push(cmd.insertNode({
      node: el as Et.Element,
      execAt: insertAt,
      destCaretRange,
    }))
    return true
  }
  // 拆 partial 节点
  const partialNode = ctx.body.outerNodeUnder(anchorNode, insertIn)
  if (!partialNode) {
    // 等同于上边 anchorNode === currP, 理论上不会到此
    return false
  }
  const df = document.createDocumentFragment() as Et.Fragment
  df.appendChild(el)
  return expandRemoveInsert(ctx, targetCaret, partialNode, partialNode, df, true, false)
}
const insertParagraphElementAtCaret = (
  ctx: Et.EditorContext,
  pEl: Et.Paragraph,
  targetCaret: Et.ValidTargetCaret,
  destCaretRange?: Et.CaretRange,
) => {
  // 先插入一个"Enter"
  return ctx.commandManager.withTransactionFn((cm) => {
    if (!insertParagraphAtCaret(ctx, targetCaret)) {
      return false
    }
    if (!cm.handle() || !cm.lastCaretRange) {
      return false
    }
    const tc = ctx.selection.createTargetCaret(cm.lastCaretRange)
    if (!tc || !tc.anchorParagraph || !tc.anchorTopElement) {
      return false
    }
    // FIXME 以下判断逻辑尚不完善, 考虑如下情况
    // <et-list>
    //    <et-li>AA</et-li>
    //    <et-li>|BB</et-li>
    // </et-list>
    // 插入 <et-p>, 会变成
    // <et-p></et-p>
    // <et-list>
    //    <et-li>AA</et-li>
    //    <et-li>|BB</et-li>
    // </et-list>
    let insertAt
    if (pEl.localName === tc.anchorParagraph.localName
      || etcode.checkIn(tc.anchorTopElement, pEl)
    ) {
      insertAt = cr.caretOutStart(tc.anchorParagraph)
    }
    else {
      insertAt = cr.caretOutStart(tc.anchorTopElement)
    }
    cm.push(cmd.insertNode({
      node: pEl,
      execAt: insertAt,
      destCaretRange,
    }))
    return true
  })
}
const insertElseEtElementAtCaret = (
  ctx: Et.EditorContext,
  etel: Et.EtElement,
  targetCaret: Et.ValidTargetCaret,
  destCaretRange?: Et.CaretRange,
) => {
  let etParent: Et.EtElement | null = targetCaret.anchorEtElement
  while (etParent) {
    if (etcode.checkIn(etParent, etel)) {
      break
    }
    etParent = ctx.body.findInclusiveEtParent(etParent.parentNode)
  }
  if (etParent) {
    return splitPartialToInsertElementInEtElement(ctx, etel, etParent, targetCaret, destCaretRange)
  }
  ctx.assists.logger?.warn('deny inserting effect element by etcode check', 'handler')
  return false
}

/**
 * 插入内容片段
 * @param ctx 编辑器上下文
 * @param contents 内容片段, 普通段落需先使用 fragmentUtils.normalizeToEtFragment 标准化为适合编辑器文档规范的片段
 * @param targetCaret 目标光标
 * @param destCaretRange 目标光标范围
 */
export const insertContentsAtCaret = (
  ctx: Et.EditorContext,
  contents: Et.Fragment,
  targetCaret: Et.ValidTargetCaret,
) => {
  if (!contents.hasChildNodes()) {
    return true
  }
  if (contents.children.length === 0) {
    return insertTextAtCaret(ctx, contents.textContent, targetCaret)
  }
  if (contents.childNodes.length === 1 && contents.children.length === 1) {
    return insertElementAtCaret(ctx, contents.firstChild as Et.Element, targetCaret)
  }

  // 根据插入内容是否含有段落, 来判断拆分级别
  // 插入内容不含段落, 拆分当前段落 partial 节点内容
  // 含段落, 拆分整个段落, 合并插入
  const {
    hasParagraph, allPlainParagraph,
  } = fragmentUtils.checkEtFragmentHasParagraphAndNormalize(contents, ctx, true)

  if (!hasParagraph) {
    return insertNoParagraphContentsAtCaret(ctx, contents, targetCaret)
  }
  if (!targetCaret.anchorParagraph || !targetCaret.anchorTopElement) {
    if (targetCaret.container === ctx.bodyEl) {
      // 段落缝隙间插入
      ctx.commandManager.push(cmd.insertContent({
        content: contents,
        execAt: targetCaret.etCaret,
      }))
      return true
    }
    return false
  }
  if (allPlainParagraph || targetCaret.anchorParagraph === targetCaret.anchorTopElement) {
    // 拆当前段落
    /**
    <et-p>  // anchorParagraph, anchorTopElement
      AA
      <span>B|B</span>  // partial
      CC
    </et-p>
     */
    return splitParagraphToInsertParagraphContents(
      ctx, contents, targetCaret, targetCaret.anchorParagraph, targetCaret.getPartialNode('paragraph'),
    )
  }
  else {
    // 插入内容不全是普通段落, 且顶层节点不是当前段落, 拆顶层节点
    /**
    <list>  // anchorTopElement
      <li>123</li>
      <list>   // partial
        <li>AA B|B CC</li>  // anchorParagraph
      </list>
    </list>
     */
    return splitParagraphToInsertParagraphContents(
      ctx, contents, targetCaret, targetCaret.anchorTopElement, targetCaret.getPartialNode('topelement'),
    )
  }
}

const insertNoParagraphContentsAtCaret = (
  ctx: Et.EditorContext,
  contents: Et.Fragment,
  targetCaret: Et.ValidTargetCaret,
) => {
  let partialNode = targetCaret.getPartialNode('paragraph')
  if (!partialNode || dom.isBrElement(partialNode)) {
    // partial 节点为 null, 说明光标在段落末尾, 直接插入
    // 按当前段落效应清理片段
    fragmentUtils.normalizeAndCleanEtFragment(contents, targetCaret.anchorParagraph, true)
    const lastChild = contents.lastChild
    if (lastChild) {
      ctx.commandManager.push(cmd.insertContent({
        content: contents,
        execAt: targetCaret.etCaret,
        destCaretRange: cr.caretEndAuto(lastChild),
      }))
    }
    return true
  }
  const etel = targetCaret.anchorEtElement
  if (etel === targetCaret.anchorParagraph) {
    // 当前效应元素就是段落, 直接拆分段落 partial 节点
    fragmentUtils.normalizeAndCleanEtFragment(contents, targetCaret.anchorParagraph, true)
    return expandRemoveInsert(ctx, targetCaret, partialNode, partialNode, contents, true, true)
  }
  // 拆效应元素?
  // 先判断效应
  let allChildAllowIn = true
  for (const child of contents.childNodes) {
    if (!etcode.checkIn(etel, child)) {
      allChildAllowIn = false
      break
    }
  }
  if (allChildAllowIn) {
    // 拆分效应元素 partial 节点
    partialNode = targetCaret.getPartialNode('etelement')
    // 按效应元素清理片段
    fragmentUtils.normalizeAndCleanEtFragment(contents, targetCaret.anchorEtElement, true)
    if (!partialNode || dom.isBrElement(partialNode)) {
      // 直接插入效应元素末尾
      ctx.commandManager.push(cmd.insertContent({
        content: contents,
        execAt: targetCaret.etCaret,
      }))
      return true
    }
    return expandRemoveInsert(ctx, targetCaret, partialNode, partialNode, contents, true, true)
  }
  // 插入内容拥有当前效应元素所不接受的效应子节点, 拆效应元素
  // 用更上层的效应节点清理片段
  const etParent = ctx.body.findInclusiveEtParent(targetCaret.anchorEtElement)
  if (etParent) {
    fragmentUtils.normalizeAndCleanEtFragment(contents, targetCaret.anchorTopElement, true)
  }
  return expandRemoveInsert(ctx, targetCaret, etel, etel, contents, true, true)
}
const splitParagraphToInsertParagraphContents = (
  ctx: Et.EditorContext,
  contents: Et.Fragment,
  targetCaret: Et.ValidTargetCaret,
  splitParagraph: Et.Paragraph,
  /** 光标位置在 splitParagraph 下的最外层祖先节点 */
  partialNode: Et.NodeOrNull,
) => {
  const currParagraph = splitParagraph
  const paragraphEtParent = ctx.body.findInclusiveEtParent(currParagraph)
  let isCurrPlainParagraph = true
  // 当前段落不是普通段落, 规范插入内容以适应当前段落类别
  if (!ctx.isPlainParagraph(currParagraph)) {
    isCurrPlainParagraph = false
    // 当前段落不是普通段落, 根据效应父节点类型适应为当前段落类别
    if (!paragraphEtParent || !etcode.checkIn(paragraphEtParent, ctx.schema.paragraph.etType)) {
      // 当前(目标光标位置)段落无效应父节点(不应该发生), 或效应父节点不接受普通段落效应,
      // 将普通段落转为当前段落类型
      for (const child of contents.childNodes) {
        child.replaceWith(currParagraph.fromPlainParagraph(
          child as Et.Paragraph,
          ctx,
          (node: Node) => {
            return fragmentUtils.getNormalizedNodeContents(node, currParagraph)
          },
        ))
      }
    }
  }
  // 当前段落就是普通段落, 或已经适应段落类别, 直接拆分插入
  const caretAfterCurrP = cr.caretOutEnd(currParagraph)
  // 取出第一个段落
  const firstParagraph = contents.firstChild
  if (!firstParagraph) {
    return true
  }
  // 与当前段落相同类别, 合并内容
  let firstContents
  if (currParagraph.isEqualTo(firstParagraph as Et.Paragraph)) {
    firstParagraph.remove()
    firstContents = fragmentUtils.extractNodeContentsToEtFragment(firstParagraph)
    if (!isCurrPlainParagraph && currParagraph.localName !== firstParagraph.localName) {
      // 当前非普通段落, 按效应父节点清理片段
      fragmentUtils.normalizeAndCleanEtFragment(
        firstContents, currParagraph, true)
    }
  }
  else {
    firstContents = document.createDocumentFragment() as Et.Fragment
    // 当前段落的父效应元素节点接受插入内容的第一个段落, 则将整个段落加入合并
    if (paragraphEtParent && etcode.checkIn(paragraphEtParent, firstParagraph)) {
      firstParagraph.remove()
      firstContents.appendChild(firstParagraph)
    }
  }
  if (!partialNode || dom.isBrElement(partialNode)) {
    // 当前光标在段落内末尾, 直接插入第一个段落的内容到当前段落末尾
    const lastChild = firstContents.lastChild
    if (lastChild) {
      ctx.commandManager.push(cmd.insertContent({
        content: firstContents,
        execAt: targetCaret.etCaret,
        destCaretRange: cr.caretEndAuto(lastChild),
      }))
    }
    if (contents.hasChildNodes()) {
      // 剩余段落插入当前段落外末尾
      ctx.commandManager.push(cmd.insertContent({
        content: contents,
        execAt: caretAfterCurrP,
      }))
    }
    return true
  }
  // 1. 移除 partial 节点, 从光标位置拆分, 前半内容与首段落内容合并插回当前段落
  // 2. 剩余未选择内容移动到新段落内末尾, 后半内容与末段落合并插入新段落内开头, 光标置于合并处,
  // 3. 中间段落插入当前段落外末尾

  let destCaretRange
  // 1. 获取拆分内容, 移除partial 节点
  let [df1, df2] = cloneRangeUnselectedContents(
    targetCaret,
    partialNode,
    partialNode,
    true,
  )
  ctx.commandManager.push(cmd.removeNode({ node: partialNode }))

  // 2. 前半内容与首段落内容合并插入当前段落, 设置最终光标位置
  df1 = fragmentUtils.mergeEtFragments(df1, firstContents)
  const lastChild = df1.lastChild
  if (lastChild) {
    ctx.commandManager.push(cmd.insertContent({
      content: df1,
      execAt: cr.caretOutStart(partialNode),
    }))
    destCaretRange = cr.caretEndAuto(lastChild)
  }

  // 3. 创建新段落
  const newP = ctx.cloneParagraph(currParagraph, false)
  // 4. 移动剩余节点到新段落 (如果有)
  const nextChild = partialNode.nextSibling
  let isEmptyNewP = true
  if (nextChild) {
    const removeRange = cr.spanRange(nextChild, currParagraph.lastChild)
    if (removeRange) {
      isEmptyNewP = false
      ctx.commandManager.push(cmd.moveNodes(removeRange, cr.caretInStart(newP)))
    }
  }
  // 5. 末段落内容与后半部分内容合并插入新段落内开头
  // 取出最后一个段落, 是普通段落或与当前段落类别相同, 抽出内容; 否则原样插入新段落外开头
  destCaretRange = void 0
  const lastParagraph = contents.lastChild
  let lastContents
  if (lastParagraph) {
    if (currParagraph.isEqualTo(lastParagraph as Et.Paragraph)) {
      lastParagraph.remove()
      lastContents = fragmentUtils.extractNodeContentsToEtFragment(lastParagraph)
      if (!isCurrPlainParagraph && currParagraph.localName !== lastParagraph.localName) {
        // 非普通段落, 按效应父节点清理片段
        fragmentUtils.normalizeAndCleanEtFragment(lastContents, newP, true)
      }
    }
    else {
      lastContents = document.createDocumentFragment() as Et.Fragment
      if (paragraphEtParent && etcode.checkIn(paragraphEtParent, lastParagraph)) {
        lastParagraph.remove()
        lastContents.appendChild(lastParagraph)
      }
    }
    const out = fragmentUtils.getMergedEtFragmentAndCaret(
      lastContents, df2, false, false, ctx.affinityPreference,
    )
    if (out) {
      df2 = out[0]
      destCaretRange = out[1]
    }
  }
  if (df2.hasChildNodes()) {
    if (!destCaretRange) {
      // 并没有将 lastParagraph 内容合并, 则光标置于拆分内容后半部的开头
      destCaretRange = cr.caretStartAuto(df2.firstChild as Et.Node)
    }
    isEmptyNewP = false
    ctx.commandManager.push(cmd.insertContent({
      content: df2,
      execAt: cr.caretInStart(newP),
      destCaretRange,
    }))
  }
  // 插入新段落
  if (isEmptyNewP) {
    // 新段落为空, 插入一个br
    newP.appendChild(document.createElement('br'))
    destCaretRange = cr.caretInStart(newP)
  }
  else {
    destCaretRange = undefined
  }
  ctx.commandManager.push(cmd.insertNode({
    node: newP,
    execAt: caretAfterCurrP,
    destCaretRange,
  }))
  // 6. 中间段落插入当前段落外末尾
  if (contents.hasChildNodes()) {
    ctx.commandManager.push(cmd.insertContent({
      content: contents,
      execAt: caretAfterCurrP,
    }))
  }

  return true
}

/**
 * 插入一个临时节点, 不改变文档数据, 但后续必须同步调用 `ctx.commandManager.discord()` 来恢复,
 * 否则文档结构将收到损坏, 或者使用 `insertNodeAtCaret` 方法;\
 * 这对于那些需要实现搜索的插入功能非常有用, 如输入`/`展开一个下拉搜索菜单, 输入文本可搜索, 按下
 * `Enter`后才插入真正的内容
 * * 该方法需要开启一个命令事务, 若在命令事务内, 不要调用此方法
 */
export const insertElementAtCaretTemporarily = (
  ctx: Et.EditorContext,
  element: Element,
  targetCaret: Et.ValidTargetCaret,
  destCaretRange?: Et.CaretRange,
) => {
  // temporary方式插入的最大不同在于, 不考虑插入位置的具体情况; 不拆分节点,
  // 当且仅当插入位置是文本节点时将其拆分; 这样做的好处是避免多余的计算
  // 因为临时插入最终都是要撤销的, 那么就不必考虑文档结构问题
  ctx.commandManager.closeTransaction()
  ctx.commandManager.startTransaction()
  const df = document.createDocumentFragment() as Et.Fragment
  df.appendChild(element)
  return checkSplitTextToInsertContentsTemporarily(ctx, df, targetCaret, destCaretRange)
}

/**
 * 插入一个临时内容片段, 类似`insertNodeAtCaretTemporarily`, 该方法不改变文档数据,
 * 但后续必须同步调用 `ctx.commandManager.discord()` 来恢复, 否则文档结构将收到损坏,
 * 或者使用 `insertContentsAtCaret` 方法
 * * 该方法需要开启一个命令事务, 若在命令事务内, 不要调用此方法
 */
export const insertContentsAtCaretTemporarily = (
  ctx: Et.EditorContext,
  contents: Et.Fragment,
  targetCaret: Et.ValidTargetCaret,
  destCaretRange?: Et.CaretRange,
) => {
  ctx.commandManager.closeTransaction()
  ctx.commandManager.startTransaction()
  return checkSplitTextToInsertContentsTemporarily(ctx, contents, targetCaret, destCaretRange)
}

/**
 * 在一个光标位置插入内容, 若光标在文本节点中间, 则会自动拆分该文本节点
 * * 该方法不会判断插入节点或片段内容在插入位置的合法性
 */
const checkSplitTextToInsertContentsTemporarily = (
  ctx: Et.EditorContext,
  content: Et.Fragment,
  targetCaret: Et.ValidTargetCaret,
  destCaretRange?: Et.CaretRange,
) => {
  if (!content.hasChildNodes()) {
    return false
  }
  let execAt
  const { container, offset } = targetCaret
  if (!destCaretRange) {
    destCaretRange = cr.caretEndAuto(content.lastChild as Et.Node)
  }
  if (!dom.isText(container)) {
    execAt = cr.caret(container, offset)
  }
  else if (offset === 0) {
    execAt = cr.caretOutStart(container)
  }
  else if (offset === container.length) {
    execAt = cr.caretOutEnd(container)
  }
  else {
    const preText = container.data.slice(0, offset)
    const postText = container.data.slice(offset)
    content.prepend(preText)
    content.append(postText)
    execAt = cr.caretOutStart(container)
    ctx.commandManager.push(cmd.removeNode({ node: container }))
  }

  ctx.commandManager.push(cmd.insertContent({
    content: content,
    execAt,
    destCaretRange,
  }))

  return true
}
