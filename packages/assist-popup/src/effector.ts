import type { Et } from '@effitor/core'
import { HtmlAttrEnum } from '@effitor/shared'

import { initPopup, type PopupAssistOptions } from './popup'

export const getPopupEffector = (options?: PopupAssistOptions): Et.EffectorSupportInline => {
  return {
    inline: true,

    beforeKeydownSolver: {
      default: (_, ctx) => {
        if (ctx.assists.popup.isShowing) {
          ctx.assists.popup.hide()
        }
      },
      Tab: (_, ctx) => {
        if (!ctx.assists.popup.isShowing) {
          return
        }
        ctx.assists.popup.selectNextItem()
        return true
      },
      Enter: (_, ctx) => {
        if (!ctx.assists.popup.isShowing) {
          return
        }
        ctx.assists.popup.choseItem(true)
        return true
      },
    },
    keyupSolver: {
      ArrowUp: (_, ctx) => {
        if (ctx.composition.inSession || ctx.selection.isCollapsed) {
          return
        }
        ctx.assists.popup.showSelectionRangePopup()
      },
      ArrowDown: (_, ctx) => {
        if (ctx.composition.inSession || ctx.selection.isCollapsed) {
          return
        }
        ctx.assists.popup.showSelectionRangePopup()
      },
      ArrowLeft: (_, ctx) => {
        if (ctx.composition.inSession || ctx.selection.isCollapsed) {
          return
        }
        ctx.assists.popup.showSelectionRangePopup()
      },
      ArrowRight: (_, ctx) => {
        if (ctx.composition.inSession || ctx.selection.isCollapsed) {
          return
        }
        ctx.assists.popup.showSelectionRangePopup()
      },
    },
    htmlEventSolver: {
      mousedown: (_, ctx) => {
        if (ctx.assists.popup.isShowing) {
          ctx.assists.popup.hide()
        }
      },
      // TODO 鼠标划选 popup
      // mouseup: (_, ctx) => {
      //   setTimeout(() => {
      //     if (ctx.selection.isCollapsed) {
      //       return
      //     }
      //     const selectedText = ctx.selection.selectedTextContent
      //     if (!selectedText || selectedText.replaceAll(HtmlCharEnum.ZERO_WIDTH_SPACE, '') === '') {
      //       return
      //     }
      //     ctx.assists.popup.showSelectionRangePopup()
      //   }, 10)
      // },
      mouseover: (ev, ctx) => {
        // 有任意鼠标按键按下, 禁止popup
        if (ev.buttons !== 0) {
          return
        }
        if (ctx.assists.popup.isShowing) {
          return
        }
        // 查找最近的效应父元素, 判断是否有popupKey属性
        const etel = ctx.body.findInclusiveEtParent(ev.target as Et.Node)
        if (!etel) {
          return
        }
        else if (etel.hasAttribute(HtmlAttrEnum.Popup_Key)) {
          const key = etel.getAttribute(HtmlAttrEnum.Popup_Key) as string
          ctx.assists.popup?.showHoverPopup(key, etel)
        }
      },
      mouseout: (ev, ctx) => {
        // 查找最近的效应父元素, 判断是否有popupKey属性
        const etel = ctx.body.findInclusiveEtParent(ev.target as Et.Node)
        if (!etel) {
          return
        }
        if (ctx.assists.popup.isShowing && etel.hasAttribute(HtmlAttrEnum.Popup_Key)) {
          ctx.assists.popup.delayHide()
        }
      },
    },

    onMounted(ctx, signal) {
      initPopup(ctx, signal, options)
    },
  }
}
