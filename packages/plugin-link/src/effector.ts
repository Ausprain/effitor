import type { DialogManager } from '@effitor/assist-dialog'
import type { Dropdown } from '@effitor/assist-dropdown'
import type { Popup } from '@effitor/assist-popup'
import { dom, type Et } from '@effitor/core'
import { copyIcon, CssClassEnum, gotoIcon, linkIcon, MIMETypeEnum } from '@effitor/shared'

import { LinkEnum } from './config'
import type { EtLinkElement } from './EtLinkElement'
import { checkInsertLink } from './handler'

export const linkEffector: Et.Effector = {
  afterInputSolver: {
    insertText: (ev, ctx) => {
      if (!ev.data || ev.data.length > 1
        || (ev.data.charCodeAt(0) !== 41 /** ) */ && ev.data.charCodeAt(0) !== 65289 /** ） */)) {
        return
      }
      const tc = ctx.selection.getTargetCaret()
      if (!tc || !tc.isAtText()) {
        return
      }
      if (ctx.effectInvoker.invoke(ctx.focusEtElement, 'markLink', ctx, tc)) {
        return ctx.preventAndSkipDefault(ev)
      }
    },
  },
  pasteCallback: (ev, ctx) => {
    if (!ctx.selection.isCollapsed) {
      return
    }
    const html = ev.clipboardData.getData(MIMETypeEnum.TEXT_HTML)
    if (!html) {
      return
    }
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const a = doc.body.firstElementChild as HTMLAnchorElement | null
    if (a?.localName !== 'a') {
      return
    }
    const url = a.href, title = a.title ?? ''
    if (!url) {
      return
    }
    ctx.body.dispatchInputEvent('beforeinput', {
      data: JSON.stringify({ url, title, text: a.textContent }),
      inputType: 'insertLink',
    })
    return ctx.preventAndSkipDefault(ev)
  },
  onMounted(ctx) {
    // 注册actions
    ctx.actions.link = linkActions
    const { popup, dropdown } = ctx.assists
    if (popup) {
      initLinkPopup(popup)
    }
    if (dropdown) {
      addLinkItemToDropdown(dropdown)
    }
  },
}

/* -------------------------------------------------------------------------- */
/*                                    popup                                   */
/* -------------------------------------------------------------------------- */
const initLinkPopup = (popup: Popup) => {
  const popupItems = [
    popup.createPopupItem<EtLinkElement>(gotoIcon(), 'Open Link', (_ctx, _self, target) => {
      _ctx.assists.logger?.logInfo('Open Link', target.linkUrl)
      target.openUrl()
    }),
    popup.createPopupItem<EtLinkElement>(copyIcon(), 'Copy Link', (_ctx, _self, target) => {
      _ctx.assists.logger?.logInfo('Copy Link', target.linkUrl)
      navigator.clipboard.writeText(target.linkUrl)
    }),
  ]
  popup.addHoverPopup<EtLinkElement>(LinkEnum.Popup_Key, () => {
    const div = dom.el('div', LinkEnum.Class_Popup, CssClassEnum.Card)
    const urlInput = dom.pureEditableDiv(true)
    urlInput.tabIndex = 0
    urlInput.className = LinkEnum.Class_Popup_Input
    urlInput.onclick = () => {
      setTimeout(() => {
        urlInput.focus()
      }, 10)
    }
    const itemContainer = dom.el('div', LinkEnum.Class_Popup_Items)
    itemContainer.classList.add(LinkEnum.Class_Popup_Items)
    itemContainer.style = `display:flex; flex-direction:column; justify-content:start; align-items:center;`
    for (const item of popupItems) {
      item.el.style = `margin-inline:3px;`
      itemContainer.appendChild(item.el)
    }
    div.append(urlInput, itemContainer)
    return div
  }, {
    popupItems,
    prefer: {
      // popup优先展示在链接下方
      atTop: false,
    },
    beforeShow: (_ctx, linkEl, contentEl, _items) => {
      const inputDiv = contentEl.firstElementChild as HTMLDivElement
      inputDiv.textContent = linkEl.linkUrl
      inputDiv.setAttribute('title', linkEl.linkTitle)
      inputDiv.onmousedown = e => (e.stopPropagation(), _ctx.editor.blur())
    },
    beforeHide: (_ctx, linkEl, content) => {
      const inputDiv = content.firstElementChild as HTMLDivElement
      // 关闭popup时, 若链接不同, 则更新
      const newUrl = inputDiv.textContent?.replaceAll(/\s/g, '') ?? ''
      const linkCtx = _ctx.pctx.$linkPx
      if (linkEl.linkUrl !== newUrl) {
        if (!linkCtx.urlReg.test(newUrl)) {
          _ctx.assists.msg?.error('Link format is invalid.')
          return
        }
        _ctx.commandManager.pushByName('Functional', {
          meta: {
            el: linkEl,
            newUrl,
            oldUrl: linkEl.linkUrl,
          },
          execCallback(_ctx) {
            this.meta.el.linkUrl = this.meta.newUrl
          },
          undoCallback(ctx) {
            this.meta.el.linkUrl = this.meta.oldUrl
            // 强制编辑器失去焦点
            ctx.editor.blur()
          },
          destCaretRange: null,
        }).handle()
      }
    },
  })
}
/* -------------------------------------------------------------------------- */
/*                                  dropdown                                  */
/* -------------------------------------------------------------------------- */
const addLinkItemToDropdown = (dropdown: Dropdown) => {
  dropdown.addInlineRichTextMenuItem(dropdown.createMenuItem(
    linkIcon(),
    openDialogToInsertLink,
    {
      prefixes: ['link'],
    },
  ))
}

export const openDialogToInsertLink = (ctx: Et.EditorContext) => {
  const dialog = ctx.assists.dialog as DialogManager
  if (!dialog) {
    return
  }
  dialog.open<{ name: string, url: string } | undefined>(async (el, close) => {
    // 需要强制编辑器失去焦点, 否则无法让内部输入框获取到焦点
    ctx.editor.blur()
    initLinkDialog(ctx, el, close)
  }).then((res) => {
    ctx.editor.focus()
    const tc = ctx.selection.getTargetCaret()
    if (!tc) {
      return
    }
    if (res) {
      const { name, url } = res
      if (!name || !url) {
        ctx.assists.msg?.error('Link url is invalid.')
        return
      }
      return checkInsertLink(ctx, tc, { text: name, url, title: '' })
    }
    else {
      ctx.assists.msg?.info('Cancel insert link.')
    }
  }).catch(() => { /** catch reject */ })
}

/* -------------------------------------------------------------------------- */
/*                                   dialog                                   */
/* -------------------------------------------------------------------------- */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let linkDialog: HTMLDivElement | null = null, delayClose: (...args: any[]) => void
const initLinkDialog = (
  ctx: Et.EditorContext, el: HTMLDivElement, close: (link?: { name: string, url: string }) => void,
) => {
  delayClose = (...args: Parameters<typeof close>) => {
    setTimeout(() => {
      close(...args)
    }, 0)
  }
  const linkCtx = ctx.pctx.$linkPx
  if (linkDialog) {
    el.appendChild(linkDialog)
    // 延迟 focus, 否则无法获取到焦点
    setTimeout(() => {
      (linkDialog?.firstElementChild?.firstElementChild as HTMLInputElement)?.focus()
    }, 10)
    return
  }
  linkDialog = document.createElement('div')
  const linkForm = dom.el('form', void 0, `position: absolute; display: flex; flex-direction: column; height: 100%; width: 100%;`)
  const linkNameInput = dom.el('input', LinkEnum.Class_Dialog_Input)
  const linkUrlInput = dom.el('input', LinkEnum.Class_Dialog_Input)
  linkNameInput.placeholder = `Display text (max ${linkCtx.maxNameLength} chars)`
  linkUrlInput.placeholder = `Link URL (max ${linkCtx.maxUrlLength} chars)`

  const btnCls = LinkEnum.Class_Dialog_Btn + ' ' + CssClassEnum.BgItem
  const cancelBtn = dom.el('button', btnCls, 'margin-right: 6em;')
  const confirmBtn = dom.el('button', btnCls, 'margin-right: 1.5em;')
  cancelBtn.type = 'button'
  confirmBtn.type = 'submit'
  cancelBtn.textContent = 'Cancel'
  confirmBtn.textContent = 'Confirm'
  linkForm.append(linkNameInput, linkUrlInput, cancelBtn, confirmBtn)
  linkDialog.appendChild(linkForm)

  linkForm.onsubmit = (e) => {
    e.stopPropagation()
    e.preventDefault()
    // submit 会触发 button[submit]的点击事件
  }
  confirmBtn.onclick = () => {
    delayClose({
      name: linkNameInput.value,
      url: linkUrlInput.value,
    })
    linkNameInput.value = ''
    linkUrlInput.value = ''
  }
  cancelBtn.onclick = () => {
    linkNameInput.value = ''
    linkUrlInput.value = ''
    delayClose()
  }
  el.appendChild(linkDialog)
  setTimeout(() => {
    linkNameInput.focus()
  }, 10)
}

export const linkActions = {
  openDialogToInsertLink,
}
export type LinkActionMap = typeof linkActions
