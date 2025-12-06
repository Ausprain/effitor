import type { Et } from '@effitor/core'
import type { TrueOrVoid } from '@effitor/shared'

export const enum PopupEnum {
  Class_Popup = 'et-popup',
  Class_Popup_Show = 'et-popup--show',
  Class_Popup_Item = 'et-popup__item',
  Class_Popup_Item_Container = 'et-popup__item-container',
  Attr_Popup_Key = 'popup-key',
}

export type PopupContent = HTMLDivElement

export interface ChoseItemCallback<T extends Et.EtElement> {
  /**
   * @param ctx 编辑器上下文
   * @param self 当前选择的popup item对应的图标元素
   * @param target 导致当前popup的效应元素
   */
  (ctx: Et.EditorContext, self: HTMLElement | SVGElement, target: T): void
}
/**
 * popup item, 范型参数可用于指定引起该popup的效应元素
 */
export interface PopupItem<T extends Et.EtElement> {
  el: HTMLElement | SVGElement
  tip: string
  onchosen: ChoseItemCallback<T>
  filter?: PopupItemFilter
}
export interface PopupItemFilter {
  matchEtType?: number
  unmatchEtType?: number
}

export interface PopupRender {
  /** 提供给vue等框架的渲染入口 */
  (popupEl: HTMLDivElement): void
}
/**
 * hover popup前渲染器, 让配置hoverPopup者决定如何渲染content,
 * target是配置了popup-key属性导致此次popup的目标元素(也即moseover事件的EventTarget)
 */
interface HoverPopupCallback<T extends Et.EtElement> {
  /**
   * @param targetEl 导致当前popup的效应元素
   * @param contentEl 当前popup的内容容器元素
   * @param items 即当前对象的popupItems
   */
  (ctx: Et.EditorContext, targetEl: T, contentEl: PopupContent, items?: PopupItem<T>[]): TrueOrVoid
}
export interface HoverPopupOptions<T extends Et.EtElement> {
  /**
   * popup content中的item项, 若不希望使用popup内置的tab方式选择下一个item的话, 此项可忽略 \
   * 否则, 若要使用popup内部的按下tab选择下一个item, 则必须提供popupItems; 但需item.el在content的哪个位置, 由提供者决定
   */
  popupItems?: PopupItem<T>[]
  /**
   * show hover popup前执行; 可对popupItems进行过滤 (这是一个数组副本, 直接对该数组增删以实现item过滤) \
   * 如果此hover popup使用的是默认的content, 即addHoverPopup时, 传入的content函数为null时, 会在beforeshow执行之后, 将过滤了的item插入content中 \
   * 若使用默认content, 且过滤后的items为空, 则不会显示popup
   * @returns 该函数不需要返回值; 若返回true, 将终止显示popup
   */
  beforeShow?: HoverPopupCallback<T>
  /**
   * 在hide popup前执行
   */
  beforeHide?: HoverPopupCallback<T>
  /** 设置popup的优先定位位置 */
  prefer?: {
    atTop?: boolean
    alignLeft?: boolean
    alignRight?: boolean
  }
}
