import type { CreateMdastNode, Et, ToMdastResult } from '@effitor/core'
import { cr, EtComponent } from '@effitor/core'
import { CssClassEnum, EtTypeEnum } from '@effitor/shared'

import { CodeContext, type CodeContextOptions } from './CodeContext'
import { CodeHeader } from './CodeHeader'
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
  /**
   * 是否异步渲染, 默认为 false
   */
  async?: boolean
  readonly?: boolean
}

/**
 * 代码块组件, 最后一个子节点为一个textarea
 */
export class EtCodeElement extends EtComponent {
  static override readonly elName: string = CodeEnum.ElName
  static override readonly etType: number = super.etType | CODE_ET_TYPE
  static override readonly inEtType: number = EtTypeEnum.PlainText

  override get contentText() {
    return ''
  }

  override async contentTextAsync(): Promise<string> {
    return ''
  }

  declare codeCtx: CodeContext
  declare codeHeader: CodeHeader

  static override create(): EtCodeElement {
    throw Error('EtCodeElement.create is not implemented')
  }

  /**
   * 创建默认装饰的代码块元素
   * @param ctx 编辑器上下文
   * @param value 代码内容
   * @param lang 代码语言
   * @param async 是否异步渲染高亮
   * @returns 代码块元素
   */
  static withDefaultDecoration(ctx: Et.EditorContext, value = '', lang = '', async = false) {
    const el = document.createElement(CodeEnum.ElName)
    el.codeLang = lang
    el.decorate({
      value,
      lang: el.codeLang,
      tabSize: ctx.pctx.$codePx.defaultTabSize,
      highlighter: ctx.pctx.$codePx.highlighter,
      async,
      readonly: ctx.editor.status.readonly,
    }, (el, cbs) => {
      el.codeHeader = new CodeHeader(ctx, el, cbs)
      el.prepend(el.codeHeader.el)
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

  set codeLang(value: string) {
    this.setAttribute(CodeAttr.Lang, value)
  }

  get codeLang() {
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
    this.codeCtx.mount(this, options.async || false, options.readonly)
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

  override connectedCallback(): void {
    this.classList.add(CssClassEnum.TransitionColorScheme)
  }

  // FIXME 这里不严谨, EtCodeElement 是 Component, 外部不可编辑
  innerStartEditingBoundary(): Et.EtCaret {
    return cr.caretInStart(this)
  }

  innerEndEditingBoundary(): Et.EtCaret {
    return cr.caretInEnd(this)
  }

  focusToInnerEditable(ctx: Et.EditorContext, toStart: boolean) {
    ctx.setSelection(cr.inRaw(this.codeCtx.area, toStart ? 0 : this.codeCtx.area.value.length))
    return null
  }

  override onAfterCopy(_ctx: Et.EditorContext): this | null {
    this.setAttribute(CodeAttr.Code_Value, this.querySelector('textarea')?.value || '')
    this.textContent = ''
    return this
  }

  override onBeforePaste(ctx: Et.EditorContext): this | null {
    const newEl = EtCodeElement.withDefaultDecoration(ctx, this.getAttribute(CodeAttr.Code_Value) || '', this.codeLang)
    newEl.meta = this.meta
    newEl.wrapping = this.wrapping
    return newEl as this
  }

  override toNativeElement(_ctx: Et.EditorContext, prefers: Et.ToNativeHTMLPrefers = 'style'): null | HTMLElement | (() => HTMLElement) {
    if (!this.codeCtx) {
      return null
    }
    if (prefers === 'style') {
      return () => this.codeCtx.clonePre()
    }
    return () => this.codeCtx.cloneWrapper()
  }

  static override readonly fromNativeElementTransformerMap: Et.HtmlToEtElementTransformerMap = {
    div: (el, ctx) => {
      let alias = ctx.pctx.$codePx.parseLangFromNativeElement(el)
      if (!alias) {
        return null
      }
      const pre = el.querySelector('pre')
      if (!pre) {
        return null
      }
      const value = pre.textContent?.trim()
      if (!value) {
        return null
      }
      if (alias === 'template') {
        alias = 'vue'
      }
      const lang = ctx.pctx.$codePx.highlighter.langs[alias] ?? ''
      return () => EtCodeElement.withDefaultDecoration(
        ctx,
        value,
        lang,
        true,
      )
    },
    pre: (el, ctx) => {
      const code = el.querySelector('code')
      if (!code) {
        return null
      }
      const value = code.textContent?.trim()
      if (!value) {
        return null
      }
      let lang = ctx.pctx.$codePx.parseLangFromNativeElement(el)
        || ctx.pctx.$codePx.parseLangFromNativeElement(code)
      lang = lang ? (ctx.pctx.$codePx.highlighter.langs[lang] || '') : ''
      return () => EtCodeElement.withDefaultDecoration(ctx, value, lang, true)
    },
  }

  toMdast(mdastNode: CreateMdastNode): ToMdastResult {
    const meta = this.meta
    return mdastNode({
      type: 'code',
      value: this.codeCtx.code,
      lang: this.codeLang,
      meta: Object.keys(meta).length ? JSON.stringify(meta) : undefined,
    })
  }

  static override readonly fromMarkdownHandlerMap: Et.MdastNodeHandlerMap = {
    code: (node, ctx) => {
      const lang = node.lang ? (ctx.pctx.$codePx.highlighter.langs[node.lang] ?? '') : ''
      const el = EtCodeElement.withDefaultDecoration(ctx, node.value.trim(), lang, true)
      return el
    },
    html: (node, ctx) => {
      if (!ctx.pctx.$codePx.codeRenderer['html']) {
        return null
      }
      const el = EtCodeElement.withDefaultDecoration(ctx, node.value.trim(), 'html', true)
      ctx.pctx.$codePx.renderCodeBlock(ctx, el)
      return el
    },
  }
}
