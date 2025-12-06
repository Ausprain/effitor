import { Effitor } from '@effitor/core'

// import { useCodeAreaPlugin } from './src/ca'
import { useCodePlugin } from './src/index'

const editor = new Effitor({
  plugins: [
    await useCodePlugin({
      shikiOptions: {
        langs: [
          import('@shikijs/langs/jsx'),
          import('@shikijs/langs/sql'),
        ],
        alias: {
          jsx: 'jsx',
          sql: 'sql',
        },
      },
    }),
    // useCodeAreaPlugin(),
  ],
  callbacks: {
    firstInsertedParagraph: (ctx) => {
      const p = ctx.createPlainParagraph()
      p.append('aaa', document.createElement('textarea'), 'bbb')
      return [p]
    },
  },
})

const host = document.getElementById('effitor-host') as HTMLDivElement
editor.mount(host)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.ctx = editor.context

editor.fromMarkdown(`
# Md
\`\`\`js
import type { Et } from '@effitor/core'
import { cr, CreateMdastNode, EtComponent, ToMdastResult } from '@effitor/core'
import { EtTypeEnum } from '@effitor/shared'

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
}

/**
 * 代码块组件, 最后一个子节点为一个textarea
 */
export class EtCodeElement extends EtComponent {
  static readonly elName = CodeEnum.ElName
  static override readonly etType: number = super.etType | CODE_ET_TYPE
  static override readonly inEtType: number = EtTypeEnum.PlainText

  // eslint-disable-next-line @typescript-eslint/class-literal-property-style
  get contentText() {
    return ''
  }

  async contentTextAsync(): Promise<string> {
    return ''
  }

  declare codeCtx: CodeContext
  declare codeHeader: CodeHeader

  static override create(): EtCodeElement {
    throw Error('EtCodeElement.create is not implemented')
  }

  static withDefaultDecoration(ctx: Et.EditorContext, value = '', lang = '', async = false) {
    const el = document.createElement(CodeEnum.ElName)
    el.lang = lang
    el.decorate({
      value,
      lang: el.lang,
      tabSize: ctx.pctx.$codePx.defaultTabSize,
      highlighter: ctx.pctx.$codePx.highlighter,
      async,
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

  decorate<L extends string>(
    options: CodeDecorateOptions<L>,
    fn?: (el: EtCodeElement, cbs: CodeDecorateCallbacks) => void,
  ) {
    this.wrapping = !!options.wrapping
    this.codeCtx = new CodeContext(options)
    this.codeCtx.mount(this, options.async || false)
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

  static fromNativeElementTransformerMap: Et.HtmlToEtElementTransformerMap = {
    div: (el, ctx) => {
      let lang = ctx.pctx.$codePx.parseLangFromNativeElement(el)
      if (!lang) {
        return null
      }
      const pre = el.querySelector('pre')
      if (!pre) {
        return null
      }
      const value = pre.textContent
      if (!value) {
        return null
      }
      if (lang === 'template') {
        lang = 'html'
      }
      return () => EtCodeElement.withDefaultDecoration(
        ctx,
        value,
        ctx.pctx.$codePx.highlighter.langs.includes(lang) ? lang : '',
        true,
      )
    },
    pre: (el, ctx) => {
      const code = el.querySelector('code')
      if (!code) {
        return null
      }
      const value = code.textContent
      if (!value) {
        return null
      }
      let lang = ctx.pctx.$codePx.parseLangFromNativeElement(el)
      if (!lang) {
        lang = ctx.pctx.$codePx.parseLangFromNativeElement(code)
      }
      lang = lang && ctx.pctx.$codePx.highlighter.langs.includes(lang) ? lang : ''
      return () => EtCodeElement.withDefaultDecoration(ctx, value, lang, true)
    },
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
      const el = EtCodeElement.withDefaultDecoration(ctx, node.value, node.lang ?? '', true)
      return el
    },
    html: (node, ctx) => {
      if (!ctx.pctx.$codePx.codeRenderer['html']) {
        return null
      }
      const el = EtCodeElement.withDefaultDecoration(ctx, node.value, 'html', true)
      ctx.pctx.$codePx.renderCodeBlock(ctx, el)
      return el
    },
  }
}

\`\`\`
`)
