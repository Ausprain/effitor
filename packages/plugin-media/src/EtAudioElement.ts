import type { CreateMdastNode, EditorContext, HtmlToEtElementTransformerMap, MdastNodeHandlerMap, ToMdastResult } from '@effitor/core'
import { EtEmbedment } from '@effitor/core'
import { HtmlAttrEnum, HtmlCharEnum } from '@effitor/shared'

import type { AudioUrlMetadata, IEtMediaElement } from './config'
import { MEDIA_ET_TYPE, MediaEnum, MediaState, MediaType } from './config'
import { initMediaElementSrc, parseMediaUrl } from './utils'

/**
 * 音频效应元素
 */
export class EtAudioElement extends EtEmbedment implements IEtMediaElement {
  static readonly elName: string = MediaEnum.Audio
  static readonly etType: number = super.etType | MEDIA_ET_TYPE
  static readonly inEtType: number = 0
  mediaType = MediaType.Audio

  get mediaState() {
    return this.getAttribute(MediaEnum.State) as MediaState
  }

  set mediaState(state: MediaState) {
    this.setAttribute(MediaEnum.State, state)
  }

  /**
   * 创建一个音频效应元素
   * @param options [mdn](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/audio)
   */
  static create(url: string | Promise<string> = '', {
    title = '',
    state = MediaState.Center,
    controls = true,
    preload = 'metadata',
    crossorigin = undefined,
  }: {
    title?: string
    state?: MediaState
  } & Pick<AudioUrlMetadata, 'controls' | 'preload' | 'crossorigin'> = {}) {
    const audio = new Audio()
    const meta = {} as AudioUrlMetadata
    if (title) {
      audio.setAttribute(HtmlAttrEnum.HintTitle, meta.title = title)
    }
    if (controls) {
      audio.controls = meta.controls = true
    }
    if (crossorigin) {
      audio.crossOrigin = meta.crossorigin = crossorigin
    }
    if (preload) {
      audio.preload = meta.preload = preload
    }
    initMediaElementSrc(audio, url, meta)

    const el = document.createElement(MediaEnum.Audio)
    el.classList.add(MediaEnum.Media)
    el.setAttribute(MediaEnum.Alt, '$audio')
    el.setAttribute(MediaEnum.State, state)
    el.setAttribute(HtmlAttrEnum.Popup_Key, MediaEnum.Popup_Key)
    el.append(audio)

    audio.onerror = () => {
      el.setAttribute(MediaEnum.State, MediaState.Failed)
      el.textContent = HtmlCharEnum.ZERO_WIDTH_SPACE
    }

    return el
  }

  toNativeElement(_ctx: EditorContext): null | HTMLElement | (() => HTMLElement) {
    const audio = this.firstElementChild
    if (!audio || audio.nodeName !== 'AUDIO') {
      return null
    }
    return audio.cloneNode() as HTMLElement
  }

  static fromNativeElementTransformerMap: HtmlToEtElementTransformerMap = {
    audio: (el) => {
      return EtAudioElement.create(el.src)
    },
  }

  toMdast(mdastNode: CreateMdastNode): ToMdastResult {
    const audio = this.firstElementChild as unknown as HTMLAudioElement
    return mdastNode({
      type: 'image',
      url: audio.src,
      title: audio.getAttribute(HtmlAttrEnum.HintTitle),
    })
  }

  static fromMarkdownHandlerMap: MdastNodeHandlerMap = {
    image: (node, ctx) => {
      const meta = parseMediaUrl(node.url)
      if (!ctx.pctx.$media_ctx.audio?.exts.has(meta.ext)) {
        return null
      }
      return EtAudioElement.create(node.url, {
        title: node.title ?? '',
      })
    },
  }
}
