import type { CreateMdastNode, EditorContext, HtmlToEtElementTransformerMap, MdastNodeHandlerMap, MdastNodeTransformerMap, ToMdastResult } from '@effitor/core'
import { EtEmbedment } from '@effitor/core'
import { HtmlAttrEnum, HtmlCharEnum } from '@effitor/shared'

import type { IEtMediaElement, ImageUrlMetadata } from './config'
import { MEDIA_ET_TYPE, MediaEnum, MediaState, MediaType } from './config'
import { initMediaElementSrc, parseMediaUrl } from './utils'

/**
 * 图片效应元素
 */
export class EtImageElement extends EtEmbedment implements IEtMediaElement {
  static readonly elName: string = MediaEnum.Image
  static readonly etType: number = super.etType | MEDIA_ET_TYPE
  static readonly inEtType: number = 0
  mediaType = MediaType.Image

  get mediaState() {
    return this.getAttribute(MediaEnum.State) as MediaState
  }

  set mediaState(state: MediaState) {
    this.setAttribute(MediaEnum.State, state)
  }

  /**
   * 创建一个图片效应元素
   * @param options [mdn](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img)
   */
  static create(url: string | Promise<string> = '', {
    alt = '',
    title = '',
    state = MediaState.Center,
    loading = 'lazy',
    crossorigin = undefined,
    referrerpolicy = 'no-referrer',
  }: {
    title?: string
    state?: MediaState
  } & Pick<ImageUrlMetadata, 'alt' | 'loading' | 'crossorigin' | 'referrerpolicy'> = {}) {
    const img = new Image()
    const meta = {} as ImageUrlMetadata
    if (alt) {
      img.alt = meta.alt = alt
      alt = '$' + alt
    }
    else {
      alt = `$image`
    }
    if (title) {
      img.setAttribute(HtmlAttrEnum.HintTitle, meta.title = title)
    }
    if (loading) {
      img.loading = meta.loading = loading
    }
    if (crossorigin) {
      img.crossOrigin = meta.crossorigin = crossorigin
    }
    if (referrerpolicy) {
      img.referrerPolicy = meta.referrerpolicy = referrerpolicy
    }
    initMediaElementSrc(img, url, meta)

    const el = document.createElement(MediaEnum.Image)
    el.classList.add(MediaEnum.Media)
    el.setAttribute(MediaEnum.Alt, alt)
    el.setAttribute(MediaEnum.State, state)
    el.setAttribute(HtmlAttrEnum.Popup_Key, MediaEnum.Popup_Key)
    el.append(img)

    img.onerror = () => {
      el.setAttribute(MediaEnum.State, MediaState.Failed)
      el.textContent = HtmlCharEnum.ZERO_WIDTH_SPACE
    }

    return el
  }

  toNativeElement(_ctx: EditorContext): null | HTMLElement | (() => HTMLElement) {
    const img = this.firstElementChild
    if (!img || img.nodeName !== 'IMG') {
      return null
    }
    return img.cloneNode() as HTMLElement
  }

  static fromNativeElementTransformerMap: HtmlToEtElementTransformerMap = {
    img: (el) => {
      return EtImageElement.create(el.src, {
        alt: el.alt,
      })
    },
  }

  toMdast(mdastNode: CreateMdastNode): ToMdastResult {
    const img = this.firstElementChild as unknown as HTMLImageElement
    return mdastNode({
      type: 'image',
      url: img.src,
      alt: img.alt,
      title: img.getAttribute(HtmlAttrEnum.HintTitle),
    })
  }

  static fromMarkdownHandlerMap: MdastNodeHandlerMap = {
    image: (node, ctx) => {
      const meta = parseMediaUrl(node.url)
      if (!ctx.pctx.$media_ctx.image.exts.has(meta.ext)) {
        return null
      }
      return EtImageElement.create(node.url, {
        alt: node.alt ?? '',
        title: node.title ?? '',
      })
    },
  }

  // TODO url处理, 需要判断媒体类型
  static toMarkdownTransformerMap: MdastNodeTransformerMap = {
    image: (node, ctx) => {
      node.url = ctx.pctx.$media_ctx.image.urlMapping?.toMarkdown?.(node.url) ?? node.url
    },
  }
}
