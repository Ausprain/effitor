/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * popup助手
 * todo 重构, 结合dropdown和dialog的思路重构
 */

import type { Et } from '@effitor/core'
import { dom, etcode, throttle, traversal } from '@effitor/core'
import { CssClassEnum } from '@effitor/shared'

import type {
  ChoseItemCallback,
  HoverPopupOptions,
  PopupContent,
  PopupItem,
  PopupItemFilter,
  PopupRender,
} from './config'
import { PopupEnum } from './config'
import {
  clearFormatItem,
  copyAsMarkdownItem,
  copyItem,
  createPopupItem,
  initClickForItem,
} from './popupItem'

/** popup的位置偏移量 */
const enum PopupOffset {
  TOP = 8,
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  LEFT = 8,
}

/**
 * popup规则
 * * popup容器插入编辑器root节点, 采用全局定位, 根据提供的DOMRect来确定其显示的位置
 * * 显示popup有两种方式:
 *      1. .show(), 提供一个DOMRect, 默认显示在该矩形的上中位置; 若超出host上边, 则显示在下中位置; 会判断是否超出左/右边界自动向内偏移
 *      2. .showSelectionRangePopup(), 会根据当前光标位置显示, collapse时与光标左侧对齐, range时, 判断选区方向, 与focus端对齐
 * * 使用show方法前, 可使用adopt方法为popup容器添加内容
 * * popup容器监听mousedown方法, 禁止冒泡和默认行为, 这样就不会让编辑器失去焦点了
 * * popup防抖监听scroll方法, 滚动时tempHide, 滚动停止再show, 若滚动后对应DOMRect超出host, 则不回显示popup
 * * tempHide与hide的区别是, 前者仅隐藏, 而后者会移除popup的内容
 *
 * 默认内容的dom结构
 * ```html
 * <et-editor>
 *      <et-body></et-body>
 *      <div class="et-popup">
 *          <!-- 以下为popup.adopt的content元素, hover或自定义popup内容将替换下方节点;
 *               若hover popup的content函数是一个null, 则使用以下默认值 -->
 *          <div class="et-popup__item-container">
 *              <span class="et-popup__item"><svg>...</svg></span>
 *              <span class="et-popup__item"><svg>...</svg></span>
 *          </div>
 *      </div>
 * </et-editor>
 *
 * ```
 */
export class Popup {
  _ctx: Et.EditorContext
  isShowing = false
  /** 滚动目标 用于绑定滚动监听器, 滚动时隐藏popup, 停止时重新定位并恢复显示 */
  private readonly scrollTarget: HTMLElement | Document
  /** 滚动容器, 非 document 滚动时等于 scrollTarget; document 滚动时为 document.documentElement */
  // private readonly scrollContainer: HTMLElement
  readonly popupEl: HTMLDivElement
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly hoverPopupContentMap = new Map<string, [PopupContent, HoverPopupOptions<any>]>()
  // paragraphPopupContent: PopupContent
  selectionRangePopupContent: PopupContent
  /** 选区popup定时器, 防抖 */
  private selectionRangePopupTimer: number | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly selectionRangePopupItemList: PopupItem<any>[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private currentPopupItemList: PopupItem<any>[] = []
  private currentPopupItemIndex = -1
  /** 引起当前popup的效应元素,  */
  srcElement: Et.EtElement | null = null

  private _relocate: (() => undefined | Popup) | null = null
  private _hideCallback: (() => void) | undefined | null = null
  private _stopDelayHiding: (() => void) | null = null
  private _removeShowingScrollListener: (() => void) | null = null

  constructor(ctx: Et.EditorContext, signal: AbortSignal) {
    this._ctx = ctx
    this.scrollTarget = ctx.editor.scrollTarget
    const popupEl = dom.el('div', PopupEnum.Class_Popup)
    this.popupEl = popupEl
    this.selectionRangePopupContent = dom.el('div', `${PopupEnum.Class_Popup_Item_Container} ${CssClassEnum.Card}`)

    popupEl.addEventListener('mousedown', e => (e.preventDefault(), e.stopPropagation()), { signal })
    popupEl.addEventListener('mouseenter', () => {
      this._stopDelayHiding?.()
    }, { signal })
    popupEl.addEventListener('mouseleave', () => {
      if (this._stopDelayHiding) {
        // 启动过delayHide才delayHide
        this.delayHide()
      }
    }, { signal })
  }

  /** 创建一个popup item */
  createPopupItem<T extends Et.EtElement>(...args: Parameters<typeof createPopupItem<T>>) {
    return initClickForItem(this._ctx, createPopupItem<T>(...args))
  }

  /** 更新当前popup item列表, 用于交互(按tab)时切换当前选择的item */
  updateCurrentPopupItems<T extends Et.EtElement>(update: (items: PopupItem<T>[]) => void) {
    update(this.currentPopupItemList)
    this.currentPopupItemIndex = -1
  }

  /**
   * 添加一个滚动监听器, 当页面滚动时, 隐藏popup; 若popup目标滚出视口, 则popup不会显示
   */
  private addShowingScrollListener() {
    const scrollListener = throttle(() => {
      if (!this.isShowing) {
        return
      }
      this.scrollingHide()
    }, 500)
    const scrollendListener = () => {
      if (this.isShowing) {
        this.scrollingShow()
      }
    }
    this.scrollTarget.addEventListener('scroll', scrollListener)
    this.scrollTarget.addEventListener('scrollend', scrollendListener)
    this._removeShowingScrollListener = () => {
      this.scrollTarget.removeEventListener('scroll', scrollListener)
      this.scrollTarget.removeEventListener('scrollend', scrollendListener)
    }
  }

  /** 使用一个元素渲染popup内容 */
  adopt(content: PopupContent): Popup
  /** 使用渲染函数渲染popup内容 */
  adopt(render: PopupRender): Popup
  adopt(contentOrRender: PopupContent | PopupRender) {
    this.popupEl.textContent = ''
    if (typeof contentOrRender === 'function') {
      contentOrRender(this.popupEl)
    }
    else {
      this.popupEl.appendChild(contentOrRender)
    }
    return this
  }

  /** 将popup定位到以左上角为原点的(x, y)位置 */
  private _locate(x: number, y: number) {
    this.popupEl.style.translate = `${x}px ${y}px`
  }

  /** 根据目标DOMRect定位popup; 并自适应当前视口, 让popup不接触视口边缘 */
  private locate(targetRect: DOMRect, atTop = true, alignLeft = false, alignRight = false) {
    const windowWidth = window.innerWidth, windowHeight = window.innerHeight,
      cw = this.popupEl.offsetWidth, ch = this.popupEl.offsetHeight,
      tl = targetRect.left, tr = targetRect.right,
      tt = targetRect.top, tb = targetRect.bottom

    if (tb < 0 || tb > windowHeight) {
      // this.hide()
      return
    }

    let left = 0, top = 0
    if (atTop) {
      if (tt - ch < PopupOffset.TOP) {
        top = PopupOffset.TOP
      }
      else {
        top = tt - ch - PopupOffset.TOP
      }
    }
    else {
      if (tb + ch + PopupOffset.TOP < windowHeight) {
        top = tb + PopupOffset.TOP
      }
      else {
        top = windowHeight - ch - PopupOffset.TOP
      }
    }
    if (alignLeft) {
      if (tl + cw > windowWidth) {
        left = windowWidth - cw - PopupOffset.LEFT
      }
      else {
        left = tl
      }
    }
    else if (alignRight) {
      if (tr - cw < 0) {
        left = PopupOffset.LEFT
      }
      else {
        left = tr - cw
      }
    }
    else {
      left = (tl + tr - cw) / 2
      if (left <= 0) {
        left = PopupOffset.LEFT
      }
      else if (left + cw >= windowWidth) {
        left = windowWidth - cw - PopupOffset.LEFT
      }
    }

    this._locate(left, top)
    return this
  }

  /**
   * 将popup定位到指定位置
   * @param coord 接受popup元素作为参数, 返回一个(x, y)位置用于定位popup
   */
  locateTo(coord: (popupEl: HTMLDivElement) => { x: number, y: number }) {
    const { x, y } = coord(this.popupEl)
    this._locate(x, y)
  }

  private _show() {
    if (this._stopDelayHiding) this._stopDelayHiding()
    this.addShowingScrollListener()
  }

  show() {
    this._show()
    this.isShowing = true
    this.popupEl.classList.add(PopupEnum.Class_Popup_Show)
    return this
  }

  private _hide() {
    if (this._hideCallback) this._hideCallback()
    if (this._removeShowingScrollListener) this._removeShowingScrollListener()
    this._relocate = null
    this._hideCallback = null
    this._stopDelayHiding = null
    this._removeShowingScrollListener = null
  }

  hide() {
    this._hide()
    this.isShowing = false
    this.srcElement = null
    this.currentPopupItemIndex = -1
    this.popupEl.className = PopupEnum.Class_Popup
  }

  /** 延迟隐藏, 用于鼠标移入时停止隐藏 */
  delayHide() {
    const anim = this.popupEl.animate([{ opacity: 1 }, { opacity: 0 }], 500)
    anim.finished.then(() => this.hide()).catch(() => { /** do not throw error while cancel */ })
    this._stopDelayHiding = () => (anim.cancel())
  }

  /** 滚动ing时暂时隐藏 */
  private scrollingHide() {
    // 滚动时仅将弹窗隐藏, 保留isShowing 状态
    this.popupEl.classList.remove(PopupEnum.Class_Popup_Show)
  }

  /** 滚动停止时恢复显示 */
  private scrollingShow() {
    if (this._relocate) {
      if (!this._relocate()) {
        // locate返回void, 说明位置在视口外, 禁止show
        return
      }
    }
    this.popupEl.classList.add(PopupEnum.Class_Popup_Show)
  }

  // paragraph popup
  // setParagraphPopup: (content: PopupContent) => Popup
  // showParagraphPopup: () => void

  /* -------------------------------------------------------------------------- */
  /*                                 hover popup                                */
  /* -------------------------------------------------------------------------- */

  /**
   * 添加一个hover popup \
   * hover popup 只对效应元素有用, 即popupKey只能添加到效应元素上; hover普通元素时, 即使popupKey符合, 也不会显示popup
   * @param popupKey popup的key 用于show时指定show哪个popup; 必须提前为指定元素添加 HtmlAttrEnum.Popup_Key 属性, 值为该key, hover popup才会生效
   * @param content 一个函数, 返回该key要popup的content; 若传入null, 则使用同selchange的popup content, 但必须配置popupItems, 否则会报错
   */
  addHoverPopup<T extends Et.EtElement>(
    popupKey: string,
    content: (() => PopupContent) | null,
    options: HoverPopupOptions<T>,
  ) {
    let el
    if (content) {
      el = content()
    }
    else {
      if (!options.popupItems || options.popupItems.length === 0) {
        if (import.meta.env.DEV) {
          throw Error('Using default hover popup content must give at least one PopupItem.')
        }
        return
      }
      el = dom.el('div', `${PopupEnum.Class_Popup_Item_Container} ${CssClassEnum.Card}`)
    }

    this.hoverPopupContentMap.set(popupKey, [el, options])
  }

  /**
   * 显示指定key的popup
   * @param popupKey popup的key
   * @param target 目标效应元素, 即被hover的元素
   */
  showHoverPopup<T extends Et.EtElement>(popupKey: string, target: T) {
    const popupContent = this.hoverPopupContentMap.get(popupKey)
    if (!popupContent) {
      return
    }
    let filterPopupItems: PopupItem<T>[] = []
    const [content, { popupItems, beforeShow, beforeHide, prefer }] = popupContent
    if (popupItems) {
      filterPopupItems = [...popupItems]
    }
    this.srcElement = target
    // beforeShow 若返回true, 则不显示popup
    if (beforeShow?.(this._ctx, target, content, filterPopupItems)) {
      return
    }
    if (filterPopupItems.length) {
      this.updateCurrentPopupItems<T>((items) => {
        items.length = 0
        items.push(...filterPopupItems)
      })
    }
    if (content.classList.contains(PopupEnum.Class_Popup_Item_Container)) {
      if (filterPopupItems.length === 0) {
        if (import.meta.env.DEV) {
          this._ctx.assists.logger?.logWarn('popup没有可操作项, 不显示', 'Assist-Popup')
          return
        }
      }
      content.textContent = ''
      for (const item of filterPopupItems) {
        content.appendChild(item.el)
      }
    }

    this._hideCallback = beforeHide ? () => beforeHide(this._ctx, target, content, filterPopupItems) : undefined
    // fixed. 有些hover popup target 若采用 display: contents; 则getBoundingClientRect() 会返回0, 0, 0;
    const getRect = () => {
      let rect = target.getBoundingClientRect()
      if (rect.x === 0 && rect.y === 0 && rect.height === 0) {
        // target无位置; 尝试使用第一个元素孩子定位
        rect = target.children[0]?.getBoundingClientRect() as DOMRect
        if (!rect) {
          return { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, bottom: 0, right: 0 } as DOMRect
        }
      }
      return rect
    }
    this._relocate = () => this.locate(getRect(), prefer?.atTop, prefer?.alignLeft, prefer?.alignRight)
    this.adopt(content).locate(getRect(), prefer?.atTop, prefer?.alignLeft, prefer?.alignRight)?.show()
  }

  /* -------------------------------------------------------------------------- */
  /*                            selectionrange popup                            */
  /* -------------------------------------------------------------------------- */

  /**
   * 添加一个选区popup item
   * @param icon 图标
   * @param tip hover时提示信息
   * @param onchosen 选择该item时触发回调
   * @param filter 过滤器, popup时会遍历当前选区内容的节点, 然后根据过滤器显示符合的item
   */
  addSelectionRangePopupItem<T extends Et.EtElement>(
    icon: SVGElement,
    tip: string,
    onchosen: ChoseItemCallback<T>,
    filter?: PopupItemFilter,
  ) {
    this.selectionRangePopupItemList.push(
      initClickForItem<T>(this._ctx, createPopupItem<T>(icon, tip, onchosen, filter)),
    )
  }

  /**
   * 初始化选区popup
   */
  private initSelectionRangePopupContent() {
    this.selectionRangePopupContent.textContent = ''
    const range = this._ctx.selection.range
    if (!range || range.collapsed) {
      return
    }
    let etType = 0
    // 遍历选区内节点, 累计效应, 用于判断是否显示某些首效应类型限制的item
    traversal.traverseRange(range as Et.Range, (node) => {
      if (etcode.check(node)) {
        etType |= node.etCode
      }
    }, { whatToShow: 1 /** NodeFilter.SHOW_ELEMENT */ })
    const items = this.selectionRangePopupItemList.filter((item) => {
      if (!item.filter) {
        return true
      }
      if (item.filter.matchEtType) {
        if (item.filter.unmatchEtType) {
          return etType & item.filter.matchEtType && !(etType & item.filter.unmatchEtType)
        }
        else {
          return etType & item.filter.matchEtType
        }
      }
      return false
    })
    this.currentPopupItemList.length = 0
    for (const item of items) {
      this.currentPopupItemList.push(item)
      this.selectionRangePopupContent.appendChild(item.el)
    }
    this.adopt(this.selectionRangePopupContent)
  }

  /**
   * 显示选区popup
   */
  showSelectionRangePopup() {
    if (this.selectionRangePopupTimer) {
      clearTimeout(this.selectionRangePopupTimer)
    }
    if (!this._ctx.commonEtElement) {
      return
    }
    this.srcElement = this._ctx.commonEtElement
    this.selectionRangePopupTimer = window.setTimeout(() => {
      let targetRect: DOMRect
      if (this._ctx.selection.isCollapsed) {
        return
      }
      const range = this._ctx.selection.range
      if (!range) {
        return
      }
      const rects = range.getClientRects()
      if (rects.length === 0) {
        return
      }

      this.initSelectionRangePopupContent()

      if (this._ctx.selection.isForward) {
        targetRect = rects[rects.length - 1]!
        this._relocate = () => {
          const rects = range.getClientRects()
          return this.locate(rects[rects.length - 1]!, false, false, true)
        }
        this.locate(targetRect, false, false, true)?.show()
      }
      else {
        targetRect = rects[0]!
        this._relocate = () => this.locate(range.getClientRects()[0]!, true, true, false)
        this.locate(targetRect, true, true, false)?.show()
      }
    }, 100)
  }

  /** 选择当前popup 的下一个item; 仅在selection popup和hover popup下有item时有效 */
  selectNextItem() {
    if (this.currentPopupItemIndex !== -1) {
      this.currentPopupItemList[this.currentPopupItemIndex]?.el.classList.remove(CssClassEnum.Selected)
    }
    this.currentPopupItemIndex++
    if (this.currentPopupItemIndex >= this.currentPopupItemList.length) {
      this.currentPopupItemIndex = 0
    }
    this.currentPopupItemList[this.currentPopupItemIndex]?.el.classList.add(CssClassEnum.Selected)
  }

  /** 选择当前select的item并执行其回调 */
  choseItem(hideAfterChoose: boolean) {
    if (!this.srcElement) {
      return this.hide()
    }
    const currItem = this.currentPopupItemList[this.currentPopupItemIndex]
    if (currItem) {
      currItem.onchosen(this._ctx, currItem.el, this.srcElement)
    }
    if (hideAfterChoose) {
      this.hide()
    }
    return
  }
}

const defaultOptions = {
  /** // TODO 清除格式 */
  selectionRangePopupItem_ClearFormat: true,
  /** // TODO 复制选中内容 */
  selectionRangePopupItem_Copy: true,
  /** // TODO 复制选中内容为Markdown格式 */
  selectionRangePopupItem_CopyAsMarkdown: true,
}
export type PopupAssistOptions = Partial<typeof defaultOptions>

export const initPopup = (ctx: Et.EditorContext, signal: AbortSignal, options?: PopupAssistOptions) => {
  options = {
    ...defaultOptions,
    ...options,
  }

  const popup = new Popup(ctx, signal)
  ctx.assists.popup = popup
  ctx.root.appendChild(popup.popupEl)

  if (options.selectionRangePopupItem_ClearFormat) {
    popup.selectionRangePopupItemList.push(initClickForItem(ctx, clearFormatItem))
  }
  if (options.selectionRangePopupItem_Copy) {
    popup.selectionRangePopupItemList.push(initClickForItem(ctx, copyItem))
  }
  if (options.selectionRangePopupItem_CopyAsMarkdown) {
    popup.selectionRangePopupItemList.push(initClickForItem(ctx, copyAsMarkdownItem))
  }
}
