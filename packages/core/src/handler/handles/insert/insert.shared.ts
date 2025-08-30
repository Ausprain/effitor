import type { Et } from '~/core/@types'
import { etcode } from '~/core/element'
import { cr } from '~/core/selection'
import { dom } from '~/core/utils'

import { cmd } from '../../command'
import { fragmentUtils } from '../../utils'
import { expandRemoveInsert } from '../delete/delete.shared'
import { removeByTargetRange } from '../delete/deleteAtRange'
import { cloneRangeUnselectedContents } from '../shared'

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
    ctx.commandManager.push(cmd.insertText({
      text: targetCaret.container,
      data,
      offset: targetCaret.offset,
      setCaret: true,
    }))
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
  return ctx.commandManager.withTransactionFn((cm) => {
    if (removeByTargetRange(ctx, targetRange) && cm.handle()) {
      const caret = ctx.selection.getTargetCaret()
      if (caret) {
        insertTextAtCaret(ctx, data, caret)
        return cm.handle()
      }
    }
    return false
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
  // 插入效应元素, 判断效应合法性
  if (dom.isEtElement(element) && !etcode.checkIn(targetCaret.anchorEtElement, element.etCode)) {
    ctx.assists.logger?.warn('deny insert element by etcode.checkIn', 'handler')
    return false
  }
  if (!destCaretRange) {
    destCaretRange = cr.caretEndAuto(element)
  }
  return checkSplitTextToInsertNode(ctx, element, targetCaret, destCaretRange)
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
      ctx, contents, targetCaret, targetCaret.anchorParagraph)
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
      ctx, contents, targetCaret, targetCaret.anchorTopElement,
    )
  }
  return true
}

const insertNoParagraphContentsAtCaret = (
  ctx: Et.EditorContext,
  contents: Et.Fragment,
  targetCaret: Et.ValidTargetCaret,
) => {
  const partialNode = targetCaret.getPartialNode('paragraph')
  if (!partialNode) {
    // partial 节点为 null, 说明光标在段落末尾, 直接插入
    // 按当前段落效应清理片段
    fragmentUtils.normalizeAndCleanEtFragment(contents, targetCaret.anchorParagraph, true)
    ctx.commandManager.push(cmd.insertContent({
      content: contents,
      execAt: targetCaret.etCaret,
    }))
    return true
  }
  const etel = targetCaret.anchorEtElement
  if (etel === targetCaret.anchorParagraph) {
    // 当前效应元素就是段落, 直接拆分段落 partial 节点
    fragmentUtils.normalizeAndCleanEtFragment(contents, targetCaret.anchorParagraph, true)
    return expandRemoveInsert(ctx, targetCaret, partialNode, partialNode, contents, true, true)
    // const [df1, df2] = cloneRangeUnselectedContents(
    //   targetCaret,
    //   partialNode,
    //   partialNode,
    //   true,
    // )
    // let df = fragmentUtils.mergeEtFragments(df1, contents)
    // if (destCaretRange) {
    //   df = fragmentUtils.mergeEtFragments(df, df2)
    // }
    // else {
    //   const out = fragmentUtils.getMergedEtFragmentAndCaret(df, df2, false, false)
    //   if (!out) {
    //   // 无合并内容, 不用插入
    //     return true
    //   }
    //   df = out[0]
    //   destCaretRange = out[1]
    // }
    // // 按段落效应清理片段
    // fragmentUtils.cleanAndNormalizeFragment(df, targetCaret.anchorParagraph, true)
    // ctx.commandManager.push(cmd.insertContent({
    //   content: df,
    //   execAt: targetCaret.etCaret,
    //   destCaretRange,
    // }))
    // return true
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
    const partialNode = targetCaret.getPartialNode('etelement')
    // 按效应元素清理片段
    fragmentUtils.normalizeAndCleanEtFragment(contents, targetCaret.anchorEtElement, true)
    if (!partialNode) {
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
  const etParent = ctx.body.findEffectParent(targetCaret.anchorEtElement)
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
) => {
  let isCurrPlainParagraph = true
  const currParagraph = splitParagraph
  if (!ctx.isPlainParagraph(currParagraph)) {
    isCurrPlainParagraph = false
    // 当前段落不是普通段落, 根据效应父节点类型适应为当前段落类别
    const etParent = ctx.body.findEffectParent(currParagraph)
    if (!etParent || !etcode.checkIn(etParent, ctx.schema.paragraph.etType)) {
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
  const partialNode = targetCaret.getPartialNode('paragraph')
  // 取出第一个段落
  const firstParagraph = contents.firstChild
  if (!firstParagraph) {
    return false
  }
  firstParagraph.remove()
  const firstParagraphContents = fragmentUtils.extractNodeContentsToEtFragment(firstParagraph)
  if (!isCurrPlainParagraph) {
    // 非普通段落, 按效应父节点清理片段
    fragmentUtils.normalizeAndCleanEtFragment(
      firstParagraphContents, currParagraph, true)
  }
  if (!partialNode) {
    // 当前光标在段落内末尾, 直接插入第一个段落的内容到当前段落末尾
    const lastChild = firstParagraphContents.lastChild
    if (lastChild) {
      ctx.commandManager.push(cmd.insertContent({
        content: firstParagraphContents,
        execAt: targetCaret.etCaret,
        destCaretRange: cr.caretEndAuto(lastChild),
      }))
    }
    if (contents.hasChildNodes()) {
      // 剩余段落插入当前段落外末尾
      ctx.commandManager.push(cmd.insertContent({
        content: contents,
        execAt: cr.caretOutEnd(currParagraph),
      }))
    }
    return true
  }
  // 拆分 partial 节点, 前半内容与首段落内容合并插回当前段落
  // 后半内容与末段落合并插入新段落, 剩余未选择内容移动到新段落内末尾
  // 中间段落插入当前段落外末尾

  // 1. 获取拆分内容
  let [df1, df2] = cloneRangeUnselectedContents(
    targetCaret,
    partialNode,
    partialNode,
    true,
  )

  // 2. 创建新段落
  const newP = ctx.cloneParagraph(currParagraph)
  // 3. 移动剩余节点到新段落 (如果有)
  const nextChild = partialNode.nextSibling
  if (nextChild) {
    const removeRange = cr.spanRange(nextChild, currParagraph.lastChild)
    if (removeRange) {
      ctx.commandManager.push(cmd.moveNodes(removeRange, cr.caretInStart(newP)))
    }
  }
  // 4. 末段落内容与后半部分内容合并插入新段路内开头
  // 取出最后一个段落
  const lastParagraph = contents.lastChild
  if (lastParagraph) {
    lastParagraph.remove()
    const lastParagraphContents = fragmentUtils.extractNodeContentsToEtFragment(lastParagraph)
    if (!isCurrPlainParagraph) {
      // 非普通段落, 按效应父节点清理片段
      fragmentUtils.normalizeAndCleanEtFragment(lastParagraphContents, newP, true)
    }
    df2 = fragmentUtils.mergeEtFragments(lastParagraphContents, df2)
  }
  if (df2.hasChildNodes()) {
    ctx.commandManager.push(cmd.insertContent({
      content: df2,
      execAt: cr.caretInStart(newP),
    }))
  }
  // 5. 中间段落插入当前段落外末尾
  if (contents.hasChildNodes()) {
    ctx.commandManager.push(cmd.insertContent({
      content: contents,
      execAt: cr.caretOutEnd(currParagraph),
    }))
  }
  // 6. 前半内容与首段落内容合并插入当前段落, 设置最终光标位置
  const out = fragmentUtils.getMergedEtFragmentAndCaret(df1, firstParagraphContents, false, false) // 上游已经 clean
  if (out) {
    df1 = out[0]
  }
  if (df1.hasChildNodes()) {
    ctx.commandManager.push(cmd.insertContent({
      content: df1,
      execAt: targetCaret.etCaret,
      destCaretRange: out ? out[1] : undefined,
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
  element: Et.Element,
  targetCaret: Et.ValidTargetCaret,
  destCaretRange?: Et.CaretRange,
) => {
  // temporary方式插入的最大不同在于, 不考虑插入位置的具体情况; 不拆分节点,
  // 当且仅当插入位置是文本节点时将其拆分; 这样做的好处是避免多余的计算
  // 因为临时插入最终都是要撤销的, 那么就不必考虑文档结构问题
  ctx.commandManager.closeTransaction()
  ctx.commandManager.startTransaction()
  return checkSplitTextToInsertNode(ctx, element, targetCaret, destCaretRange)
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
  return checkSplitTextToInsertNode(ctx, contents, targetCaret, destCaretRange)
}

/**
 * 在一个光标位置插入内容, 若光标在文本节点中间, 则会自动拆分该文本节点
 */
const checkSplitTextToInsertNode = (
  ctx: Et.EditorContext,
  node: Et.Element | Et.Fragment,
  targetCaret: Et.ValidTargetCaret,
  destCaretRange?: Et.CaretRange,
) => {
  let execAt
  const { container, offset } = targetCaret
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
    if (dom.isFragment(node)) {
      node.prepend(preText)
      node.append(postText)
    }
    else {
      const df = document.createDocumentFragment() as Et.Fragment
      df.append(preText, node, postText)
      node = df
    }
    execAt = cr.caretOutStart(container)
    ctx.commandManager.push(cmd.removeNode({ node: container }))
  }

  if (dom.isFragment(node)) {
    ctx.commandManager.push(cmd.insertContent({
      content: node,
      execAt,
      destCaretRange,
    }))
  }
  else {
    ctx.commandManager.push(cmd.insertNode({
      node: node,
      execAt,
      destCaretRange,
    }))
  }

  return true
}
