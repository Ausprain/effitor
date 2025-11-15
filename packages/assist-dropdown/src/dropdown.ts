import type { Et } from '@effitor/core'
import {
  chevronRightIcon,
  CssClassEnum,
  HtmlAttrEnum,
  HtmlCharEnum,
  returnIcon,
} from '@effitor/shared'

import type {
  DropdownCallbacks,
  DropdownContent,
  DropdownContentRender,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuItemOptions,
  DropdownMenuOptions,
} from './config'
import { DropdownEnum } from './config'

/**
 * dropdown 菜单, 在光标附近展开; 展开时, 开启命令事务 在光标位置插入一个节点,
 * 并在收起时关闭事务并撤销该事务; 即dropdown的整个wrapper节点都会被撤销
 *
 * dom结构
 * ```html
 * |代表光标位置
 * aaa
 * <wrapper>  // 下拉菜单整体
 *    <span>&ZeroWidthSpace;|</span>  // 输入框, 用于接收用户输入
 *    <container>
 *        <content>  // 下拉菜单的内容区域
 *    </container>
 * </wrapper>
 * bbb
 * ```
 * * dropdown的默认菜单的当前内容是`可选二维`的, 第一维是menu, 第二维是menu中的item;
 *   当menu没有items或为空时, 退化为一维, 若有nextContent, 则可通过`→`键进入下一级菜单; 并通过`←`键返回上一级菜单
 * * 上下键可在menu间切换, 左右键可在item或prevContent/nextContent间切换
 * ```
 * // 大致结构
 * - dropdown-container
 *  - currentContent ( defaultContent )
 *      - menu1
 *      - menu2 ( item1, item2, item3 ... )
 *      - menu3 ( nextContent )
 * ```
 *
 * // TODO: DropdownFilter的处理, menu/item都有filter选项, 若提供了filter, 则在open时, 需根据ctx.effectElement对menu/item进行筛选; 这项工作尚未开始
 * 重新重构currentMenuIndex/currentItemIndex的处理(可能需要额外变量记录当前filter出来的menu/item), 并重写选择上/下一个menu/item的函数
 */
export class Dropdown {
  #createMenuEl = (defaultStyle?: boolean) => {
    const div = document.createElement('div')
    div.className = DropdownEnum.Class_Menu
    if (defaultStyle) {
      div.classList.add(CssClassEnum.BgItem)
    }
    return div
  }

  #selectMenuOrItem = (obj: DropdownMenu | DropdownMenuItem) => {
    obj.el.classList.add(CssClassEnum.Selected)
    this.currentSelectedMenuOrItem = obj
  }

  #unselectMenuOrItem = (obj: DropdownMenu | DropdownMenuItem) => {
    obj.el.classList.remove(CssClassEnum.Selected)
  }

  private readonly _ctx: Et.EditorContext

  private readonly wrapper: HTMLDivElement
  private readonly inputSpan: HTMLSpanElement
  private readonly container: HTMLDivElement

  // private isDefaultDropdown: boolean = true
  private readonly defaultContent: DropdownContent
  private readonly defaultCallbacks: DropdownCallbacks
  private readonly contentMap = {} as Record<string, DropdownContent | DropdownContentRender>
  /** 内联富文本菜单 */
  private readonly inlineRichMenu: DropdownMenu & Pick<Required<DropdownMenu>, 'items'> = { el: this.#createMenuEl(), items: [] }
  /** 块级富文本菜单 */
  private readonly blockRichMenu: DropdownMenu & Pick<Required<DropdownMenu>, 'items' | 'filter'> = {
    el: this.#createMenuEl(),
    items: [],
    filter: {
      etType: 0,
      // 仅在纯段落中展示block的菜单项, 在构造函数中通过 ctx.schema获取纯段落的 etType
      // matchEtType: EtTypeEnum.Paragraph,
      // unmatchEtType: EtTypeEnum.Component | EtTypeEnum.Blockquote,
    },
  }

  // private prefixMap: Map<string, DropdownMenu | DropdownMenuItem> = new Map()
  /** 当前dropdown内容, 若使用render函数渲染的, 则该值为null; 未adopt时, 该值为undefined  */
  private currentContent: DropdownContent | null | undefined = void 0
  /** 前一个dropdown内容 */
  private prevContent: DropdownContent | null = null
  /** 当前open永久匹配的菜单项: 经过匹配当前ctx.effectElement的菜单项, 用于让prefix二次过滤 */
  private readonly menuItemsOnCurrentOpen: { menu: DropdownMenu, items?: DropdownMenuItem[] }[] = []
  /** 当前open临时匹配的菜单项: 当前经过filter和prefix过滤的菜单项; 用于切换当前可选择的菜单项 */
  private readonly menuItemsOnCurrentInput: { menu: DropdownMenu, items?: DropdownMenuItem[] }[] = []
  /** 当前open永久隐藏的菜单项的元素节点: 经etType过滤掉的菜单项的元素 */
  private readonly hiddenMenuItemElsOnCurrentOpen = new Set<Element>()
  /** 当前open临时隐藏的菜单项的元素节点: 经prefix过滤掉的菜单项的元素 */
  private readonly hiddenMenuItemElsOnCurrentInput = new Set<Element>()
  private currentMenuIndex = 0
  private currentItemIndex = 0
  /** 当前选择的menu/item的元素, 用于快速解除selected样式 */
  private currentSelectedMenuOrItem: DropdownMenu | DropdownMenuItem | null = null
  private currentCallbacks: Readonly<DropdownCallbacks> = {}

  private _capturedKeydownListener: (ev: KeyboardEvent) => void
  private _capturedKeyupListener: (ev: KeyboardEvent) => void
  private _capturedBeforeInputListener: (ev: InputEvent) => void
  private _capturedInputListener: (ev: Event) => void
  private _capturedSelChangeListener: (ev: Event) => void
  private _capturedMouseDownListener: (ev: MouseEvent) => void

  isOpened = false

  /** 当前dropdown输入的文本 */
  get currentValue() {
    return this.inputSpan.textContent.trim().replaceAll(HtmlCharEnum.ZERO_WIDTH_SPACE, '')
  }

  constructor(ctx: Et.EditorContext, signal: AbortSignal) {
    this._ctx = ctx
    this.blockRichMenu.filter.matchEtType = ctx.schema.paragraph.etType
    this.blockRichMenu.filter.unmatchEtType = ~ctx.schema.paragraph.etType

    const wrapper = document.createElement('div')
    const inputSpan = document.createElement('span')
    const container = document.createElement('div')
    this.wrapper = wrapper
    this.inputSpan = inputSpan
    this.container = container
    wrapper.append(inputSpan, container)
    const defaultContentEl = document.createElement('div')
    wrapper.className = DropdownEnum.Class_Wrapper
    container.className = DropdownEnum.Class_Container
    defaultContentEl.className = DropdownEnum.Class_Content
    this.defaultContent = {
      el: defaultContentEl,
      menus: [this.inlineRichMenu, this.blockRichMenu],
    }
    // 将 defaultContent 的 menus 添加到 defaultContentEl 中
    this.#updateDefaultContent()
    this.register({
      [ctx.schema.paragraph.elName]: this.defaultContent,
    })
    this.defaultCallbacks = {
      onTab: (shiftKey: boolean) => {
        if (shiftKey) this.selectPrevMenuOrItem()
        else this.selectNextMenuOrItem()
      },
      onEnter: () => this.choseMenuOrItem(),
      onArrowUp: () => this.selectPrevMenuOrItem(6),
      onArrowDown: () => this.selectNextMenuOrItem(6),
      onArrowLeft: () => {
        if (this.prevContent) this.updateCurrentContent(this.prevContent)
        else this.selectPrevMenuOrItem()
      },
      onArrowRight: () => this.selectNextItemOrContent(),
      onInput: () => this.#filterMenuItemsOnInput(),
    }

    wrapper.setAttribute('contenteditable', 'false')
    wrapper.addEventListener('mousedown', ev => (ev.preventDefault(), ev.stopPropagation()), { signal })
    inputSpan.setAttribute('contenteditable', 'plaintext-only')
    // dropdown不参与编辑器编辑, 因此必须阻止dropdown内部输入的文本影响当前编辑区内容
    if (!import.meta.env.DEV) {
      inputSpan.addEventListener('blur', () => this.close(false), { signal })
    }

    this._capturedKeydownListener = (ev: KeyboardEvent) => {
      ev.stopPropagation()
      if (ev.key === 'Backspace' || ev.key === 'Delete') {
        if (this.currentValue === '') {
          // 没有内容了, 直接关闭
          this.close(false)
        }
        // 放行删除行为
        return
      }
      if (ev.metaKey || ev.ctrlKey || ev.altKey || ev.key.length > 1) {
        // 禁止剪切/粘贴等操作
        ev.preventDefault()
      }
      switch (ev.key) {
        case 'Escape': {
          this.close(false)
          return
        }
        case 'Tab': {
          this.currentCallbacks.onTab?.call(this, ev.shiftKey)
          return
        }
        case 'Enter': {
          this.currentCallbacks.onEnter?.call(this)
          return
        }
        case 'ArrowUp': {
          this.currentCallbacks.onArrowUp?.call(this)
          return
        }
        case 'ArrowDown': {
          this.currentCallbacks.onArrowDown?.call(this)
          return
        }
        case 'ArrowLeft': {
          this.currentCallbacks.onArrowLeft?.call(this)
          return
        }
        case 'ArrowRight': {
          this.currentCallbacks.onArrowRight?.call(this)
          return
        }
      }
    }
    this._capturedKeyupListener = (ev: KeyboardEvent) => {
      ev.stopPropagation()
    }
    this._capturedBeforeInputListener = (ev: InputEvent) => {
      if (![
        'insertFromComposition',
        'insertText',
        'deleteContentBackward',
        'deleteContentForward',
      ].includes(ev.inputType)) {
        ev.preventDefault()
      }
      ev.stopPropagation()
    }
    this._capturedInputListener = (ev: Event) => {
      ev.stopPropagation()
      if (!this.inputSpan.textContent) {
        // 没内容了, 直接关闭
        this.close(false)
      }
      else {
        this.currentCallbacks.onInput?.call(this, this.currentValue)
      }
    }
    this._capturedSelChangeListener = (ev: Event) => {
      ev.stopPropagation()
    }
    this._capturedMouseDownListener = (ev: MouseEvent) => {
      if (this.wrapper.contains(ev.target as Node)) {
        return
      }
      // 点击了其他地方, 关闭dropdown
      this.close(false)
      ev.stopPropagation()
    }
  }

  #addCaptureListener() {
    this._ctx.editor.host.addEventListener('keydown', this._capturedKeydownListener, { capture: true })
    this._ctx.editor.host.addEventListener('keyup', this._capturedKeyupListener, { capture: true })
    this._ctx.editor.host.addEventListener('beforeinput', this._capturedBeforeInputListener, { capture: true })
    this._ctx.editor.host.addEventListener('input', this._capturedInputListener, { capture: true })
    document.addEventListener('selectionchange', this._capturedSelChangeListener, { capture: true })
    document.addEventListener('mousedown', this._capturedMouseDownListener, { capture: true })
  }

  #removeCaptureListener() {
    this._ctx.editor.host.removeEventListener('keydown', this._capturedKeydownListener, { capture: true })
    this._ctx.editor.host.removeEventListener('keyup', this._capturedKeyupListener, { capture: true })
    this._ctx.editor.host.removeEventListener('beforeinput', this._capturedBeforeInputListener, { capture: true })
    this._ctx.editor.host.removeEventListener('input', this._capturedInputListener, { capture: true })
    document.removeEventListener('selectionchange', this._capturedSelChangeListener, { capture: true })
    document.removeEventListener('mousedown', this._capturedMouseDownListener, { capture: true })
  }

  /* -------------------------------------------------------------------------- */
  /*                                   create                                   */
  /* -------------------------------------------------------------------------- */
  createContent(el: HTMLDivElement, menus: DropdownMenu[], callbacks?: DropdownCallbacks): DropdownContent {
    el.classList.add(DropdownEnum.Class_Content)
    return { el, menus, callbacks }
  }

  /**
   * 创建一个dropdown菜单
   * @param name 菜单名, 当options.items非空时, name不会展示;
   *      items为空且 name 非空时, 该值会成为返回的 el 的第一个子节点(文本节点)的内容
   * @param options 菜单选项
   * ```ts
   *  icon  菜单项图标  (items 非空时此项无效)
   *  items  菜单子项
   *  nextContent  下一级菜单  (items 非空时此项无效)
   *  onchosen  被选择回调  (items 非空时此项无效)
   *  filter  效应过滤规则
   *  prefixes  提示前缀  (items 非空时此项无效)
   * ```
   */
  createMenu(name: string, options: DropdownMenuOptions): DropdownMenu {
    const div = this.#createMenuEl(options.defaultStyle)
    name = name.slice(0, 20).trim()
    const { icon, items, nextContent, onchosen } = options
    if (icon) {
      div.appendChild(icon)
    }
    if (onchosen) {
      div.onmousedown = (e) => {
        e.preventDefault()
        e.stopPropagation()
        // 必须先close 撤销dropdown给编辑器带来的副作用
        this.close()
        onchosen.call(this, this._ctx)
      }
    }
    if (items && items.length > 0) {
      for (const item of items) {
        div.appendChild(item.el)
      }
    }
    else {
      div.appendChild(new Text(name))
      if (nextContent) {
        div.appendChild(chevronRightIcon())
      }
      else {
        div.appendChild(returnIcon())
      }
    }

    return {
      el: div,
      ...options,
    }
  }

  createMenuItem(
    icon: HTMLElement | SVGElement,
    onchosen: (ctx: Et.EditorContext) => void,
    options?: DropdownMenuItemOptions,
  ): DropdownMenuItem {
    if (icon.localName === 'svg') {
      // svg 不支持::before/::after, 要启用 tip, 要包裹在一个 html 元素内
      const span = document.createElement('span')
      span.appendChild(icon)
      icon = span
    }
    icon.classList.add(DropdownEnum.Class_Menu_Item, options?.className ?? CssClassEnum.BgItem)
    icon.onmousedown = (e) => {
      e.stopPropagation()
      e.preventDefault()
      // 必须先close 撤销dropdown给编辑器带来的副作用
      this.close()
      onchosen(this._ctx)
    }
    if (options?.tip) {
      icon.setAttribute(HtmlAttrEnum.HintTitle, options.tip)
    }
    return {
      el: icon,
      onchosen,
      ...options,
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                   update                                   */
  /* -------------------------------------------------------------------------- */
  addInlineRichTextMenuItem(item: DropdownMenuItem) {
    this.inlineRichMenu.items.push(item)
    this.inlineRichMenu.el.appendChild(item.el)
    return this
  }

  addBlockRichTextMenuItem(item: DropdownMenuItem) {
    this.blockRichMenu.items.push(item)
    this.blockRichMenu.el.appendChild(item.el)
    return this
  }

  /**
   * 增加一个menu到默认内容中
   * @param insertTo 插入到指定次序, 0则插入到头部, 小于0或大于当前menus长度会追加到末尾
   */
  addMenuToDefaultContent(menu: DropdownMenu, insertTo = -1) {
    const defaultMenus = this.defaultContent.menus
    if (insertTo < 0) {
      defaultMenus.push(menu)
      return
    }
    if (insertTo > defaultMenus.length) {
      insertTo = defaultMenus.length
    }
    defaultMenus.splice(insertTo, 0, menu)
    Promise.resolve().then(() => this.#updateDefaultContent())
  }

  #updateDefaultContent() {
    const { el, menus } = this.defaultContent
    el.textContent = ''
    for (const menu of menus) {
      el.appendChild(menu.el)
    }
  }

  updateCurrentContent(content: DropdownContent) {
    this.container.replaceChildren(content.el)
    this.currentContent = content
    this.currentMenuIndex = 0
    this.currentItemIndex = 0

    // 过滤
    this.#filterMenuItemsOnContentChanged()
  }

  /**
   * 选择下一个menu或item
   * @param itemStep item的步进数, 当使用上下方向键选择时, 可提供一定的步长以上下选择, 而不是左右选择
   */
  selectNextMenuOrItem(itemStep = 1) {
    if (!this.currentContent) {
      return
    }
    const currMenus = this.menuItemsOnCurrentInput
    if (!currMenus.length) {
      return
    }
    let mIndex = this.currentMenuIndex, iIndex = this.currentItemIndex
    const currItemIndex = iIndex
    let { menu, items } = currMenus[mIndex], item: DropdownMenuItem
    if (items && (item = items[iIndex])) {
      // 当前选择item
      this.#unselectMenuOrItem(item)
      iIndex += itemStep
      if (iIndex < items.length) {
        item = items[iIndex]
        this.#selectMenuOrItem(item)
        this.currentMenuIndex = mIndex
        this.currentItemIndex = iIndex
        return
      }
      // 步进后超出items长度, 选择下一个menu
    }
    else {
      // 当前选择menu, 解除该选择状态
      this.#unselectMenuOrItem(menu)
    }
    mIndex++
    if (mIndex > currMenus.length - 1) {
      mIndex = 0
    }
    menu = currMenus[mIndex].menu
    items = currMenus[mIndex].items
    if (items && items.length) {
      // 有item, 选择item
      const idx = itemStep > 1 && currItemIndex < items.length ? currItemIndex : 0
      item = items[idx]
      this.#selectMenuOrItem(item)
      this.currentMenuIndex = mIndex
      this.currentItemIndex = idx
    }
    else {
      // 无item, 选择menu
      this.#selectMenuOrItem(menu)
      this.currentMenuIndex = mIndex
      this.currentItemIndex = 0
    }
    return
  }

  /**
   * 选择上一个menu或item
   * @param itemStep item的步进数, 当使用上下方向键选择时, 可提供一定的步长以上下选择, 而不是左右选择
   */
  selectPrevMenuOrItem(itemStep = 1) {
    if (!this.currentContent) {
      return
    }
    const currMenus = this.menuItemsOnCurrentInput
    if (!currMenus.length) {
      return
    }
    let mIndex = this.currentMenuIndex, iIndex = this.currentItemIndex
    const currItemIndex = iIndex
    let { menu, items } = currMenus[mIndex], item: DropdownMenuItem
    if (items && (item = items[iIndex])) {
      // 当前选择item, 解除选择状态
      this.#unselectMenuOrItem(item)
      // 尝试选择上一个步进的item
      iIndex -= itemStep
      if (iIndex >= 0) {
        item = items[iIndex]
        this.#selectMenuOrItem(item)
        this.currentItemIndex = iIndex
        return
      }
      // 步进超出当前items范围, 选择上一个menu
    }
    else {
      // 当前选择menu, 解除选择状态
      this.#unselectMenuOrItem(menu)
    }
    mIndex--
    if (mIndex < 0) {
      mIndex = currMenus.length - 1
    }
    menu = currMenus[mIndex].menu
    items = currMenus[mIndex].items
    // 上一个menu有item,
    if (items && items.length) {
      // 尝试视觉上一个, 没有则选择最后一个
      const idx = itemStep > 1 && currItemIndex < items.length ? currItemIndex : items.length - 1
      item = items[idx]
      this.#selectMenuOrItem(item)
      this.currentMenuIndex = mIndex
      this.currentItemIndex = idx
    }
    // 否则, 选择该menu
    else {
      this.#selectMenuOrItem(menu)
      this.currentMenuIndex = mIndex
      this.currentItemIndex = 0
    }
    return
  }

  /**
   * 选择当前菜单项的下一个item, 或下一个content
   */
  selectNextItemOrContent() {
    if (!this.currentContent || !this.menuItemsOnCurrentInput.length) {
      return
    }
    const menu = this.currentContent.menus[this.currentMenuIndex]
    if (!menu) {
      return
    }
    if (menu.items) {
      this.selectNextMenuOrItem()
    }
    else if (menu.nextContent) {
      this.updateCurrentContent(menu.nextContent)
    }
  }

  #selectMenuItemAfterFilter() {
    this.currentMenuIndex = 0
    this.currentItemIndex = 0
    // 尝试选择
    if (!this.menuItemsOnCurrentInput.length) {
      return
    }
    if (this.currentSelectedMenuOrItem) {
      this.#unselectMenuOrItem(this.currentSelectedMenuOrItem)
    }
    const { menu, items } = this.menuItemsOnCurrentInput[0]
    if (items && items.length) {
      this.#selectMenuOrItem(items[0])
    }
    else {
      this.#selectMenuOrItem(menu)
    }
  }

  /**
   * open时, 根据光标位置设置当前 open 永久过滤菜单项;
   * 调用前需确保currentContent非空, 即当前内容是使用非render方式渲染的
   */
  #filterMenuItemsOnContentChanged() {
    // currentContent !== null | undefined
    if (!this.currentContent || !this._ctx.focusEtElement) {
      return
    }
    const needHideElSet = this.hiddenMenuItemElsOnCurrentOpen
    for (const el of needHideElSet.values()) {
      // 取消上一次 open 隐藏了的menu或item
      el.classList.remove(CssClassEnum.Hidden)
    }
    needHideElSet.clear()

    const filteredMenuItems = this.menuItemsOnCurrentOpen
    filteredMenuItems.length = 0
    const { etCode, inEtCode } = this._ctx.focusEtElement
    const menus = this.currentContent.menus
    for (const menu of menus) {
      if (!menu.filter) {
        filterPassedMenuItems(menu, etCode, inEtCode)
        continue
      }
      const { etType, matchEtType, unmatchEtType } = menu.filter
      // 判断当前etel下是否允许该etType
      if ((etType && !(etType & inEtCode))
        // 判断当前etCode是否匹配
        || (matchEtType && !(matchEtType & etCode))
        || (unmatchEtType && (unmatchEtType & etCode))
      ) {
        needHideElSet.add(menu.el)
        continue
      }
      filterPassedMenuItems(menu, etCode, inEtCode)
    }
    for (const el of needHideElSet.values()) {
      el.classList.add(CssClassEnum.Hidden)
    }
    this.#filterMenuItemsOnInput()
    this.#selectMenuItemAfterFilter()

    function filterPassedMenuItems(menu: DropdownMenu, etCode: number, inEtCode: number) {
      const items = menu.items
      if (!items || items.length === 0) {
        filteredMenuItems.push({ menu })
        return
      }
      const showItems = []
      for (const item of items) {
        if (!item.filter) {
          showItems.push(item)
          continue
        }
        const { etType, matchEtType, unmatchEtType } = item.filter
        if ((etType && !(etType & inEtCode))
          || (matchEtType && !(matchEtType & etCode))
          || (unmatchEtType && (unmatchEtType & etCode))
        ) {
          needHideElSet.add(item.el)
          continue
        }
        showItems.push(item)
      }
      if (showItems.length) {
        filteredMenuItems.push({ menu, items: showItems })
      }
      else {
        // item都被过滤掉了, menu也该隐藏
        needHideElSet.add(menu.el)
      }
    }
  }

  /** 根据当前input的内容过滤菜单项; 调用前需确保currentContent非空, 即当前内容是使用非render方式渲染的  */
  #filterMenuItemsOnInput() {
    // currentContent !== null | undefined
    this.#beforeFilterOnInput()
    const currVal = this.currentValue
    if (!currVal) {
      this.menuItemsOnCurrentInput.length = 0
      this.menuItemsOnCurrentInput.push(...this.menuItemsOnCurrentOpen)
      this.#afterFilterOnInput()
      return
    }

    const filteredMenuItems = this.menuItemsOnCurrentInput
    const needHideEls = this.hiddenMenuItemElsOnCurrentInput
    for (const { menu, items } of this.menuItemsOnCurrentOpen) {
      if (menu.prefixes) {
        let menuMatch = false
        for (const prefix of menu.prefixes) {
          if (prefix.startsWith(currVal)) {
            menuMatch = true
            break
          }
        }
        // 没有item
        if (!items || !items.length) {
          if (menuMatch) {
            filteredMenuItems.push({ menu })
          }
          else {
            needHideEls.add(menu.el)
          }
        }
        else {
          const filteredItems = filterItems(items)
          if (filteredItems.length) {
            filteredMenuItems.push({ menu, items: filteredItems })
          }
          else {
            needHideEls.add(menu.el)
          }
        }
      }
      else {
        if (items) {
          const filteredItems = filterItems(items)
          if (filteredItems.length) {
            filteredMenuItems.push({ menu, items: filteredItems })
          }
          else {
            needHideEls.add(menu.el)
          }
        }
        else {
          needHideEls.add(menu.el)
        }
      }
    }
    this.#afterFilterOnInput()

    /**
     * @returns 是否所有item 都被过滤掉
     */
    function filterItems(items: DropdownMenuItem[]): DropdownMenuItem[] {
      if (!items.length) {
        return []
      }
      const res = []

      for (const item of items) {
        let hide = true
        if (item.prefixes) {
          for (const prefix of item.prefixes) {
            if (prefix.startsWith(currVal)) {
              hide = false
              res.push(item)
              break
            }
          }
        }
        if (hide) {
          needHideEls.add(item.el)
        }
      }

      return res
    }
  }

  #beforeFilterOnInput() {
    if (this.hiddenMenuItemElsOnCurrentInput.size) {
      for (const el of this.hiddenMenuItemElsOnCurrentInput.values()) {
        el.classList.remove(CssClassEnum.Hidden)
      }
      this.hiddenMenuItemElsOnCurrentInput.clear()
    }
    this.menuItemsOnCurrentInput.length = 0
  }

  #afterFilterOnInput() {
    for (const el of this.hiddenMenuItemElsOnCurrentInput.values()) {
      el.classList.add(CssClassEnum.Hidden)
    }
    this.#selectMenuItemAfterFilter()
  }

  /* -------------------------------------------------------------------------- */
  /*                                   handle                                   */
  /* -------------------------------------------------------------------------- */
  /**
   * 获取当前选择的菜单或菜单项; 当某个menu 的 items 非空时, 该 menu 不会被选择
   * @returns 当前选择的菜单或菜单项, 若未选择则返回null
   */
  currentMenuOrItem(): DropdownMenu | DropdownMenuItem | null {
    if (!this.currentContent) {
      return null
    }
    const menuItems = this.menuItemsOnCurrentInput[this.currentMenuIndex]
    if (!menuItems) {
      return null
    }
    let item
    if (menuItems.items && (item = menuItems.items[this.currentItemIndex])) {
      return item
    }
    else {
      return menuItems.menu
    }
  }

  choseMenuOrItem() {
    const menuOrItem = this.currentMenuOrItem()
    // 必须先close, 撤回dropdown给编辑器带来的副作用, 恢复原本光标位置
    this.close()
    menuOrItem?.onchosen?.call(this, this._ctx)
  }

  /**
   * 初始化dropdown container的内容, 并使用 dropdown 默认的交互逻辑 (tab/方向键选择, enter确认)
   * @param content dropdown的内容元素, 未提供时, 使用内置默认内容
   */
  adopt(content?: DropdownContent): Dropdown
  /**
   * 使用渲染函数初始化dropdown container元素; 并自定义处理dropdown过程中的交互逻辑
   * * 由于dropdown在编辑区(et-body)内, 因此内部的事件监听器需要禁止冒泡,
   *   特别的还需禁止默认事件, 如mousedown, 若不禁止会发生焦点转移, 导致找不到selection
   * @param render 提供给react/vue等框架的渲染接口, 有一个参数, 即dropdown容器元素; 并返回一个对象, 处理dropdown过程中的交互;
   */
  adopt(render: DropdownContentRender): Dropdown
  adopt(renderOrContent?: DropdownContent | DropdownContentRender): Dropdown
  adopt(renderOrContent?: DropdownContent | DropdownContentRender) {
    if (typeof renderOrContent === 'function') {
      this.currentCallbacks = renderOrContent(this.container)
      this.currentContent = null // 使用null表示当前内容由外部控制
    }
    else if (renderOrContent) {
      this.currentCallbacks = {
        ...this.defaultCallbacks,
        ...(renderOrContent.callbacks || {}),
      }
      this.updateCurrentContent(renderOrContent)
    }
    else {
      this.currentCallbacks = this.defaultCallbacks
      this.updateCurrentContent(this.defaultContent)
    }
    return this
  }

  /**
   * 打开dropdown; 若先前未adopt, 则使用默认内容渲染dropdown; 若光标非collapsed, 则不会open
   * @param char dropdown展开后光标位置的初始字符, 如使用`/`激活dropdown, 则该值可用`/`; 默认是一个零宽字符
   */
  open(char = HtmlCharEnum.ZERO_WIDTH_SPACE) {
    if (!this._ctx.selection.isCollapsed || !this._ctx.isUpdated()) {
      return false
    }
    const tc = this._ctx.selection.getTargetCaret()
    if (!tc) {
      return false
    }
    // TODO 仅允许在纯段落下展开默认的dropdown
    // 在其他位置展开dropdown上存在许多问题, 如dropdown展开创建一个mark.bold临时节点,
    // 然后在此临时节点内不输入任何内容再次展开dropdown, 光标就会定位到dropdown以外, 有待解决
    // 在解决这些潜在问题之前, 不应取消该限制
    // if (!this._ctx.isPlainParagraph(this._ctx.focusEtElement)) {
    //   return false
    // }
    if (this.currentContent === void 0) {
      const content = this.contentMap[this._ctx.focusEtElement.localName]
      if (!content) {
        return false
      }
      this.adopt(content)
    }

    this.isOpened = true
    const text = new Text(char) as Et.Text
    this.inputSpan.textContent = ''
    this.inputSpan.appendChild(text)

    // 使用默认内置content 且无menu时, 直接退出
    if (this.currentContent && !this.currentContent.menus.length) {
      this._ctx.assists.logger?.log('dropdown 无menu, 不显示', 'Assist-Dropdown')
      return false
    }

    if (this.currentCallbacks.onopen?.call(this, this._ctx.focusEtElement)) {
      return false
    }
    this.#addCaptureListener()

    // 以临时节点方式插入, 不设置光标位置, 让 dropdown 展开过程中的命令能用回原来的光标位置
    this._ctx.commandManager.pushHandleCallback(() => {
      this.inputSpan.focus()
    })
    return this._ctx.commonHandler.insertElementTemporarily(this.wrapper, null, null)
  }

  /**
   * 关闭dropdown, 撤销插入的dropdown临时节点, 恢复编辑器光标位置
   * @param insertText 是否将dropdown中输入的文本插入光标所在位置
   */
  close(insertText = false) {
    // close时撤销dropdown给编辑区带来的副作用
    this.#removeCaptureListener()
    this.currentCallbacks.onclose?.call(this)
    this._ctx.commandManager.discard()

    this.isOpened = false
    this.currentContent = void 0
    this.currentMenuIndex = 0
    this.currentItemIndex = 0
    if (this.currentSelectedMenuOrItem) {
      this.#unselectMenuOrItem(this.currentSelectedMenuOrItem)
      this.currentSelectedMenuOrItem = null
    }
    // 若dropdown输入了文本, 则插回光标位置
    if (insertText) {
      const data = this._ctx.assists.dropdown.currentValue
      if (data) {
        this._ctx.commonHandler.insertText(data, null)
      }
    }
  }

  /**
   * 注册dropdown内容, 后续open时, 优先根据当前光标所在效应元素渲染其内容;
   * * 若已注册, 则覆盖
   * * dropdown 初始化时, 会为当前 schema 段落注册默认的 dropdown 内容
   * @param contentMap 效应元素小写标签名对应的dropdown内容或渲染函数
   */
  register(contentMap: Record<string, DropdownContent | DropdownContentRender>) {
    Object.assign(this.contentMap, contentMap)
  }
}
