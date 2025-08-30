import type { Et } from '~/core/@types'
import { etcode } from '~/core/element'
import { cr } from '~/core/selection'
import { dom, traversal } from '~/core/utils'

/* -------------------------------------------------------------------------- */
/*                               clean fragment                               */
/* -------------------------------------------------------------------------- */

/**
 * 从节点中提取内容, 并返回包含提取内容的片段
 * @param node 待提取内容的节点
 * @returns 提取后的内容片段
 */
export const extractNodeContentsToEtFragment = (node: Node) => {
  const df = document.createDocumentFragment() as Et.Fragment
  let firstChild = node.firstChild
  while (firstChild) {
    df.appendChild(firstChild)
    firstChild = node.firstChild
  }
  return df
}
/**
 * 规范化节点内容(即childNodes), 并返回包含规范化内容的片段
 * @param node 待规范内容(后代)的节点
 * @param normalizeFor 规范化目标效应元素(可视为规范化内容的未来父节点), 将使用其配置的效应规则对内容进行规范化
 * @param clone 是否克隆节点, 默认为false
 * @returns 规范化后的节点内容片段
 */
export const getNormalizedNodeContents = (
  node: Node,
  normalizeFor: Et.EtElement,
  clone = false,
) => {
  if (clone) {
    node = node.cloneNode(true)
  }
  const df = extractNodeContentsToEtFragment(node)
  if (df.hasChildNodes()) {
    normalizeAndCleanEtFragment(df, normalizeFor, true)
  }
  return df
}
/** 标准化并清理片段 */
export const normalizeAndCleanEtFragment = (
  df: Et.Fragment, etElement?: Et.EtElement | null, cleanZWS = true,
) => {
  // 只有一个br, 直接返回
  if (df.childNodes.length === 0 || (df.childNodes.length === 1 && df.childNodes[0].localName === 'br')) {
    return df
  }
  df.normalize()
  const { inEtCode, notInEtCode } = etElement ? etElement : { inEtCode: -1, notInEtCode: 0 }
  const removeNodes: ChildNode[] = []
  const regressEls: Et.EtElement[] = []
  traversal.traverseNode(df, void 0, {
    filter: (node) => {
      let reject = filterToNormalize(node, regressEls, inEtCode, notInEtCode, cleanZWS) === 2
      reject = filterToClean(node, removeNodes) === 2
      return reject ? 2 : 3
    },
  })
  for (const el of regressEls) {
    const data = el.textContent
    el.replaceWith((data[0] === '\u200B' ? '\u200B' : '') + (data.replaceAll('\u200B', '')))
  }
  for (const node of removeNodes) {
    node.remove()
  }
}
/**
 * 规范化片段, 删除不符合效应规则的子节点, 替换为纯文本; 合并相邻#text, 并可选删除非开头零宽字符
 * @param df 待规范片段
 * @param inEtCode 规范最外层效应码, 默认-1; 传入0, 则不进行效应类型校验;
 *  传入-1, 则最外层允许所有效应, 内层及其他值的校验规则符合etcode.checkIn;\
 *  若要clean的片段将要插入到编辑器中, 则应提供插入位置的effectElement的inEtCode值;
 *  以判断df中的某些节点是否符合该效应规则, 若不符合, 则替换为纯文本节点
 * @param cleanZWS 是否清除非开头零宽字符, 默认true
 */
export const normalizeEtFragment = (
  df: Et.Fragment, etElement?: Et.EtElement | null, cleanZWS = true,
) => {
  const { inEtCode, notInEtCode } = etElement ? etElement : { inEtCode: -1, notInEtCode: 0 }
  const regressEls: Et.EtElement[] = []
  traversal.traverseNode(df, void 0, {
    filter: (node) => {
      return filterToNormalize(node, regressEls, inEtCode, notInEtCode, cleanZWS)
    },
  })
  for (const el of regressEls) {
    const data = el.textContent
    el.replaceWith((data[0] === '\u200B' ? '\u200B' : '') + (data.replaceAll('\u200B', '')))
  }
  // 清除空文本节点并合并相邻文本节点
  // TODO 将该操作并入上述遍历过程
  df.normalize()
}
const filterToNormalize = (
  node: Et.Node, regressEls: Et.EtElement[],
  inEtCode: number, notInEtCode: number, cleanZWS: boolean,
) => {
  if (cleanZWS && dom.isText(node)) {
    const data = node.data
    // 清除非开头零宽字符
    node.data = (data[0] === '\u200B' ? '\u200B' : '') + (data.replaceAll('\u200B', ''))
    return 3 /** NodeFilter.FILTER_SKIP */
  }
  if (inEtCode && dom.isEtElement(node)) {
    let etP: Et.EtElement | number | null = dom.findEffectParent(node)
    if (!etP || etP === node) {
      etP = inEtCode
    }
    if (!etcode.checkIn(etP, node.etCode, notInEtCode)) {
      // 子效应不符合父节点效应, 替换为纯文本; 跳过后代
      regressEls.push(node)
      return 2 /** NodeFilter.FILTER_REJECT */
    }
  }
  return 3 /** NodeFilter.FILTER_SKIP */
}
/**
 * 将片段标准化为一个符合 Effitor 内容规范的片段;
 * 目前的标准是:
 * 1. 效应元素嵌套符合各自的效应码配置
 * 2. 若片段内含有段落, 则片段的所有直接子节点只能是段落; 若不是段落, 将会转为纯文本并替换为一个新的普通段落
 * @param df 待规范片段
 * @param ctx 编辑器上下文
 * @returns 标准化后的 df 本身
 */
export const normalizeToEtFragment = (df: DocumentFragment, ctx: Et.EditorContext) => {
  let hasParagraph = false
  traversal.traverseNode(df, (node) => {
    if (ctx.isEtParagraph(node)) {
      hasParagraph = true
      return true
    }
    return false
  })
  if (hasParagraph) {
    // 若片段内含有段落, 则片段的所有直接子节点只能是段落
    const nodeToRemove = []
    for (const node of df.childNodes) {
      if (!ctx.isEtParagraph(node)) {
        if (!node.textContent) {
          // 迭代器内不可删除节点, 延迟删除
          nodeToRemove.push(node)
        }
        else {
          const newP = ctx.createParagraph(false)
          newP.textContent = node.textContent
          node.replaceWith(newP)
        }
      }
    }
    for (const node of nodeToRemove) {
      node.remove()
    }
  }
  return df as Et.Fragment
}
/**
 * 清洗片段,
 * * 去除效应元素的状态css类名,
 * * 去掉空内容节点（保留<br><img><svg><audio><video>;
 * 但若某节点只有一个br作为子节点, 则该节点会被清理掉）
 * * 去掉元素 id 属性
 * @param df 要clean的片段
 * @returns df 自身
 */
export const cleanEtFragment = (df: Et.Fragment) => {
  // 只有一个br, 直接返回
  if (df.childNodes.length === 0 || (df.childNodes.length === 1 && df.childNodes[0].localName === 'br')) {
    return df
  }
  // 先清除空文本节点并合并相邻文本节点
  df.normalize()
  const removeNodes: ChildNode[] = []
  traversal.traverseNode(df, void 0, {
    filter: (node) => {
      return filterToClean(node, removeNodes)
    },
  })
  for (const node of removeNodes) {
    node.remove()
  }
  return df
}

const filterToClean = (node: Et.Node, recordArray: ChildNode[]) => {
  if (node.localName === 'br') {
    // 若某节点下只有一个br, 则移除
    if (!node.previousSibling && !node.nextSibling) {
      recordArray.push(traversal.outermostAncestorWithSelfAsOnlyChild(node))
    }
    return 2 /** NodeFilter.FILTER_REJECT */
  }
  // 以下节点及其后代保留不clean
  // svg元素的nodeName是小写
  else if (['svg', 'img', 'audio', 'video'].includes(node.localName)) {
    return 2 /** NodeFilter.FILTER_REJECT */
  }
  // 移除元素 id 属性;
  // 空元素移除 (不含 br, br 在上述逻辑中处理)
  if (node.nodeType === 1) {
    if (!node.textContent) {
      // 不可边遍历边移除, node从父节点移除后其nextSibling为 null, 会终止遍历
      recordArray.push(node)
      // 节点被移除, 不应再遍历其后代
      return 2 /** NodeFilter.FILTER_REJECT */
    }
    else if ((node as Element).id) {
      (node as Element).removeAttribute('id')
    }
  }
  if (dom.isEtElement(node)) {
    dom.removeStatusClassForEl(node)
  }
  // 其他节点跳过walk, 但继续遍历其后代
  return 3 /** NodeFilter.FILTER_SKIP */
}

/**
 * 检查片段是否包含段落, 若包含, 则标准化片段; 若不包含, 则不做处理
 * @returns hasParagraph: 是否包含段落, allPlainParagraph: 是否所有段落都是普通段落
 */
export const checkEtFragmentHasParagraphAndNormalize = (
  df: Et.Fragment, ctx: Et.EditorContext, clean: boolean,
) => {
  let hasParagraph = false, allPlainParagraph = true
  traversal.traverseNode(df, (el) => {
    if (ctx.isEtParagraph(el)) {
      hasParagraph = true
      return true
    }
    return false
  }, {
    whatToShow: 1, /** NodeFilter.SHOW_ELEMENT */
  })
  if (hasParagraph) {
    let needToNorm = false
    for (const node of df.childNodes) {
      if (!ctx.isPlainParagraph(node)) {
        allPlainParagraph = false
        break
      }
      if (!needToNorm) {
        // 有不是段落直接子节点, 需要规范化
        if (!ctx.isEtParagraph(node)) {
          needToNorm = true
        }
      }
    }
    if (needToNorm) {
      normalizeToEtFragment(df, ctx)
    }
  }
  if (clean) {
    cleanEtFragment(df)
  }
  return { hasParagraph, allPlainParagraph }
}

/* -------------------------------------------------------------------------- */
/*                               merge fragment                               */
/* -------------------------------------------------------------------------- */

/**
 * 合并俩片段, 返回合并后的片段; 该方法不会清理片段, 即合并结果可能含空节点
 * @param clone 是否将片段克隆后再合并, 默认false (因为传入的片段本身就是克隆的)
 */
export const mergeEtFragments = (
  f1: Et.Fragment,
  f2: Et.Fragment,
  clone = false,
): Et.Fragment => {
  if (clone) {
    f1 = f1.cloneNode(true) as Et.Fragment
    f2 = f2.cloneNode(true) as Et.Fragment
  }

  if (!f1.childNodes.length && !f2.childNodes.length) {
    return document.createDocumentFragment() as Et.Fragment
  }
  else if (!f2.childNodes.length) {
    // 后空前不空
    return f1
  }
  else if (!f1.childNodes.length) {
    // 前空后不空
    return f2
  }
  // 前后都不空, 判断是否合并
  const formerEnd = f1.lastChild as Et.HTMLNode,
    latterStart = f2.firstChild as Et.HTMLNode

  mergeHtmlNode(formerEnd, latterStart)
  f1.append(f2)

  return f1
}
/**
 * 合并俩片段, 中间位置插入文本, 返回合并后的片段和插入文本后的中间位置
 */
export const mergeEtFragmentsWithText = (
  f1: Et.Fragment,
  f2: Et.Fragment,
  text: string,
  clone = false,
  clean = true,
) => {
  if (clone) {
    f1 = f1.cloneNode(true) as Et.Fragment
    f2 = f2.cloneNode(true) as Et.Fragment
  }

  let preLast = f1.lastChild as Et.Node
  if (preLast) {
    preLast = traversal.innermostEditableLastChild(preLast)
  }
  if (dom.isText(preLast)) {
    preLast.data += text
  }
  else {
    preLast = document.createTextNode(text) as Et.Text
    f1.appendChild(preLast)
  }
  return getMergedEtFragmentAndCaret(f1, f2, false, clean)
}
/**
 * 合并俩片段, 返回合并后的片段和光标位置, 返回的片段至少有一个子节点
 * @param clone 是否克隆, 默认`false`
 * @param clean 是否清理片段, 默认`true`
 * @param affinityToFormer 合并边缘遇到文本节点时, 是否优先亲和到前者节点内末尾(true), 详见 {@link mergeHtmlNode}
 * @returns 一个二元组 [合并后的片段, 合并处光标位置], 或 `null` 当两个片段清理后都为空时
 */
export const getMergedEtFragmentAndCaret = (
  f1: Et.Fragment,
  f2: Et.Fragment,
  clone = false,
  clean = true,
  affinityToFormer?: boolean,
): [Et.Fragment, Et.CaretRange] | null => {
  if (clone) {
    f1 = f1.cloneNode(true) as Et.Fragment
    f2 = f2.cloneNode(true) as Et.Fragment
  }
  if (clean) {
    cleanEtFragment(f1)
    cleanEtFragment(f2)
  }

  if (!f1.childNodes.length && !f2.childNodes.length) {
    return null
  }
  else if (!f2.childNodes.length) {
    // 后空前不空, 光标定位于前片段的最内层节点末尾
    let inner = f1.lastChild as Et.HTMLNode
    inner = traversal.innermostEditableLastChild(inner) as Et.HTMLNode
    if (dom.isText(inner)) {
      return [f1, cr.caret(inner, inner.length)]
    }
    else {
      return [f1, cr.caretOutEnd(inner)]
    }
  }
  else if (!f1.childNodes.length) {
    // 前空后不空, 光标定位于后片段最内侧节点开头
    let inner = f2.firstChild as Et.HTMLNode
    inner = traversal.innermostEditableFirstChild(inner) as Et.HTMLNode
    if (dom.isText(inner)) {
      return [f2, cr.caret(inner, 0)]
    }
    else {
      return [f2, cr.caretOutStart(inner)]
    }
  }
  // 前后都不空, 判断是否合并
  const formerEnd = f1.lastChild as Et.HTMLNode,
    latterStart = f2.firstChild as Et.HTMLNode

  const caret = mergeHtmlNode(formerEnd, latterStart, affinityToFormer)
  if (!caret) {
    return null
  }
  f1.append(f2)

  // TODO 再次判断是否有空节点是否必要?
  // todo 若合并前fragment已经clean , 则此处不会出现空节点; 但尚不确定合并前能否clean
  // let node = caret.anchor
  // if (node.nodeType !== 3 && node.childNodes.length === 0) {
  //   // 光标基准节点无子节点, 会被clean, 需重新定位光标位置
  //   while (node) {
  //     if (node.previousSibling) {
  //       if (node.previousSibling.nodeType === 3) {
  //         caret = cr.caret(node.previousSibling, Infinity)
  //       }
  //       else {
  //         caret = cr.caretOutEnd(node.previousSibling)
  //       }
  //       break
  //     }
  //     if (node.nextSibling) {
  //       if (node.nextSibling.nodeType === 3) {
  //         caret = cr.caret(node.nextSibling, 0)
  //       }
  //       else {
  //         caret = cr.caretOutStart(node.nextSibling)
  //       }
  //       break
  //     }
  //     node = node.parentElement as Et.Node
  //   }
  //   if (!node) {
  //     // 全是空节点, 直接返回null
  //     return null
  //   }
  // }

  // cleanFragment(f1)   // todo: 合并后再次clean是否必要?
  return [f1, caret]
}
/**
 * 克隆俩节点或片段, 并合并成一个片段, 返回合并后的片段和光标位置
 * @param n1 片段或节点
 * @param n2 片段或节点
 * @param clean 是否清理片段, 默认`true`
 * @returns 一个二元组 [合并后的片段, 合并处光标位置], 或 `null` 当两个片段清理后都为空时
 */
export const cloneAndMergeNodesToEtFragmentAndCaret = (
  n1: Et.Node | Et.Fragment,
  n2: Et.Node | Et.Fragment,
  clean = true,
) => {
  n1 = n1.cloneNode(true) as Et.Node | Et.Fragment
  n2 = n2.cloneNode(true) as Et.Node | Et.Fragment
  if (!dom.isFragment(n1)) {
    const df = document.createDocumentFragment() as Et.Fragment
    df.appendChild(n1)
    n1 = df
  }
  if (!dom.isFragment(n2)) {
    const df = document.createDocumentFragment() as Et.Fragment
    df.appendChild(n2)
    n2 = df
  }
  return getMergedEtFragmentAndCaret(n1, n2, false, clean)
}

/* -------------------------------------------------------------------------- */
/*                              merge html node                               */
/* -------------------------------------------------------------------------- */

/**
 * 合并俩html节点, 返回中间位置; 若合并了, 则会删除后节点(调用latter.remove())
 * @param affinityToFormer 合并边缘遇到文本节点时, 是否优先亲和到前者节点内末尾(true),
 *    false 优先定位到后者节点内开头,
 *    undefined, 定位到到文本节点(无论其是前者还是后者)
 * @example
 * // `<b>bb</b>` 与 `cc` 合并
 * true -> <b>bb|</b>cc
 * false/undefined -> <b>bb</b>|cc
 * // `aa` 与 `<b>bb</b>` 合并
 * true/undefined -> aa|<b>bb</b>
 * false -> aa<b>|bb</b>
 * @returns 当且仅当former和latter都为空时返回null
 */
export const mergeHtmlNode = (
  former: Et.NodeOrNull, latter: Et.NodeOrNull,
  affinityToFormer?: boolean,
): Et.EtCaret | null => {
  if (former && latter) {
    const formerType = former.nodeType
    const latterType = latter.nodeType
    if (formerType === 3 && latterType === 3) {
      const offset = (former as Text).length
                ; (former as Text).data += (latter as Text).data
      latter.remove()
      return cr.caret(former, offset)
    }
    else if (formerType === 3) {
      if (affinityToFormer === false) {
        // 需要优先亲和到后者开头
        const latterFirst = traversal.innermostEditableFirstChild(latter)
        return cr.caret(latterFirst, 0)
      }
      return cr.caret(former, (former as Text).length)
    }
    else if (latterType === 3) {
      if (affinityToFormer === true) {
        // 需要优先亲和到前者末尾
        const formerLast = traversal.innermostEditableLastChild(former)
        return cr.caretInEnd(formerLast)
      }
      return cr.caretInStart(latter)
    }
    // FIXME: solve other elements which are not HTMLElement
    // 都是元素, 尝试合并
    return mergeHtmlElement(former as Et.HTMLElement, latter as Et.HTMLElement)
  }
  else if (former) {
    const innermost = traversal.innermostEditableLastChild(former)
    if (innermost.nodeType === 3) {
      return cr.caret(innermost, (innermost as Text).length)
    }
    return cr.caretInEnd(former)
  }
  else if (latter) {
    const innermost = traversal.innermostEditableFirstChild(latter)
    if (innermost.nodeType === 3) {
      return cr.caretInStart(innermost)
    }
    return cr.caretInStart(latter)
  }
  else {
    return null
  }
}
export type MergeHtmlNode = typeof mergeHtmlNode
/**
 * 合并俩元素, 返回中间位置; 若合并了, 则会删除后元素(调用latter.remove())
 * @param affinityToFormer 合并边缘遇到文本节点时, 是否优先亲和到前者节点内末尾(true), 详见 {@link mergeHtmlNode}
 */
export const mergeHtmlElement = (
  former: Et.HTMLElement, latter: Et.HTMLElement,
  affinityToFormer?: boolean,
) => {
  // 判断俩元素是否不可合并
  if (former.tagName !== latter.tagName) {
    // 不合并, 找最内层可编辑边缘节点, 定位光标
    return innermostMiddlePosition(former, latter)
  }
  if (dom.isEtElement(former)) {
    if (!former.isEqualTo(latter)) {
      // 非可合并et元素
      return innermostMiddlePosition(former, latter)
    }
    const caretRange = former.mergeWith(latter as Et.EtElement, mergeHtmlNode)
    if (caretRange) {
      latter.remove()
      return caretRange
    }
    return innermostMiddlePosition(former, latter)
  }
  else if (!dom.isEqualElement(former, latter)) {
    // 非可合并普通元素
    return innermostMiddlePosition(former, latter)
  }

  // 俩元素可合并, 尝试合并相邻子节点
  let out = mergeHtmlNode(former.lastChild, latter.firstChild, affinityToFormer)
  if (out) {
    // 合并剩下的子节点
    former.append(...latter.childNodes)
  }
  else {
    out = cr.caretInEnd(former)
  }
  // 移除后者
  latter.remove()
  return out
}
/**
 * 返回两个节点的中间位置; 当且仅当两者都为空时返回null \
 * 中间位置是指, 这两个节点相邻时, 光标位于其两者中间的CaretRange位置
 */
const innermostMiddlePosition = (former: Et.HTMLNodeOrNull, latter: Et.HTMLNodeOrNull) => {
  let inner: Et.NodeOrNull = null
  let caretRange
  let toFormer = true

  if (!former && !latter) {
    return null
  }
  if (former) {
    inner = traversal.innermostEditableLastChild(former)
    if (inner === former && latter) {
      inner = traversal.innermostEditableFirstChild(latter)
      if (inner !== latter) {
        toFormer = false
      }
    }
  }
  else /** if (latter) */ {
    inner = traversal.innermostEditableFirstChild(latter as Et.Node) // not null
    toFormer = false
  }

  if (toFormer) {
    if (inner.nodeType === 3) {
      caretRange = cr.caretInEnd(inner as Et.Text)
    }
    else {
      caretRange = cr.caretOutEnd(inner as Et.HTMLElement)
    }
  }
  else {
    if (inner.nodeType === 3) {
      caretRange = cr.caretInStart(inner as Et.Text)
    }
    else {
      caretRange = cr.caretOutStart(inner as Et.HTMLElement)
    }
  }

  return caretRange
}
