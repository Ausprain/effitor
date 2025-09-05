/* eslint-disable @stylistic/max-len */
import type { Et } from '../@types'
import { type EtBodyElement, etcode } from '../element'
import { EtCode } from '../element/config'
import { EtTypeEnum } from '../enums'

// const enum EditorBodyEventName {
//   HeadingChainUpdated = 'headingchainupdated',
// }
interface HeadingChainUpdatedEvent {
  /** 逆序标题元素链, 越往后标题等级越高 */
  headingChain: readonly Et.EtHeading[]
}
interface EditorBodyEventMap {
  /** 标题链更新事件 */
  headingchainupdated: HeadingChainUpdatedEvent
}
interface EditorBodyEventListener<K extends keyof EditorBodyEventMap> {
  /**
   * 编辑区事件处理函数
   * @param event 事件对象
   * @returns 是否结束事件(终止后续事件监听器执行)
   */
  (this: EditorBody, event: EditorBodyEventMap[K]): boolean
}

/**
 * 编辑器文档主体(编辑区)
 */
export class EditorBody {
  /** 获取编辑区所有文本 */
  textContent = () => this.el.textContent ?? ''

  private _eventHandlersMap: { [k in keyof EditorBodyEventMap]?: EditorBodyEventListener<k>[] } = {}

  private _headingOb: IntersectionObserver
  private _updateHeadingChainIdle?: number

  constructor(
    /** 编辑区元素 */
    public readonly el: EtBodyElement,
    /** 编辑器所在滚动容器, 默认为根 html 元素 */
    public readonly scrollContainer: HTMLElement = document.documentElement,
  ) {
    this.addEventListener('headingchainupdated', (ev) => {
      console.log('heading chain updated', ev.headingChain)
      return false
    })

    this._headingOb = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          // console.log('heading intersect', entry.target)
          // entry.target.style.backgroundColor = 'skyblue'
          this.updateHeadingChain(entry.target as Et.Paragraph)
        }
        else {
          // entry.target.style.backgroundColor = ''
        }
      }
    }, {
      root: this.scrollContainer === document.documentElement ? null : this.scrollContainer,
      // 在前 1/5 的位置划一横线, 与该横线相交的段落触发回调
      // 从该段落开始向上找标题, 构建标题链
      rootMargin: '-19.9% 0px -80% 0px',
    })
    const paragraphMutationObserver = new MutationObserver((records) => {
      for (const rd of records) {
        for (const nod of rd.addedNodes) {
          if (etcode.check(nod, EtTypeEnum.Paragraph)) {
            // console.log('heading added', nod)
            this._headingOb.observe(nod)
          }
        }
        for (const nod of rd.removedNodes) {
          if (etcode.check(nod, EtTypeEnum.Paragraph)) {
            // console.log('heading removed', nod)
            this._headingOb.unobserve(nod)
          }
        }
      }
    })
    paragraphMutationObserver.observe(this.el, {
      childList: true,
    })
  }

  /* -------------------------------------------------------------------------- */
  /*                                  编辑区事件                                 */
  /* -------------------------------------------------------------------------- */
  addEventListener<K extends keyof EditorBodyEventMap>(type: K, listener: EditorBodyEventListener<K>, signal?: AbortSignal): void {
    if (!this._eventHandlersMap[type]) {
      this._eventHandlersMap[type] = []
    }
    this._eventHandlersMap[type].push(listener)
    if (signal) {
      signal.addEventListener('abort', () => {
        this.removeEventListener(type, listener)
      })
    }
  }

  removeEventListener<K extends keyof EditorBodyEventMap>(type: K, listener: EditorBodyEventListener<K>): void {
    const handlers = this._eventHandlersMap[type]
    if (handlers) {
      for (let i = 0; i < handlers.length; i++) {
        if (handlers[i] === listener) {
          handlers.splice(i, 1)
          break
        }
      }
    }
  }

  dispatchEvent<K extends keyof EditorBodyEventMap>(type: K, event: EditorBodyEventMap[K]): boolean {
    const handlers = this._eventHandlersMap[type]
    if (handlers) {
      for (const handler of handlers) {
        if (handler.call(this, event)) {
          return true
        }
      }
    }
    return true
  }

  /**
   * 计算并更新标题链
   * @returns 逆序标题元素链, 越往后标题等级越高
   */
  private updateHeadingChain(topEl: Et.Paragraph) {
    if (this._updateHeadingChainIdle) {
      cancelIdleCallbackPolyByEffitor(this._updateHeadingChainIdle)
    }
    const cb = (deadline?: IdleDeadline) => {
      console.warn('update heading chain', deadline?.timeRemaining())
      if (deadline && deadline.timeRemaining() < 5) {
        this._updateHeadingChainIdle = requestIdleCallbackPolyByEffitor(cb)
        return
      }
      this._updateHeadingChainIdle = void 0
      const chain = []
      let currLevel = 7
      // TODO 算法优化
      // 记录当前的标题链Set, 向上搜索遇到相同标题时终止, 复用重复的标题链部分
      while (topEl) {
        if (etcode.check(topEl, EtTypeEnum.Heading)) {
          const level = topEl.headingLevel
          if (level < currLevel) {
            chain.push(topEl)
            currLevel = level
          }
          if (level === 1) {
            break
          }
        }
        topEl = topEl.previousSibling as Et.Paragraph
      }
      if (chain.length) {
        this.dispatchEvent('headingchainupdated', { headingChain: chain })
      }
    }
    this._updateHeadingChainIdle = requestIdleCallbackPolyByEffitor(cb)
  }

  focusTopElement(topEl: Et.Paragraph) {
    this.updateHeadingChain(topEl)
  }

  /* -------------------------------------------------------------------------- */
  /*                                  DOM 工具                                  */
  /* -------------------------------------------------------------------------- */

  /**
   * 获取编辑区首段落, 不存在或不是段落返回 null
   */
  get firstParagraph() {
    const firstChild = this.el.firstChild
    if (firstChild && etcode.check(firstChild, EtTypeEnum.Paragraph)) {
      return firstChild
    }
    return null
  }

  /**
   * 获取编辑区末段落, 不存在或不是段落返回 null
   */
  get lastParagraph() {
    const lastChild = this.el.lastChild
    if (lastChild && etcode.check(lastChild, EtTypeEnum.Paragraph)) {
      return lastChild
    }
    return null
  }

  isNodeInBody(node: Node): node is Et.Node {
    return node.isConnected && this.isNodeContainsOther(this.el, node)
  }

  /**
   * 这是对 Node.contains 方法的复现, 旨在缩短查找距离(在 bodyEl 内), 提高效率
   */
  isNodeContainsOther(node: Node, other: Node) {
    if (node.isConnected !== other.isConnected) {
      return false
    }
    while (other) {
      if (node === other) {
        return true
      }
      if (other === this.el) {
        return false
      }
      other = other.parentNode as Et.Node
    }
    return false
  }

  /**
   * 获取 node 在 under祖先下的最外层祖先节点 (即 under 的子节点)
   * 若 node 不是 under 的后代, 将返回 null
   */
  outerNodeUnder(node: Et.Node, under?: Et.Node) {
    if (!under) {
      under = this.el
    }
    let p = node.parentNode
    while (p && p !== under) {
      node = p
      p = p.parentNode
    }
    if (p !== under) {
      return null
    }
    return node
  }

  /**
   * 向上（包括自身）找第一个`Et.EtElement`, 无效应元素或节点不在编辑区(ctx.body)内, 将返回 null\
   * 使用"鸭子类型",  Effitor 内拥有`EtCode`Symbol属性的元素被视为效应元素
   */
  findInclusiveEtParent(node: Et.NodeOrNull): Et.EtElement | null {
    while (node) {
      if (node[EtCode] !== void 0) return node as Et.EtElement
      node = node.parentNode
    }
    return null
  }

  /**
   * 向上查找最近一个`Et.ParagraphElement`, `etCode`匹配段落 EtType, 则视为段落效应元素
   */
  findInclusiveParagraph(node: Et.NodeOrNull): Et.Paragraph | null {
    while (node) {
      if (node === this.el) return null
      if (node[EtCode] && (node[EtCode] & EtTypeEnum.Paragraph)) return node as Et.Paragraph
      node = node.parentNode
    }
    return null
  }

  /**
   * 找一个在编辑区内的节点所在的顶层节点
   */
  findTopElement(node: Et.Node): Et.Paragraph {
    return this.outerNodeUnder(node, this.el) as Et.Paragraph
  }

  /**
   * 查找两个节点的最近公共祖先节点; 若节点不在ctx.bodyEl内部, 将返回 null
   * @param stopNode 停止查找的节点, 默认为ctx.bodyEl, 即编辑器编辑区根节点
   */
  findCommonAncestor(
    oneNode: Et.HTMLNode,
    otherNode: Et.HTMLNode,
    stopNode = this.el,
  ) {
    if (oneNode === otherNode) {
      if (this.isNodeInBody(oneNode)) {
        return oneNode
      }
      return null
    }
    let node = oneNode as Et.HTMLNodeOrNull
    let startDepth = 0
    while (node && node !== stopNode) {
      if (node === otherNode) {
        return node
      }
      node = node.parentNode
      startDepth++
    }
    if (!node) {
      return null
    }
    node = otherNode
    let endDepth = 0
    while (node && node !== stopNode) {
      if (node === oneNode) {
        return node
      }
      node = node.parentNode
      endDepth++
    }
    if (!node) {
      return null
    }
    if (startDepth > endDepth) {
      for (let i = startDepth; i > endDepth; i--) {
        oneNode = oneNode.parentNode as Et.HTMLNode
      }
    }
    else if (endDepth > startDepth) {
      for (let i = endDepth; i > startDepth; i--) {
        otherNode = otherNode.parentNode as Et.HTMLNode
      }
    }
    while (oneNode && oneNode !== stopNode) {
      if (oneNode === otherNode) {
        return oneNode
      }
      oneNode = oneNode.parentNode as Et.HTMLNode
      otherNode = otherNode.parentNode as Et.HTMLNode
    }
    return stopNode
  }
}
