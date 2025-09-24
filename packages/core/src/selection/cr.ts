/**
 * 使用 Caret and Range 管理编辑器命令的光标位置
 */

import type { Et } from '../@types'
import { dom } from '../utils'
import type { CaretRange } from './CaretRange'
import { EtCaret } from './EtCaret'
import { EtRange } from './EtRange'
import { SpanRange } from './SpanRange'

/**
 * cr 是一个工具, 可用于创建 EtCaret, EtRange, SpanRange 实例; \
 */
export const cr = {
  /** 定位于锚点节点外开头 */
  BEFORE_ANCHOR: -Infinity,
  /** 定位于锚点节点外结尾 */
  AFTER_ANCHOR: Infinity,
  /** 定位于锚点节点内结尾 */
  ANCHOR_IN_END: 999999999,

  /**
   * 使用一个 range对象创建 EtCaret, EtRange 实例
   */
  fromRange: (range: AbstractRange): CaretRange => {
    let _cr
    if (range.collapsed) {
      _cr = new EtCaret(range.startContainer as Et.Node, range.startOffset)
    }
    else {
      _cr = new EtRange(range.startContainer as Et.Node,
        range.startOffset, range.endContainer as Et.Node, range.endOffset,
      )
    }
    if (range instanceof Range) {
      _cr.markValid()
    }
    return _cr
  },
  /**
   * 获取 Range 对应的 'StaticRange', 该 'StaticRange' 是一个对象字面量, 而非 StaticRange 的实例
   */
  // static: (range: Range) => {
  //   return {
  //     collapsed: range.collapsed,
  //     endContainer: range.endContainer,
  //     endOffset: range.endOffset,
  //     startContainer: range.startContainer,
  //     startOffset: range.startOffset,
  //   } as Et.StaticRange
  // },

  /**
   * 创建一个指定节点内的光标位置, 此方法不检验offset 是否合法;
   * * 可用于插入文本命令执行前, 定位一个尚且不存在的位置, 指示命令执行之后的光标位置
   */
  caret: (node: Et.Node, offset: number) => {
    return new EtCaret(node, offset)
  },
  /**
   * 获取位于节点内的光标位置, offset若超出节点内容边界, 则定位到内开头或内结尾
   */
  caretIn: (node: Et.Node, offset: number) => {
    if (offset < 0) {
      offset = 0
    }
    else {
      if (dom.isText(node)) {
        if (offset > node.length) {
          offset = node.length
        }
      }
      else if (offset > node.childNodes.length) {
        offset = node.childNodes.length
      }
    }
    return new EtCaret(node, offset)
  },
  /** 获取定位到当前节点内结尾的光标位置 */
  caretInEndNow: (node: Et.Node) => {
    return new EtCaret(node, dom.nodeLength(node))
  },

  /**
   * 获取定位到节点内结尾的光标位置;
   * 该位置在访问 EtCaret 的 isValid 属性前, 始终指向节点内末尾\
   * 对于不确定当前节点未来是否会在末尾插入新子节点时, 确定一个节点内末尾的位置
   */
  caretInEnd(node: Et.Node) {
    return new EtCaret(node, this.ANCHOR_IN_END)
  },

  /** 获取定位到节点内开头的光标位置 */
  caretInStart: (node: Et.Node) => {
    return new EtCaret(node, 0)
  },
  /**
   * 返回一个新的 EtCaret, 为基于当前光标位置偏移 offset 的结果;
   * 不同于 EtCaret.moved, 该方法不检验 offset 的合法性;
   * 即返回的光标位置可能超出 anchor 内容长度
   */
  caretMoved: (caret: EtCaret, offset: number) => {
    if (offset === 0) {
      return caret
    }
    let newOffset = caret.offset + offset
    if (newOffset < 0) {
      newOffset = 0
    }
    return new EtCaret(caret.anchor, newOffset)
  },
  /** 获取定位到节点外结尾的光标位置 */
  caretOutEnd: (node: Et.Node) => {
    // fixed. 如果节点在页面上, 则必须基于父节点定位, 否则
    // 在添加命令的 execAt 参数时, 基于自身的 AnchorOutOffset 定位会在命令执行获取错误真实位置
    // 如删除段落 currP, 并在删除位置插入片段则 execAt = cr.caretOutStart(currP), 而命令执行时
    // 前面添加的删除命令将 currP 删除了, 该 execAt.isValid 将为 false, 无法获取要插入的位置
    const index = dom.connectedNodeIndex(node)
    if (index === -1) {
      return new EtCaret(node, Infinity)
    }
    return new EtCaret(node.parentNode as Et.Node, index + 1)
  },
  /**
   * 获取定位到节点外开头的光标位置;
   * 若 node 在页面上, 使用 node 的父节点作为 anchor;
   * 否则以node作为 anchor
   */
  caretOutStart: (node: Et.Node) => {
    const index = dom.connectedNodeIndex(node)
    if (index === -1) {
      return new EtCaret(node, -Infinity)
    }
    return new EtCaret(node.parentNode as Et.Node, index)
  },
  /**
   * 定位到一个节点末尾, 并自适应其位置
   * * 若为#text, 定位到内末尾
   * * 若为不可编辑节点, 定位到外末尾
   * * 若为可编辑节点且, 定位到内末尾
   */
  caretEndAuto: (node: Et.Node) => {
    if (dom.isText(node)) {
      return new EtCaret(node, node.length)
    }
    if (dom.isNotEditable(node)) {
      return new EtCaret(node, Infinity)
    }
    return new EtCaret(node, node.childNodes.length)
  },
  /**
   * 定位到一个节点开头, 并自适应其位置
   * * 若为#text, 定位到内开头
   * * 若为不可编辑节点, 定位到外开头
   * * 若为可编辑节点且, 定位到内开头
   */
  caretStartAuto: (node: Et.Node) => {
    if (dom.isText(node)) {
      return new EtCaret(node, 0)
    }
    if (dom.isNotEditable(node)) {
      return new EtCaret(node, -Infinity)
    }
    return new EtCaret(node, 0)
  },

  /**
   * 创建一个 EtRange 对象, 范围边缘若定位到节点外, 应使用 cr.BEFORE_ANCHOR 或 cr.AFTER_ANCHOR 作为 offset 传入值 \
   * 该方法不检验 offset 是否超出节点内容边界, 使用时需保证 offset 合法, 否则将产生意外结果
   */
  range: (startNode: Et.Node, startOffset: number, endNode: Et.Node, endOffset: number) => {
    return new EtRange(startNode, startOffset, endNode, endOffset)
  },
  /**
   * 创建一个 EtRange 对象, 范围边缘定位到节点`内`开头和结尾
   */
  rangeAllIn: (node: Et.Node) => {
    return new EtRange(node, 0, node, dom.nodeLength(node))
  },
  /**
   * 创建一个 EtRange 对象, 范围边缘定位到节点`外`开头和结尾
   */
  // rangeAllOut: (node: Et.Node) => {
  //   return new EtRange(node, -Infinity, node, Infinity)
  // },

  /**
   * 获取一个同层跨度范围, 用于 Remove_Content 命令描述要删除内容的范围;
   * oneChild 和 otherChild 不必按序, 但必须同层(父节点相同), 否则返回null
   */
  spanRange: (oneChild?: Et.NodeOrNull, otherChild?: Et.NodeOrNull) => {
    if (!oneChild || !otherChild) {
      return null
    }
    if (oneChild.parentNode !== otherChild.parentNode) {
      return null
    }
    let isStartBeforeEnd = true
    let next = otherChild.nextSibling
    while (next) {
      if (next === oneChild) {
        isStartBeforeEnd = false
        break
      }
      next = next.nextSibling
    }
    return isStartBeforeEnd
      ? new SpanRange(oneChild as NodeHasParent<Et.Node>, otherChild as NodeHasParent<Et.Node>)
      : new SpanRange(otherChild as NodeHasParent<Et.Node>, oneChild as NodeHasParent<Et.Node>)
  },
  /**
   * 获取一个跨度范围, 从 node 的 firstChild 到 lastChild; 若 node 没有子节点, 返回 null
   */
  spanRangeAllIn: (node: Et.Node) => {
    if (!node.hasChildNodes()) {
      return null
    }
    return new SpanRange(
      node.firstChild as NodeHasParent<Et.Node>, node.lastChild as NodeHasParent<Et.Node>,
    )
  },
  /**
   * 获取一个跨度范围, 选择 node 本身, 若 node 不在页面上, 返回 null
   */
  // spanRangeAllOut: (node: Et.Node) => {
  //   if (!node.isConnected) {
  //     return null
  //   }
  //   return new SpanRange(node as NodeHasParent<Et.Node>, node as NodeHasParent<Et.Node>)
  // },
  /**
   * 获取一个跨度范围, 从 node 的`fromOffset`子节点到`toOffset`子节点 (包含两者);
   * 若对应子节点不存在, 返回 null (若 toOffset 大于等于node 子节点个数, 则会使用lastChild)
   */
  spanRangeFromTo: (node: Et.Node, fromOffset: number, toOffset: number) => {
    if (!node.hasChildNodes()) {
      return null
    }
    if (fromOffset > toOffset) {
      const tmp = fromOffset
      fromOffset = toOffset
      toOffset = tmp
    }
    const startNode = node.childNodes.item(fromOffset)
    const endNode = toOffset < node.childNodes.length
      ? node.childNodes.item(toOffset)
      : node.lastChild
    if (!startNode || !endNode) {
      return null
    }
    return new SpanRange(startNode as NodeHasParent<Et.Node>, endNode as NodeHasParent<Et.Node>)
  },

} as const
