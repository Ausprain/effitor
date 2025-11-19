/**
 * TODO 需要优化，现在有多个 normalize 操作，每个操作都要遍历一次片段，效率低，尽量合并，一次遍历搞定
 */

import { EtTypeEnum } from '@effitor/shared'

import type { Et } from '../../@types'
import { etcode } from '../../element'
import { cr } from '../../selection'
import { dom, traversal } from '../../utils'

// 以下节点及其后代保留不clean
const SAVE_ELEMENT_NAMES = ['svg', 'img', 'audio', 'video', 'input', 'textarea']
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
 * @param node 待规范内容(后代)的父节点
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
  const regressNodes: Et.Node[] = []
  traversal.traverseNode(df, void 0, {
    filter: (node) => {
      let reject = filterToNormalize(node, regressNodes, inEtCode, notInEtCode, cleanZWS) === 2
      if (!reject) {
        reject = filterToClean(node, removeNodes) === 2
      }
      return reject ? 2 : 3
    },
  })
  for (const el of regressNodes) {
    const data = el.textContent
    el.replaceWith((data[0] === '\u200B' ? '\u200B' : '') + (data.replaceAll('\u200B', '')))
  }
  for (const node of removeNodes) {
    node.remove()
  }
}
/**
 *
 * 将片段原地标准化为一个符合 Effitor 内容规范的片段;
 *
 * 标准:
 * 1. 若片段内含有段落, 则片段的所有直接子节点只能是段落, 若子节点不是段落, 将会转为纯文本并替换为一个新的普通段落
 * 2. 删除不符合效应规则的子节点, 替换为纯文本; （etElement非空时启用）
 * 3. 合并相邻文本节点并去除空节点, 可选删除非开头零宽字符
 *
 * @param df 待规范片段
 * @param etElement 规范目标效应元素(可视为规范内容的未来父节点), 将使用其配置的效应规则(inEtCode, notInEtCode)对内容进行规范化;
 *                  若缺省, 则默认所有效应都符合规范
 * @param cleanZWS 是否清除非开头零宽字符, 默认true
 * @returns hasParagraph 片段内是否含et 段落, allPlainParagraph 所有段落是否都是普通段落
 */
export const normalizeToEtFragment = (
  df: DocumentFragment, ctx: Et.EditorContext,
  etElement?: Et.EtElement | null, cleanZWS = true,
) => {
  // 清除空文本节点并合并相邻文本节点
  df.normalize()
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
  // 若片段内含有段落, 则片段的所有直接子节点只能是段落
  if (hasParagraph) {
    const nodeToRemove = []
    for (const node of df.childNodes) {
      if (!ctx.isEtParagraph(node)) {
        const data = ctx.isEtElement(node) ? node.contentText : node.textContent
        if (!data) {
          // 删除空节点; 迭代器内不可删除节点, 延迟删除
          nodeToRemove.push(node)
        }
        else {
          const newP = ctx.createPlainParagraph(false)
          newP.textContent = data
          node.replaceWith(newP)
        }
        continue
      }
      if (allPlainParagraph && !ctx.isPlainParagraph(node)) {
        allPlainParagraph = false
      }
    }
    for (const node of nodeToRemove) {
      node.remove()
    }
  }
  if (etElement) {
    // 不符合效应规范的节点，回退为纯文本
    const regressEls: Et.EtElement[] = []
    const { inEtCode, notInEtCode } = etElement
    traversal.traverseNode(df, void 0, {
      filter: (node) => {
        if (ctx.isPlainParagraph(node) && !node.textContent) {
          // 空内容段落，插入一个换行
          ctx.appendBrToElement(node)
          return 2 /** NodeFilter.FILTER_REJECT */
        }
        return filterToNormalize(node, regressEls, inEtCode, notInEtCode, cleanZWS)
      },
    })
    for (const el of regressEls) {
      const data = el.textContent
      // 替换为纯文本，保留开头第一个零宽字符
      el.replaceWith((data[0] === '\u200B' ? '\u200B' : '') + (data.replaceAll('\u200B', '')))
    }
  }
  else {
    df.querySelectorAll(ctx.schema.paragraph.elName).forEach((p) => {
      if (!p.textContent) {
        // 空内容段落，插入一个换行
        ctx.appendBrToElement(p as Et.EtParagraph)
      }
    })
  }
  return {
    hasParagraph, allPlainParagraph,
  }
}
const filterToNormalize = (
  node: Et.Node, nodesToRegress: Et.Node[],
  inEtCode: number, notInEtCode: number, cleanZWS: boolean,
) => {
  if (cleanZWS && dom.isText(node)) {
    const data = node.data
    // 清除非开头零宽字符
    node.data = (data[0] === '\u200B' ? '\u200B' : '') + (data.replaceAll('\u200B', ''))
    return 3 /** NodeFilter.FILTER_SKIP */
  }
  if (inEtCode === EtTypeEnum.PlainText) {
    // 父节点只允许纯文本
    nodesToRegress.push(node)
    return 2 /** NodeFilter.FILTER_REJECT */
  }
  if (inEtCode && dom.isEtElement(node)) {
    let etP: Et.EtElement | number | null = dom.findEffectParent(node)
    if (!etP || etP === node) {
      etP = inEtCode
    }
    if (!etcode.checkIn(etP, node.etCode, notInEtCode)) {
      // 子效应不符合父节点效应, 替换为纯文本; 跳过后代
      nodesToRegress.push(node)
      return 2 /** NodeFilter.FILTER_REJECT */
    }
  }
  return 3 /** NodeFilter.FILTER_SKIP */
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

/**
 * 过滤节点
 */
const filterToClean = (node: Et.Node, nodesToRemove: ChildNode[]) => {
  if (!dom.isElementOrText(node)) {
    nodesToRemove.push(node)
    return 2 /** NodeFilter.FILTER_REJECT */
  }
  if (node.localName === 'br') {
    // 若某节点下只有一个br, 则移除
    if (!node.previousSibling && !node.nextSibling) {
      nodesToRemove.push(traversal.outermostAncestorWithSelfAsOnlyChild(node, false))
    }
    return 2 /** NodeFilter.FILTER_REJECT */
  }

  // 移除元素 id 属性;
  // 空元素移除 (不含 br, br 在上述逻辑中处理)
  if (node.nodeType === 1) {
    if (etcode.check(node)) {
      dom.removeStatusClassForEl(node)
      // 组件和嵌入元素整体保留
      if (etcode.check(node, EtTypeEnum.Component | EtTypeEnum.Embedment)) {
        return 2 /** NodeFilter.FILTER_REJECT */
      }
    }
    // 保留 svg/img/textarea 等空内容元素节点
    else if (SAVE_ELEMENT_NAMES.includes(node.localName)) {
      return 2 /** NodeFilter.FILTER_REJECT */
    }
    if (!node.textContent && (
      !node.firstElementChild
      || !SAVE_ELEMENT_NAMES.includes(node.firstElementChild.localName)
    )) {
      // 不可边遍历边移除, node从父节点移除后其nextSibling为 null, 会终止遍历
      nodesToRemove.push(node)
      // 节点被移除, 不应再遍历其后代
      return 2 /** NodeFilter.FILTER_REJECT */
    }
    else if ((node as Element).id) {
      (node as Element).removeAttribute('id')
    }
  }
  // 其他节点跳过walk, 但继续遍历其后代
  return 3 /** NodeFilter.FILTER_SKIP */
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
  clean = true,
): Et.Fragment => {
  if (clone) {
    f1 = f1.cloneNode(true) as Et.Fragment
    f2 = f2.cloneNode(true) as Et.Fragment
  }
  if (clean) {
    cleanEtFragment(f1)
    cleanEtFragment(f2)
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
): [Et.Fragment, Et.EtCaret] | null => {
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
      if (affinityToFormer) {
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

/* -------------------------------------------------------------------------- */
/*                               copy & paste                                 */
/* -------------------------------------------------------------------------- */

/**
 * 将etFragment 序列化为etHtml; 会调用效应元素的 onAfterCopy方法
 */
export const parseEtFragmentToEtHtml = (ctx: Et.EditorContext, df: DocumentFragment) => {
  const nodesToRemove: Et.EtElement[] = []
  const nodesToReplace = new Map<Et.EtElement, HTMLElement>()
  traversal.traverseNode(df, null, {
    whatToShow: 1, /** NodeFilter.SHOW_ELEMENT */
    filter(el) {
      if (etcode.check(el)) {
        const res = el.onAfterCopy(ctx)
        if (!res) {
          nodesToRemove.push(el)
          return 2 /** NodeFilter.FILTER_REJECT */
        }
        if (res !== el) {
          nodesToReplace.set(el, res)
          return 2 /** NodeFilter.FILTER_REJECT */
        }
        dom.removeStatusClassForEl(el)
      }
      // 不需要走 walk，直接跳过
      return 3 /** NodeFilter.FILTER_SKIP */
    },
  })
  nodesToRemove.forEach(el => el.remove())
  nodesToReplace.forEach((rep, el) => {
    el.replaceWith(rep)
  })
  return dom.fragmentToHTML(df)
}
/**
 * 将etFragment 序列化为nativeHtml; 会调用效应元素的 toNativeElement方法
 */
export const parseEtFragmentToNativeHTML = (ctx: Et.EditorContext, df: DocumentFragment) => {
  const nodesToRemove: Et.EtElement[] = []
  const nodesToReplace = new Map<Et.EtElement, HTMLElement>()
  const nodesToReplaceWithoutChildren = new Map<Et.EtElement, HTMLElement>()
  traversal.traverseNode(df, null, {
    whatToShow: 1 /** NodeFilter.SHOW_ELEMENT */,
    filter(el) {
      if (etcode.check(el)) {
        const res = el.toNativeElement(ctx)
        if (!res) {
          nodesToRemove.push(el)
          return 2 /** NodeFilter.FILTER_REJECT */
        }
        if (typeof res === 'function') {
          nodesToReplace.set(el, res())
          return 2 /** NodeFilter.FILTER_REJECT */
        }
        nodesToReplaceWithoutChildren.set(el, res)
      }
      return 3 /** NodeFilter.FILTER_SKIP */
    },
  })
  nodesToRemove.forEach(el => el.remove())
  nodesToReplace.forEach((rep, el) => {
    el.replaceWith(rep)
  })
  nodesToReplaceWithoutChildren.forEach((rep, el) => {
    el.replaceWith(rep)
    let node = el.firstChild
    while (node) {
      rep.appendChild(node)
      node = node.nextSibling
    }
  })
  return dom.fragmentToHTML(df)
}
/**
 * 将etHtml 序列化为etFragment; 会调用效应元素的 onBeforePaste方法
 */
export const parseEtHtmlFromPaste = (ctx: Et.EditorContext, etHtml: string) => {
  const df = ctx.createFragment(etHtml)
  const nodesToRemove: Et.EtElement[] = []
  const nodesToReplace = new Map<Et.EtElement, HTMLElement>()
  traversal.traverseNode(df, null, {
    whatToShow: 1, /** NodeFilter.SHOW_ELEMENT */
    filter(el) {
      if (etcode.check(el)) {
        const res = el.onBeforePaste(ctx)
        if (!res) {
          nodesToRemove.push(el)
          return 2 /** NodeFilter.FILTER_REJECT */
        }
        if (res !== el) {
          nodesToReplace.set(el, res)
          return 2 /** NodeFilter.FILTER_REJECT */
        }
      }
      // 不需要走 walk，直接跳过
      return 3 /** NodeFilter.FILTER_SKIP */
    },
  })
  nodesToRemove.forEach(el => el.remove())
  nodesToReplace.forEach((rep, el) => {
    el.replaceWith(rep)
  })
  return df
}
