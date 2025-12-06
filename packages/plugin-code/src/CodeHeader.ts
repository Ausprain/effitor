import { dom, type Et } from '@effitor/core'
import { CssClassEnum, HtmlAttrEnum } from '@effitor/shared'

import { CodeEnum } from './config'
import type { CodeDecorateCallbacks, EtCodeElement } from './EtCodeElement'

export class CodeHeader {
  public readonly el: HTMLDivElement
  private readonly _btnGroup: HTMLDivElement
  constructor(ctx: Et.EditorContext, el: EtCodeElement, cbs: CodeDecorateCallbacks) {
    this.el = dom.el('div', CodeEnum.Class_Header)
    this._btnGroup = dom.el('div', CodeEnum.Class_Btn_Group)
    this.el.appendChild(this._btnGroup)

    this._btnGroup.onclick = (ev) => {
      ev.stopPropagation()
      ev.preventDefault()
    }

    this.addBtn((copyBtn) => {
      copyBtn.classList.add(CodeEnum.Class_Btn_Copy)
      copyBtn.setAttribute(HtmlAttrEnum.HintTitle, 'Copy Code')
      copyBtn.onclick = () => {
        if (copyBtn.classList.contains(CodeEnum.Class_Btn_Copied)) {
          return
        }
        cbs.onCopy(ctx)
        copyBtn.classList.add(CodeEnum.Class_Btn_Copied)
        setTimeout(() => {
          copyBtn.classList.remove(CodeEnum.Class_Btn_Copied)
        }, 2000)
      }
    })
    this.addBtn((btn) => {
      btn.classList.add(CodeEnum.Class_Btn_CodeWrap)
      btn.setAttribute(HtmlAttrEnum.HintTitle, 'Toggle Code Wrap')
      btn.onclick = (ev) => {
        let node = ev.target as HTMLElement | null
        while (node) {
          if (node.localName === CodeEnum.ElName) {
            node.classList.toggle(CodeEnum.Class_CodeWrap)
            return
          }
          node = node.parentElement
        }
        return
      }
    })

    if (ctx.pctx.$codePx.codeRenderer[el.codeLang]) {
      this.addBtn((renderBtn) => {
        renderBtn.classList.add(CodeEnum.Class_Btn_Render)
        renderBtn.setAttribute(HtmlAttrEnum.HintTitle, `Render ${el.codeLang.toUpperCase()}`)
        renderBtn.onclick = () => {
          const render = ctx.pctx.$codePx.renderCodeBlock
          if (!render) {
            return
          }
          render(ctx, el)
        }
      })
    }
  }

  /**
   * 代码块右上角添加一个按钮
   * @param fn 按钮装饰回调, 参数是一个 btn 元素, 拥有一个className, CssClassEnum.BgItem.
   *           按钮点击事件通过此回调添加, 否则无响应
   * @param index 按钮位置, 最右边为 0; 默认添加到最左位置
   */
  addBtn(fn: (btn: HTMLButtonElement) => void, index?: number) {
    const btn = dom.el('button', CssClassEnum.BgItem)
    fn(btn)
    if (index === void 0) {
      this._btnGroup.prepend(btn)
      return
    }
    this._btnGroup.insertBefore(btn, this._btnGroup.childNodes.item(
      this._btnGroup.childNodes.length - index,
    ))
  }
}
