import type { Et } from '@effitor/core'

export const enum DropdownEnum {
  Class_Wrapper = 'et-dd__wrapper',
  Class_Container = 'et-dd__container',
  Class_Content = 'et-dd__content',
  Class_Menu = 'et-dd-menu',
  Class_Menu_Item = 'et-dd-menu__item',
}

export interface DropdownContent {
  el: HTMLDivElement
  menus: DropdownMenu[]
}

interface DropdownFilter {
  /**
   * * `tldr:`此次 dropdown 可能往当前效应元素插入的元素的效应类型,
   *          若不插入元素到当前效应元素内, 即对当前效应元素无效应副作用, 可设置为 0 或 -1
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
  onchosen?: (ctx: Et.EditorContext) => void
}
export interface DropdownMenu extends Omit<DropdownMenuOptions, 'icon'> {
  el: HTMLDivElement
  // icon: SVGElement  // 植入el
  // name: string     // 植入el
}

export interface DropdownMenuItemOptions extends DropdownItemOptions {
  tip?: string
  /** 给item添加的className, 带有:hover/:active等的样式; 默认使用内置的.bg-item */
  className?: string
}
export interface DropdownMenuItem extends DropdownMenuItemOptions {
  el: HTMLElement | SVGElement
  onchosen: (ctx: Et.EditorContext) => void
}
export interface DropdownCallbacks {
  onTab?: (shiftKey: boolean) => void
  onEnter?: () => void
  onArrowUp?: () => void
  onArrowDown?: () => void
  onArrowLeft?: () => void
  onArrowRight?: () => void
  /**
   * 若没有设置onInput, 则在input时关闭dropdown
   * @param value dropdown期间输入的内容, 会去除前后空白字符和零宽字符
   */
  onInput?: (value: string) => void

  /** 在dropdown.open初始化之后, 插入dropdown节点前执行 */
  onopen?: () => void
  /** 在dropdown.close开始时执行 */
  onclose?: () => void
}
