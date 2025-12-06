import { dom, type Et } from '@effitor/core'
import { clearFormatIcon, copyDocIcon, CssClassEnum, HtmlAttrEnum, markdownIcon } from '@effitor/shared'

import { type ChoseItemCallback, PopupEnum, type PopupItem, type PopupItemFilter } from './config'

export const createPopupItem = <T extends Et.EtElement>(
  icon: SVGElement,
  tip: string,
  onchosen: ChoseItemCallback<T>,
  filter?: PopupItemFilter,
): PopupItem<T> => {
  const span = dom.el('span', `${CssClassEnum.BgItem} ${PopupEnum.Class_Popup_Item}`)
  span.setAttribute(HtmlAttrEnum.HintTitle, tip)
  span.appendChild(icon)
  return {
    el: span,
    tip,
    onchosen,
    filter,
  }
}
export const initClickForItem = <T extends Et.EtElement>(ctx: Et.EditorContext, item: PopupItem<T>) => {
  item.el.onmouseup = (ev: MouseEvent) => {
    if (!ctx.assists.popup.srcElement) {
      return ctx.assists.popup.hide()
    }
    item.onchosen(ctx, item.el, ctx.assists.popup.srcElement as T)
    ctx.assists.popup.hide()
    ev.preventDefault()
    ev.stopPropagation()
  }
  return item
}

export const clearFormatItem = createPopupItem(
  clearFormatIcon(),
  '清除格式',
  (_ctx) => {
    // TODO ctx.builtinHandler
    console.warn('clearFormat')
  },
  {
    /** 仅当匹配任意非文本节点时, 可清除格式 */
    matchEtType: -1,
  },
)
export const copyItem = createPopupItem(
  copyDocIcon(),
  '复制',
  (_ctx) => {
    // TODO ctx.builtinHandler
    console.warn('copy')
  },
)
export const copyAsMarkdownItem = createPopupItem(
  markdownIcon(),
  '复制为Markdown',
  (_ctx) => {
    // TODO ctx.builtinHandler
    console.warn('copyAsMarkdown')
  },
)
