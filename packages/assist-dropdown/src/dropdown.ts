import type { Et } from '@effitor/core'
import { cr } from '@effitor/core'
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
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuItemOptions,
  DropdownMenuOptions,
} from './config'
import { DropdownEnum } from './config'

export const defaultOptions = {
  /** 触发dropdown 的按键, 现强制只能为 '/' 键 */
  triggerKey: '/' as const,
  /**
   * 修饰键, 默认为true
   * ```
   * undefined: 不使用修饰键, 按下 / 直接打开dropdown
   * true: MacOS下使用 Command+/; 其他使用Ctrl+/
   * Alt: 使用 Alt+/
   * Control: 使用 Ctrl+/
   * Meta: 使用Meta+/, 或Command+/ (MacOS)
   * ```
   */
  triggerMod: true as true | 'Alt' | 'Control' | 'Meta',

  maxWidth: 188,
  maxHeight: 256,
}
export type DropdownAssistOptions = Partial<typeof defaultOptions>

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
  #createMenuEl = () => {
    const div = document.createElement('div')
    div.className = DropdownEnum.Class_Menu
    return div
  }

  #selectMenuOrItem = (obj: DropdownMenu | DropdownMenuItem) => {
    obj.el.classList.add(CssClassEnum.Selected)
    this.currentSelectedMenuOrItem = obj
  }

  #unselectMenuOrItem = (obj: DropdownMenu | DropdownMenuItem) => {
    obj.el.classList.remove(CssClassEnum.Selected)
  }

  private _ctx: Et.EditorContext

  private wrapper: HTMLDivElement
  private inputSpan: HTMLSpanElement
  private container: HTMLDivElement

  // private isDefaultDropdown: boolean = true
  private defaultContent: DropdownContent
  private defaultCallbacks: DropdownCallbacks
  /** 内联富文本菜单 */
  private inlineRichMenu: DropdownMenu & Pick<Required<DropdownMenu>, 'items'> = { el: this.#createMenuEl(), items: [] }
  /** 块级富文本菜单 */
  private blockRichMenu: DropdownMenu & Pick<Required<DropdownMenu>, 'items' | 'filter'> = {
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
  private menuItemsOnCurrentOpen: { menu: DropdownMenu, items?: DropdownMenuItem[] }[] = []
  /** 当前open临时匹配的菜单项: 当前经过filter和prefix过滤的菜单项; 用于切换当前可选择的菜单项 */
  private menuItemsOnCurrentInput: { menu: DropdownMenu, items?: DropdownMenuItem[] }[] = []
  /** 当前open永久隐藏的菜单项的元素节点: 经etType过滤掉的菜单项的元素 */
  private hiddenMenuItemElsOnCurrentOpen = new Set<Element>()
  /** 当前open临时隐藏的菜单项的元素节点: 经prefix过滤掉的菜单项的元素 */
  private hiddenMenuItemElsOnCurrentInput = new Set<Element>()
  private currentMenuIndex = 0
  private currentItemIndex = 0
  /** 当前选择的menu/item的元素, 用于快速解除selected样式 */
  private currentSelectedMenuOrItem: DropdownMenu | DropdownMenuItem | null = null
  private currentCallbacks: Readonly<DropdownCallbacks> = {}

  isOpened = false

  /** 当前dropdown输入的文本 */
  get currentValue() {
    const text = this.inputSpan.textContent.trim()
    return text[0] === HtmlCharEnum.ZERO_WIDTH_SPACE ? text.slice(1) : text
  }

  constructor(ctx: Et.EditorContext, signal: AbortSignal, options: Required<DropdownAssistOptions>) {
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
    defaultContentEl.setAttribute('style', `max-height: ${options.maxHeight}px; max-width: ${options.maxWidth}px;`)
    this.defaultContent = {
      el: defaultContentEl,
      menus: [this.inlineRichMenu, this.blockRichMenu],
    }
    // 将 defaultContent 的 menus 添加到 defaultContentEl 中
    this.#updateDefaultContent()

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
    inputSpan.addEventListener('keydown', (ev) => {
      ev.stopPropagation()
      if (['Backspace', 'Delete'].includes(ev.key)) {
        // 放行删除行为
        return
      }
      if (ev.metaKey || ev.ctrlKey) {
        // 禁止剪切/粘贴等操作
        ev.preventDefault()
      }
      // 非可打印按键一律禁止, 如PageUp/PageDown等
      if (ev.key.length > 1) {
        ev.preventDefault()
      }
      switch (ev.key) {
        case 'Escape': {
          this.close(false)
          return
        }
        case 'Tab': {
          this.currentCallbacks.onTab?.(ev.shiftKey)
          return
        }
        case 'Enter': {
          this.currentCallbacks.onEnter?.()
          return
        }
        case 'ArrowUp': {
          this.currentCallbacks.onArrowUp?.()
          return
        }
        case 'ArrowDown': {
          this.currentCallbacks.onArrowDown?.()
          return
        }
        case 'ArrowLeft': {
          this.currentCallbacks.onArrowLeft?.()
          return
        }
        case 'ArrowRight': {
          this.currentCallbacks.onArrowRight?.()
          return
        }
      }
    }, { signal })
    inputSpan.addEventListener('beforeinput', ev => ev.stopPropagation(), { signal })
    inputSpan.addEventListener('input', (ev) => {
      ev.stopPropagation()
      if (!this.inputSpan.textContent) {
        // 没内容了, 直接关闭
        this.close(false)
      }
      else {
        this.currentCallbacks.onInput?.(this.currentValue)
      }
    }, { signal })
    // input.addEventListener('blur', e => this.close(true), { signal })
  }

  /* -------------------------------------------------------------------------- */
  /*                                   create                                   */
  /* -------------------------------------------------------------------------- */
  createContent(el: HTMLDivElement, menus: DropdownMenu[]): DropdownContent {
    return { el, menus }
  }

  /**
   * 创建一个dropdown菜单
   * @param name 菜单名, 当options.items非空时, name不会展示
   * @param options
   * @returns
   */
  createMenu(name: string, options: DropdownMenuOptions): DropdownMenu {
    const div = this.#createMenuEl()
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
        onchosen(this._ctx)
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
    if (items && (item = items[0])) {
      // 有item, 选择item
      this.#selectMenuOrItem(item)
      this.currentMenuIndex = mIndex
      this.currentItemIndex = 0
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
    // 上一个menu有item, 尝试选择最后一个
    if (items && (item = items[items.length - 1])) {
      this.#selectMenuOrItem(item)
      this.currentMenuIndex = mIndex
      this.currentItemIndex = items.length - 1
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
      this.menuItemsOnCurrentInput = [...this.menuItemsOnCurrentOpen]
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
  choseMenuOrItem() {
    if (!this.currentContent) {
      return
    }
    // 记录当前选择的索引, close会重置这些索引
    const mIndex = this.currentMenuIndex, iIndex = this.currentItemIndex
    // 必须先close, 撤回dropdown给编辑器带来的副作用, 恢复原本光标位置
    this.close()

    const menuItems = this.menuItemsOnCurrentInput[mIndex]
    if (!menuItems) {
      return
    }
    let item
    if (menuItems.items && (item = menuItems.items[iIndex])) {
      item.onchosen(this._ctx)
    }
    else {
      menuItems.menu.onchosen?.(this._ctx)
    }
  }

  /**
   * 初始化dropdown container元素
   * @param content dropdown的内容元素, 未提供时, 使用内置默认内容
   */
  adopt(content?: DropdownContent): Dropdown
  /**
   * 使用渲染函数初始化dropdown container元素; 并自定义处理dropdown过程中的交互逻辑
   * * 由于dropdown在编辑区(et-body)内, 因此内部的事件监听器需要禁止冒泡, 特别的还需禁止默认事件, 如mousedown, 若不禁止会发生焦点转移, 导致CaretContext找不到selection
   * @param render 提供给react/vue等框架的渲染接口, 有一个参数, 即dropdown容器元素; 并返回一个对象, 处理dropdown过程中的交互;
   */
  adopt(render: (container: HTMLDivElement) => DropdownCallbacks): Dropdown
  adopt(renderOrContent?: DropdownContent | ((container: HTMLDivElement) => DropdownCallbacks)) {
    if (typeof renderOrContent === 'function') {
      this.currentCallbacks = renderOrContent(this.container)
      this.currentContent = null // 使用null表示当前内容由外部控制
    }
    else {
      this.currentCallbacks = this.defaultCallbacks
      this.updateCurrentContent(renderOrContent ? renderOrContent : this.defaultContent)
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
    // TODO 仅允许在纯段落下展开dropdown
    // 在其他位置展开dropdown上存在许多问题, 如dropdown展开创建一个mark.bold临时节点,
    // 然后在此临时节点内不输入任何内容再次展开dropdown, 光标就会定位到dropdown以外, 有待解决
    // 在解决这些潜在问题之前, 不应取消该限制
    if (!this._ctx.isPlainParagraph(this._ctx.focusEtElement)) {
      return false
    }

    this.isOpened = true
    const text = new Text(char) as Et.Text
    this.inputSpan.textContent = ''
    this.inputSpan.appendChild(text)

    if (!this.currentContent) {
      this.adopt()
    }
    // 使用默认内置content 且无menu时, 直接退出
    if (this.currentContent && !this.currentContent.menus.length) {
      this._ctx.assists.logger?.log('dropdown 无menu, 不显示', 'Assist-Dropdown')
      return false
    }

    this.currentCallbacks.onopen?.()
    return this._ctx.commonHandlers.insertElementTemporarily(this.wrapper, null, cr.caret(text, text.length))
  }

  /**
   * 关闭dropdown, 撤销插入的dropdown临时节点, 恢复编辑器光标位置
   * @param insertText 是否将dropdown中输入的文本插入光标所在位置
   */
  close(insertText = false) {
    // close时撤销dropdown给编辑区带来的副作用
    this.currentCallbacks.onclose?.()
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
        this._ctx.commonHandlers.insertText(data, null)
      }
    }
  }
}
