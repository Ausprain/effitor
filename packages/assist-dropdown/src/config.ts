import type { Et } from '@effitor/core'
import type { TrueOrVoid } from '@effitor/shared'

import type { Dropdown } from './dropdown'

export const enum DropdownEnum {
  Class_Wrapper = 'et-dd__wrapper',
  Class_Container = 'et-dd__container',
  Class_Content = 'et-dd__content',
  Class_Menu = 'et-dd-menu',
  Class_Menu_Item = 'et-dd-menu__item',
}

export interface DropdownContent {
  /** 下拉菜单容器, 需自行将 menus 中的 el 或 icon 插入该容器内; dropdown 只负责将该 el 插入 dropdown 容器 */
  el: HTMLDivElement
  /** 一级菜单项 */
  menus: DropdownMenu[]
  /** 回调函数 */
  callbacks?: DropdownCallbacks
}

export interface DropdownFilter {
  /**
   * * `tldr:`此次 dropdown 可能往当前效应元素插入的元素的效应类型,
   *          若不插入效应元素到当前效应元素内, 或对当前效应元素无效应副作用, 可设置为 0；
   *          若设置为-1，则该项会被永远忽略
   *
   * 对应操作可能产生的效应类型, 判断该etType是否是ctx.focusEtElement.inEtCode的子集,
   * 即当前效应元素下是否允许此效应, 以筛选过滤menu/item \
   * 如插入链接, 则该值为链接的etType 或链接节点实例的etCode值 \
   * etType是验证当前效应元素的子集, 而matchEtType和unmatchEtType是验证效应元素 \
   * 该值必须传入, 以让dropdown自动判断当前位置的是否显示该菜单项; 若无限制, 可手动设置 0
   */
  etType: number
  /**
   * ctx.focusEtElement.etCode 是否匹配该值(交集), 匹配才显示
   */
  matchEtType?: number
  /**
   * ctx.focusEtElement.etCode 是否匹配该值(交集), 不匹配才显示, 优先级比matchEtType高
   */
  unmatchEtType?: number
}
interface DropdownItemOptions {
  /**
   * 默认按下空格会关闭dropdown, 并校验当前输入文本与prefix匹配, 若相同则执行onchosen; 否则将文本插回编辑器光标位置\
   * 允许有多个prefix, 如`image, img`都指向图片相关menu/item; 但多个menu/item的prefix不允许重复, 重复时后来者会覆盖前者 \
   * 此项应使用完整字符串, 而非前缀, 如`iamge`, 而非`im`或`ima`等
   */
  prefixes?: string[]
  /**
   * 仅当ctx.focusEtElement匹配matchEtType但不匹配unmatchEtType时显示该menu或item \
   * 若缺省该值, 则应在onchosen回调中自行校验该menu/item的行为预期给编辑器带来的副作用是否合法 (如inlineCode里插入bold为不合法)
   */
  filter?: DropdownFilter
}
export interface DropdownMenuOptions extends DropdownItemOptions {
  icon?: SVGElement
  /** 进阶菜单页, 当items非空时, nextContent将被忽视 */
  nextContent?: DropdownContent
  /** 当前菜单中的选项, 为一个个图标, 当items非空时, nextContent将被忽视 */
  items?: DropdownMenuItem[]
  /** 是否使用默认hover/active样式 */
  defaultStyle?: boolean
  onchosen?: (this: Dropdown, ctx: Et.EditorContext) => void
}
export interface DropdownMenu extends Omit<DropdownMenuOptions, 'icon'> {
  el: HTMLDivElement
  // icon: SVGElement  // 植入el
  // name: string     // 植入el
}

export interface DropdownMenuItemOptions extends DropdownItemOptions {
  /** 鼠标悬停在item上时, 显示的提示; 使用 HtmlAttrEnum.HintTitle 实现 */
  tip?: string
  /** 给item添加的className, 带有:hover/:active等的样式; 默认使用内置的.Et__bg-item */
  className?: string
}
export interface DropdownMenuItem extends DropdownMenuItemOptions {
  el: HTMLElement | SVGElement
  onchosen: (ctx: Et.EditorContext) => void
}
export interface DropdownCallbacks {
  onTab?: (this: Dropdown, shiftKey: boolean) => void
  onEnter?: (this: Dropdown) => void
  onArrowUp?: (this: Dropdown) => void
  onArrowDown?: (this: Dropdown) => void
  onArrowLeft?: (this: Dropdown) => void
  onArrowRight?: (this: Dropdown) => void
  /**
   * 若没有设置onInput, 则在input时关闭dropdown
   * @param value dropdown期间输入的内容, 会去除前后空白字符和零宽字符
   */
  onInput?: (this: Dropdown, value: string) => void

  /**
   * 在dropdown.open初始化之后, 插入dropdown节点前执行; 当且仅当执行并返回 true, 阻止dropdown
   * @param etel 当前效应元素 (ctx.focusEtElement)
   * @returns 是否禁止dropdown打开
   */
  onopen?: (this: Dropdown, etel: Et.EtElement) => TrueOrVoid
  /** 在dropdown.close开始时(撤销 dropdown 副作用后)执行 */
  onclose?: (this: Dropdown) => void
}
export interface DropdownTrigger {
  /** 触发dropdown 的按键, 现强制只能为 '/' 键 */
  triggerKey?: '/'
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
  triggerMod?: true | 'Alt' | 'Control' | 'Meta'
}
export interface DropdownContentRender {
  (container: HTMLDivElement): DropdownCallbacks
}
