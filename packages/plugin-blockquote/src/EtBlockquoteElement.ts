import type { Et } from '@effitor/core'
import { cr, EtBlockquote } from '@effitor/core'
import { CssClassEnum, HtmlCharEnum } from '@effitor/shared'

import { BlockquoteEnum, BlockquoteMeta, BlockquotePluginContext } from './config'
import { blockquoteMetaParser } from './util'

export class EtBlockquoteElement extends EtBlockquote {
  protected nativeTag?: keyof HTMLElementTagNameMap | undefined = 'blockquote'

  static readonly elName: string = BlockquoteEnum.ElName

  get bqType() {
    return this.dataset.type ?? ''
  }

  set bqType(value: string) {
    this.dataset.type = value
  }

  static create(type = '') {
    const el = new EtBlockquoteElement()
    el.bqType = type
    return el
  }

  connectedCallback(): void {
    this.classList.add(CssClassEnum.TransitionColorScheme)
  }

  focusinCallback(ctx: Et.EditorContext): void {
    super.focusinCallback(ctx)
    if (!ctx.isCaretIn(this)) {
      return
    }
    const firstP = this.firstChild
    if (ctx.isEtParagraph(firstP)) {
      ctx.setCaretToAParagraph(firstP, true, true)
    }
    else {
      const p = ctx.createPlainParagraph()
      ctx.commonHandler.emptyElAndInsert(this, p, cr.caretInAuto(p))
    }
  }

  onAfterCopy(_ctx: Et.EditorContext): this | null {
    if (!this.hasChildNodes()) {
      return null
    }
    return this
  }

  onBeforePaste(_ctx: Et.EditorContext): this | null {
    if (!this.hasChildNodes()) {
      return null
    }
    return this
  }

  static fromNativeElementTransformerMap: Et.HtmlToEtElementTransformerMap = {
    blockquote: () => {
      return EtBlockquoteElement.create()
    },
  }

  toMdast(mdastNode: Et.CreateMdastNode): Et.ToMdastResult {
    if (!this.hasChildNodes()) {
      return null
    }
    const node = mdastNode('blockquote', this.childNodes, {})
    if (this.bqType) {
      const firstP = node.children[0]
      if (firstP.type === 'paragraph' && firstP.children.length === 1 && firstP.children[0].type === 'text') {
        // 给第一个段落文本加上blockquote元信息
        const type = this.bqType.toUpperCase()
        if (type === firstP.children[0].value) {
          firstP.children[0].value = `[!${type}]`
        }
        else {
          firstP.children[0].value = `[!${type}] ` + firstP.children[0].value
        }
      }
      else {
        node.children.unshift(mdastNode({
          type: 'paragraph',
          children: [
            mdastNode({
              type: 'text',
              value: `[!${this.bqType.toUpperCase()}]`,
            }),
          ],
        }))
      }
    }
    return node
  }

  static fromMarkdownHandlerMap: Et.MdastNodeHandlerMap = {
    blockquote: (node, ctx, _, __, manager) => {
      const children = node.children
      if (children.length === 0) {
        return null
      }
      // 检查 blockquote 的首个段落是否用于存储元信息
      const meta = checkBlockquoteMeta(node, ctx.pctx.$bqPx)
      let type
      if (meta) {
        type = meta.type
        if (meta.title) {
          children.unshift(manager.newNode({
            type: 'paragraph',
            children: [
              manager.newNode({
                type: 'text',
                value: meta.title,
              }),
            ],
          }))
        }
      }
      const el = EtBlockquoteElement.create(type)
      if (children.length === 0) {
        // 若没有后代, 则添加一个空段落
        children.push(manager.newNode({
          type: 'paragraph',
          children: [
            manager.newNode({
              type: 'text',
              value: HtmlCharEnum.ZERO_WIDTH_SPACE, // 添加一个零宽字符，避免高度坍缩
            }),
          ],
        }))
      }
      return el
    },
  }
}

const checkBlockquoteMeta = (node: Et.MdastNode<'blockquote'>, bqCtx: BlockquotePluginContext): BlockquoteMeta | null => {
  const firstChild = node.children[0]
  if (firstChild?.type !== 'paragraph') {
    return null
  }
  const textNode = firstChild.children[0] as Et.MdastNode<'text'> | null
  if (textNode?.type !== 'text') {
    return null
  }
  let i = textNode.value.indexOf('\n')
  if (i < 0) {
    i = textNode.value.length
  }
  const metaData = textNode.value.slice(0, i)
  const elseData = textNode.value.slice(i + 1)
  if (!metaData) {
    return null
  }
  const meta = blockquoteMetaParser.fromText(metaData, bqCtx)
  if (!meta) {
    return null
  }
  if (!elseData) {
    if (firstChild.children.length === 1) {
      // 段落无剩余内容, 移除该段落
      node.children.shift()
    }
    else {
      // 移除提取信息后为空的文本节点
      firstChild.children.shift()
      // 如果后一个是换行，继续移除
      if (firstChild.children[0].type === 'break') {
        firstChild.children.shift()
      }
    }
  }
  else {
    // 段落有剩余内容, 移除已提取的元信息
    textNode.value = elseData
  }
  return meta
}
