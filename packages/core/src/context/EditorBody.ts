import { EtTypeEnum } from '@effitor/shared'

import type { Et } from '../@types'
import { type EtBodyElement, etcode } from '../element'
import { type EditorListeners } from './listeners'

// const enum EditorBodyEventName {
//   HeadingChainUpdated = 'headingchainupdated',
// }
// interface HeadingChainUpdatedEvent {
//   /** 逆序标题元素链, 越往后标题等级越高 */
//   headingChain: readonly Et.EtHeading[]
// }
// interface EditorBodyEventMap {
//   /** 标题链更新事件 */
//   headingchainupdated: HeadingChainUpdatedEvent
// }
// interface EditorBodyEventListener<K extends keyof EditorBodyEventMap> {
//   /**
//    * 编辑区事件处理函数
//    * @param event 事件对象
//    * @returns 是否结束事件(终止后续事件监听器执行)
//    */
//   (this: EditorBody, event: EditorBodyEventMap[K]): boolean
// }

export interface CreateEditorBodyOptions {
  /** 编辑器所在滚动容器, 默认为根 html 元素 */
  scrollContainer?: HTMLElement
  /** 光标超出滚动容器，自动滚动时的水平内边距, 默认为 20 */
  autoScrollPaddingX?: number
  /** 光标超出滚动容器，自动滚动时的垂直内边距, 默认为 20 */
  autoScrollPaddingY?: number
}

/**
 * 编辑器编辑区对象
 */
export class EditorBody {
  // private _eventHandlersMap: { [k in keyof EditorBodyEventMap]?: EditorBodyEventListener<k>[] } = {}

  // private _headingOb: IntersectionObserver
  // private _updateHeadingChainIdle?: number

  private _scrollContainer: HTMLElement
  private _autoScrollPaddingX: number
  private _autoScrollPaddingY: number

  /** 获取编辑区所有文本 等于 et-body元素的 textContent值 */
  get textContent() {
    return this.el.textContent
  }

  /** 获取编辑区有意义的文本内容 等于 et-body元素的 contentText值 */
  get contentText() {
    return this.el.contentText
  }

  /**
   * 编辑器所在滚动容器`document.documentElement`
   * * [NB]: 该值不是`document.documentElement`时, 监听 scroll 事件的 scrollTarget 等于该值
   *         否则, scrollTarget 为 document 或 window 对象
   */
  get scrollContainer() {
    return this._scrollContainer
  }

  /**
   * 用于监听scroll事件的滚动目标, 当 scrollContainer 为 `document.documentElement` (默认值) 时,
   * 等于 document; 否则, 等于 scrollContainer 本身
   */
  get scrollTarget() {
    return this._scrollContainer === document.documentElement ? document : this._scrollContainer
  }

  constructor(
    /** 编辑区元素 */
    public readonly el: EtBodyElement,
    private readonly _listeners: EditorListeners,
    {
      scrollContainer = document.documentElement,
      autoScrollPaddingX = 20,
      autoScrollPaddingY = 20,
    }: CreateEditorBodyOptions = {},
  ) {
    this._scrollContainer = scrollContainer
    this._autoScrollPaddingX = autoScrollPaddingX
    this._autoScrollPaddingY = autoScrollPaddingY

    //   // TODO 移植到 heading 插件
    //   this.addEventListener('headingchainupdated', (ev) => {
    //     console.log('heading chain updated', ev.headingChain)
    //     return false
    //   })

  //   this._headingOb = new IntersectionObserver((entries) => {
  //     for (const entry of entries) {
  //       if (entry.isIntersecting) {
  //         // console.log('heading intersect', entry.target)
  //         // entry.target.style.backgroundColor = 'skyblue'
  //         this.updateHeadingChain(entry.target as Et.Paragraph)
  //       }
  //       else {
  //         // entry.target.style.backgroundColor = ''
  //       }
  //     }
  //   }, {
  //     root: this.scrollContainer === document.documentElement ? null : this.scrollContainer,
  //     // 在前 1/5 的位置划一横线, 与该横线相交的段落触发回调
  //     // 从该段落开始向上找标题, 构建标题链
  //     rootMargin: '-19.9% 0px -80% 0px',
  //   })
  //   const paragraphMutationObserver = new MutationObserver((records) => {
  //     for (const rd of records) {
  //       for (const nod of rd.addedNodes) {
  //         if (etcode.check(nod, EtTypeEnum.Paragraph)) {
  //           // console.log('heading added', nod)
  //           this._headingOb.observe(nod)
  //         }
  //       }
  //       for (const nod of rd.removedNodes) {
  //         if (etcode.check(nod, EtTypeEnum.Paragraph)) {
  //           // console.log('heading removed', nod)
  //           this._headingOb.unobserve(nod)
  //         }
  //       }
  //     }
  //   })
  //   paragraphMutationObserver.observe(this.el, {
  //     childList: true,
  //   })
  // }
  }

  // /* -------------------------------------------------------------------------- */
  // /*                                  编辑区事件                                 */
  // /* -------------------------------------------------------------------------- */
  // addEventListener<K extends keyof EditorBodyEventMap>(type: K, listener: EditorBodyEventListener<K>, signal?: AbortSignal): void {
  //   if (!this._eventHandlersMap[type]) {
  //     this._eventHandlersMap[type] = []
  //   }
  //   this._eventHandlersMap[type].push(listener)
  //   if (signal) {
  //     signal.addEventListener('abort', () => {
  //       this.removeEventListener(type, listener)
  //     })
  //   }
  // }

  // removeEventListener<K extends keyof EditorBodyEventMap>(type: K, listener: EditorBodyEventListener<K>): void {
  //   const handlers = this._eventHandlersMap[type]
  //   if (handlers) {
  //     for (let i = 0; i < handlers.length; i++) {
  //       if (handlers[i] === listener) {
  //         handlers.splice(i, 1)
  //         break
  //       }
  //     }
  //   }
  // }

  // /**
  //  * 派发编辑区事件
  //  * * DOM 事件请使用 body.el.dispatchEvent
  //  * @param type 事件类型
  //  * @param event 事件对象
  //  */
  // dispatchEvent<K extends keyof EditorBodyEventMap>(type: K, event: EditorBodyEventMap[K]): boolean {
  //   const handlers = this._eventHandlersMap[type]
  //   if (handlers) {
  //     for (const handler of handlers) {
  //       if (handler.call(this, event)) {
  //         return true
  //       }
  //     }
  //   }
  //   return true
  // }

  /**
   * 判断编辑区内容是否空白（相当于是否是初始化状态：只有一个段落，段落内容为空或一个零宽字符）
   * @param ctx 编辑器上下文
   */
  isBlank(ctx: Et.EditorContext) {
    return this.el.childNodes.length === 1 && ctx.isPlainParagraph(this.el.firstChild)
      && (!this.el.firstChild.textContent || this.el.firstChild.textContent === '\u200b')
  }

  /**
   * 直接使用编辑区事件监听器处理一个事件
   */
  handleEvent(ev: Event) {
    const handle = this._listeners[ev.type as keyof EditorListeners]
    if (handle) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return handle(ev as any)
    }
  }

  /** 在编辑区触发一个input事件; */
  dispatchInputEvent(
    type: 'beforeinput' | 'input',
    init: InputEventInit | Et.InputEventInitWithEffect,
  ) {
    this.el.dispatchEvent(new InputEvent(type, {
      bubbles: false,
      cancelable: true,
      ...init,
    }))
  }

  // /**
  //  * 计算并更新标题链
  //  * @returns 逆序标题元素链, 越往后标题等级越高
  //  */
  // private updateHeadingChain(topEl: Et.Paragraph) {
  //   if (this._updateHeadingChainIdle) {
  //     cancelIdleCallbackPolyByEffitor(this._updateHeadingChainIdle)
  //   }
  //   const cb = (deadline?: IdleDeadline) => {
  //     console.warn('update heading chain', deadline?.timeRemaining())
  //     if (deadline && deadline.timeRemaining() < 5) {
  //       this._updateHeadingChainIdle = requestIdleCallbackPolyByEffitor(cb)
  //       return
  //     }
  //     this._updateHeadingChainIdle = void 0
  //     const chain = []
  //     let currLevel = 7
  //     // TODO 算法优化
  //     // 记录当前的标题链Set, 向上搜索遇到相同标题时终止, 复用重复的标题链部分
  //     while (topEl) {
  //       if (etcode.check(topEl, EtTypeEnum.Heading)) {
  //         const level = topEl.headingLevel
  //         if (level < currLevel) {
  //           chain.push(topEl)
  //           currLevel = level
  //         }
  //         if (level === 1) {
  //           break
  //         }
  //       }
  //       topEl = topEl.previousSibling as Et.Paragraph
  //     }
  //     if (chain.length) {
  //       this.dispatchEvent('headingchainupdated', { headingChain: chain })
  //     }
  //   }
  //   this._updateHeadingChainIdle = requestIdleCallbackPolyByEffitor(cb)
  // }

  // focusTopElement(topEl: Et.Paragraph) {
  //   this.updateHeadingChain(topEl)
  // }

  /* -------------------------------------------------------------------------- */
  /*                                滚动容器相关                                  */
  /* -------------------------------------------------------------------------- */
  /**
   * 若指定矩形框不在视口内, 尝试滚动滚动容器使其可见; 不检查滚动容器是否在视口内
   * @param rect 矩形框
   * @param options
   *  * `toStart`: 若为true, 则滚动到矩形框顶部; 否则滚动到矩形框底部
   *  * `paddingX`: 水平边距, 即滚动后距离滚动容器水平边缘的距离, 避免滚动后光标紧贴边缘, 单位px或比例(0~1)
   *  * `paddingY`: 垂直边距, 类似水平边距, 单位px或比例(0~1)
   *  * `scrollBehavior`: 滚动行为
   *  * `scrollContainer`: 滚动容器, 默认为编辑区初始化时所指定的滚动容器; 可指定其他容器来将此方法应用于其他元素;
   *                       指定为其他容器时, 若该容器不在视口内, 则直接返回
   * @returns 若滚动容器不是`document.documentElement`, 滚动容器在视口上方, 返回-1, 在视口下方, 返回 1;
   *          成功滚动或无需滚动, 返回 0
   */
  scrollIntoView(rect: DOMRect, {
    toStart = true,
    paddingX = this._autoScrollPaddingX,
    paddingY = this._autoScrollPaddingY,
    scrollBehavior = 'auto',
    scrollContainer = this._scrollContainer,
  }: {
    toStart?: boolean
    paddingX?: number
    paddingY?: number
    scrollBehavior?: ScrollBehavior
    scrollContainer?: Element
  } = {}): -1 | 0 | 1 {
    let offsetTop, offsetBottom, offsetLeft, offsetRight
    if (scrollContainer === document.documentElement) {
      offsetTop = 0
      offsetBottom = window.innerHeight
      offsetLeft = 0
      offsetRight = window.innerWidth
    }
    else {
      const offsetRect = scrollContainer.getBoundingClientRect()
      // 即使滚动滚动容器也无法让 rect 在视口内, 直接返回 false
      // 滚动容器在视口上方或下方
      if (offsetRect.bottom < paddingY) {
        return -1
      }
      else if (offsetRect.top > window.innerHeight - paddingY) {
        return 1
      }
      if ((toStart && rect.left > offsetRect.left && rect.left < offsetRect.right
        && rect.top > offsetRect.top && rect.top < offsetRect.bottom)
      || (!toStart && rect.right < offsetRect.right && rect.right > offsetRect.left
        && rect.bottom < offsetRect.bottom && rect.bottom > offsetRect.top)
      ) {
        // rect在滚动容器内, 无需滚动滚动容器, 滚动视口
        scrollContainer = document.documentElement
        offsetTop = 0
        offsetBottom = window.innerHeight
        offsetLeft = 0
        offsetRight = window.innerWidth
      }
      else {
        // rect不在滚动容器内, 需滚动滚动容器
        offsetTop = Math.max(0, offsetRect.top)
        offsetBottom = Math.min(window.innerHeight, offsetRect.bottom)
        offsetLeft = Math.max(0, offsetRect.left)
        offsetRight = Math.min(window.innerWidth, offsetRect.right)
      }
    }
    if (scrollContainer === document.documentElement) {
      // 只读编辑器，不滚动视口
      if (!this.el.isContentEditable) {
        return 0
      }
      // 在视口内, 无需滚动
      if (rect.top > offsetTop && rect.top < offsetBottom
        && rect.bottom < offsetBottom && rect.bottom > offsetTop
      ) {
        return 0
      }
    }

    const { clientHeight, clientWidth, scrollLeft, scrollTop } = scrollContainer
    if (paddingX < 0) {
      paddingX = 20
    }
    else if (paddingX > 0 && paddingX < 1) {
      paddingX = paddingX * clientWidth
    }
    if (paddingY < 0) {
      paddingY = 20
    }
    else if (paddingY > 0 && paddingY < 1) {
      paddingY = paddingY * clientHeight
    }
    // 矩形框高度小于 50, 大概率是一个文本行, 取其高度一半追加到默认的 paddingY 上
    if (paddingY === 20 && rect.height < 50) {
      paddingY += Math.floor(rect.height / 2)
    }

    let left = scrollLeft, top = scrollTop
    if (toStart) {
      if (rect.top < offsetTop) {
        top += rect.top - offsetTop - paddingY // rect.top < 0, 多减 padding 不至于紧贴边缘
      }
      else if (rect.top > offsetBottom) {
        top += rect.top - offsetBottom + paddingY
      }
      if (rect.left < offsetLeft) {
        left += rect.left - offsetLeft - paddingX
      }
      else if (rect.left > offsetRight) {
        left += rect.left - offsetRight + paddingX
      }
    }
    else {
      if (rect.bottom > offsetBottom) {
        top += rect.bottom - offsetBottom + paddingY
      }
      else if (rect.bottom < offsetTop) {
        top += rect.bottom - offsetTop - paddingY
      }
      if (rect.right > offsetRight) {
        left += rect.right - offsetRight + paddingX
      }
      else if (rect.right < offsetLeft) {
        left += rect.right - offsetLeft - paddingX
      }
    }
    if (left === scrollLeft && top === scrollTop) {
      return 0
    }
    scrollContainer.scroll({
      left,
      top,
      behavior: scrollBehavior,
    })
    return 0
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

  /**
   * 检查节点是否在编辑区内, 若 node 就是编辑区根节点, 返回 true
   * @param node 要检查的节点
   * @returns 若节点在编辑区内, 返回 true, 否则返回 false
   */
  isNodeInBody(node?: Node | null): node is Et.Node {
    return !!node?.isConnected && this.isNodeContainsOther(this.el, node)
  }

  /**
   * 这是对 Node.contains 方法的复现, 旨在缩短查找距离(在 bodyEl 内), 提高效率
   * 若 node === other, 返回 true
   */
  isNodeContainsOther(node: Node, other: Node) {
    if (node === other) {
      return true
    }
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
   * 根据小写元素名, 向上（包括自身）找第一个`localName`元素, 不存在返回 null
   * * 查找不会超出编辑区(et-body), 返回结果也不会是编辑区根节点(et-body)
   */
  findInclusiveParentByName(node: Et.NodeOrNull, localName: string) {
    while (node && node !== this.el) {
      if (node.localName === localName) {
        return node
      }
      node = node.parentNode
    }
    return null
  }

  /**
   * 向上（包括自身）找第一个`Et.EtElement`, 无效应元素或节点不在编辑区(ctx.body)内, 将返回 null\
   * 使用"鸭子类型",  Effitor 内拥有`ETCODE`Symbol属性的元素被视为效应元素
   */
  findInclusiveEtParent(node: Et.NodeOrNull): Et.EtElement | null {
    while (node) {
      if (node.etCode !== void 0) return node as Et.EtElement
      node = node.parentNode
    }
    return null
  }

  /**
   * 向上查找最近一个`Et.Paragraph`效应元素, `etCode`匹配段落 EtType, 则视为段落效应元素
   */
  findInclusiveParagraph(node: Et.NodeOrNull): Et.Paragraph | null {
    while (node) {
      if (node === this.el) return null
      if (node.etCode && (node.etCode & EtTypeEnum.Paragraph)) return node as Et.Paragraph
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

  /**
   * 返回一个生成器, 向上查找所有祖先元素, 直到编辑区根节点
   * @param anchor 查找的起始节点(不包含)
   * @param filter 筛选函数, 默认为 Boolean, 即返回所有节点
   */
  * outerElements(anchor: Et.Node, filter: (node: Et.Node) => boolean = Boolean) {
    let p = anchor.parentElement
    while (p && p !== this.el) {
      if (filter(p)) {
        yield p
      }
      p = p.parentElement
    }
  }

  /**
   * 返回一个生成器, 递归获取外层效应元素, 直到编辑区根节点
   * @param anchor 查找的起始节点(不包含)
   * @param filter 筛选函数, 默认为 Boolean, 即返回所有节点
   */
  * outerEtElements(anchor: Et.Node, filter: (el: Et.EtElement) => boolean = Boolean) {
    let p = this.findInclusiveEtParent(anchor.parentElement)
    while (p && p !== this.el) {
      if (filter(p)) {
        yield p
      }
      p = this.findInclusiveEtParent(p.parentElement)
    }
  }

  /**
   * 返回一个生成器, 递归获取外层段落, 直到编辑区根节点
   * @param currP 当前段落, 返回结果不包含该段落
   */
  * outerParagraphs(currP: Et.Paragraph) {
    let p = this.findInclusiveParagraph(currP.parentElement)
    while (p && p !== this.el) {
      yield p
      p = this.findInclusiveParagraph(p.parentElement)
    }
  }
}
