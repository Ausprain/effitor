import type { Et } from '@effitor/core'
import { cr, CreateMdastNode, EtComponent, ToMdastResult } from '@effitor/core'
import { EtTypeEnum } from '@effitor/shared'

import { CodeContext, type CodeContextOptions } from './CodeContext'
import { codeHeader } from './CodeHeader'
import { CODE_ET_TYPE, CodeAttr, CodeEnum } from './config'

// TODO
export interface CodeMeta {
  highlight?: {
    adds?: number[]
    removes?: number[]
  }
}

export interface CodeDecorateCallbacks {
  onCopy: (ctx: Et.EditorContext) => Promise<void>
  onLangChange: (lang: string) => void
  onTabSizeChange: (tabSize: number) => void
  onWrappingChange: (wrapping: boolean) => void
}

export interface CodeDecorateOptions<L extends string> extends CodeContextOptions<L> {
  wrapping?: boolean
}

/**
 * 代码块组件, 最后一个子节点为一个textarea
 */
export class EtCodeElement extends EtComponent {
  static readonly elName = CodeEnum.ElName
  static readonly etType = super.etType | CODE_ET_TYPE
  static readonly inEtType = EtTypeEnum.PlainText

  declare codeCtx: CodeContext

  static create(): EtCodeElement {
    throw Error('EtCodeElement.create is not implemented')
  }

  static withDefaultDecoration(ctx: Et.EditorContext, value = '', lang = '') {
    const el = document.createElement(CodeEnum.ElName)
    el.lang = lang
    el.decorate({
      value,
      lang: el.lang,
      tabSize: ctx.pctx.$code_ctx.defaultTabSize,
      highlighter: ctx.pctx.$code_ctx.highlighter,
    }, (el, cbs) => {
      el.prepend(codeHeader(ctx, el, cbs))
    })
    return el
  }

  set wrapping(value: boolean) {
    if (value) {
      this.classList.add(CodeEnum.Class_CodeWrap)
    }
    else {
      this.classList.remove(CodeEnum.Class_CodeWrap)
    }
  }

  get wrapping() {
    return this.classList.contains(CodeEnum.Class_CodeWrap)
  }

  set lang(value: string) {
    this.setAttribute(CodeAttr.Lang, value)
  }

  get lang() {
    return this.getAttribute(CodeAttr.Lang) || ''
  }

  set meta(value: string | CodeMeta) {
    this.setAttribute(CodeAttr.Meta, typeof value === 'string' ? value : JSON.stringify(value))
  }

  get meta(): CodeMeta {
    try {
      return JSON.parse(this.getAttribute(CodeAttr.Meta) || '{}') as CodeMeta
    }
    catch (_) {
      return {}
    }
  }

  onAfterCopy(_ctx: Et.EditorContext): this | null {
    this.setAttribute(CodeAttr.Code_Value, this.querySelector('textarea')?.value || '')
    this.textContent = ''
    return this
  }

  onBeforePaste(ctx: Et.EditorContext): this | null {
    const newEl = EtCodeElement.withDefaultDecoration(ctx, this.getAttribute(CodeAttr.Code_Value) || '', this.lang)
    newEl.meta = this.meta
    newEl.wrapping = this.wrapping
    return newEl as this
  }

  /**
   * 装饰代码块并初始化代码块上下文
   * * 新元素使用 el.prepend 方法添加; 代码块结构如下
   * ```
   * <et-code>
   *    // 其他装饰元素
   *    // 以下是代码块内置元素
   *    <div.et-code__wrapper>
   *      <pre>
   *        <span class="et-code__line">xxx</span>
   *        <span class="et-code__line">yyy</span>
   *      </pre>
   *      <textarea></textarea>
   *    </div>
   * </et-code>
   * ```
   * @param options 装饰选项
   * @param fn 装饰回调
   */
  decorate<L extends string>(
    options: CodeDecorateOptions<L>,
    fn?: (el: EtCodeElement, cbs: CodeDecorateCallbacks) => void,
  ) {
    this.wrapping = !!options.wrapping
    this.codeCtx = new CodeContext(options)
    this.codeCtx.mount(this)
    fn?.(this, {
      onCopy: async (ctx: Et.EditorContext) => {
        await this.codeCtx.copy(ctx)
      },
      onLangChange: (lang) => {
        this.codeCtx.setLang(lang)
      },
      onTabSizeChange: (tabSize) => {
        this.codeCtx.setTabSize(tabSize)
      },
      onWrappingChange: (wrapping) => {
        this.wrapping = wrapping
      },
    })
  }

  // FIXME 这里不严谨, EtCodeElement 是 Component, 外部不可编辑
  innerStartEditingBoundary(): Et.EtCaret {
    return cr.caretInStart(this)
  }

  innerEndEditingBoundary(): Et.EtCaret {
    return cr.caretInEnd(this)
  }

  focusToInnerEditable(ctx: Et.EditorContext, toStart: boolean) {
    this.codeCtx.focus(toStart)
    ctx.forceUpdate()
    return null
  }

  toMdast(mdastNode: CreateMdastNode): ToMdastResult {
    const meta = this.meta
    return mdastNode({
      type: 'code',
      value: this.codeCtx.code,
      lang: this.lang,
      meta: Object.keys(meta).length ? JSON.stringify(meta) : undefined,
    })
  }

  static fromMarkdownHandlerMap: Et.MdastNodeHandlerMap = {
    code: (node, ctx) => {
      const el = EtCodeElement.withDefaultDecoration(ctx, node.value, node.lang ?? 'js')
      return el
    },
    html: (node, ctx) => {
      if (!ctx.pctx.$code_ctx.canRenderHTML) {
        return null
      }
      const el = EtCodeElement.withDefaultDecoration(ctx, node.value, 'html')
      ctx.pctx.$code_ctx.renderHtmlCodeBlock?.(ctx, el)
      return el
    },
  }
}
