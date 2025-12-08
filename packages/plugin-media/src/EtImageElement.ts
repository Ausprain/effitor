import type { CreateMdastNode, HtmlToEtElementTransformerMap, MdastNodeHandlerMap, MdastNodeTransformerMap, ToMdastResult } from '@effitor/core'
import { HtmlAttrEnum, HtmlCharEnum } from '@effitor/shared'

import type { ImageUrlMetadata } from './config'
import { MEDIA_ET_TYPE, MediaEnum, MediaState, MediaType } from './config'
import { EtMediaElement } from './EtMediaElement'
import { initMediaElementSrc, parseMediaUrl } from './utils'

/**
 * 图片效应元素
 */
export class EtImageElement extends EtMediaElement {
  static override readonly elName: string = MediaEnum.Image
  static override readonly etType: number = super.etType | MEDIA_ET_TYPE
  static override readonly inEtType: number = 0
  mediaType = MediaType.Image
  protected override nativeTag?: keyof HTMLElementTagNameMap | undefined = 'img'

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
  static override create(url: string | Promise<string> = '', {
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
      img.setAttribute(HtmlAttrEnum.EtTitle, meta.title = title)
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
    el.classList.add(MediaEnum.Class_Media)
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

  static override readonly fromNativeElementTransformerMap: HtmlToEtElementTransformerMap = {
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
      title: img.getAttribute(HtmlAttrEnum.EtTitle),
    })
  }

  static override readonly fromMarkdownHandlerMap: MdastNodeHandlerMap = {
    image: (node, ctx) => {
      const meta = parseMediaUrl(node.url)
      if (!ctx.pctx.$mediaPx.image.exts.has(meta.ext)) {
        return null
      }
      return EtImageElement.create(node.url, {
        alt: node.alt ?? '',
        title: node.title ?? '',
      })
    },
  }

  // TODO url处理, 需要判断媒体类型
  static override readonly toMarkdownTransformerMap: MdastNodeTransformerMap = {
    image: (node, ctx) => {
      node.url = ctx.pctx.$mediaPx.image.urlMapping?.toMarkdown?.(node.url) ?? node.url
    },
  }
}
