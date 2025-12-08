import type { CreateMdastNode, HtmlToEtElementTransformerMap, MdastNodeHandlerMap, ToMdastResult } from '@effitor/core'
import { HtmlAttrEnum, HtmlCharEnum } from '@effitor/shared'

import type { VideoUrlMetadata } from './config'
import { MEDIA_ET_TYPE, MediaEnum, MediaState, MediaType } from './config'
import { EtMediaElement } from './EtMediaElement'
import { initMediaElementSrc, parseMediaUrl } from './utils'

/**
 * 视频效应元素
 */
export class EtVideoElement extends EtMediaElement {
  static override readonly elName: string = MediaEnum.Video
  static override readonly etType: number = super.etType | MEDIA_ET_TYPE
  static override readonly inEtType: number = 0
  mediaType = MediaType.Video
  protected override nativeTag?: keyof HTMLElementTagNameMap | undefined = 'video'

  get mediaState() {
    return this.getAttribute(MediaEnum.State) as MediaState
  }

  set mediaState(state: MediaState) {
    this.setAttribute(MediaEnum.State, state)
  }

  /**
   * 创建一个视频效应元素
   * @param options [mdn](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video)
   */
  static override create(url: string | Promise<string> = '', {
    title = '',
    state = MediaState.Center,
    controls = true,
    controlslist = undefined,
    poster = '',
    preload = 'metadata',
    disablepictureinpicture = true,
    crossorigin = undefined,
  }: {
    title?: string
    state?: MediaState
  } & Pick<VideoUrlMetadata, 'controls' | 'controlslist' | 'poster' | 'preload' | 'disablepictureinpicture' | 'crossorigin'> = {}) {
    const video = document.createElement('video')
    const meta = {} as VideoUrlMetadata
    if (controls) {
      video.controls = meta.controls = controls
    }
    if (crossorigin) {
      video.crossOrigin = meta.crossorigin = crossorigin
    }
    if (title) {
      video.setAttribute(HtmlAttrEnum.EtTitle, meta.title = title)
    }
    if (poster) {
      video.poster = meta.poster = poster
    }
    if (controlslist) {
      video.setAttribute('controlslist', meta.controlslist = controlslist)
    }
    if (disablepictureinpicture) {
      video.disablePictureInPicture = meta.disablepictureinpicture = true
    }
    if (preload) {
      video.preload = meta.preload = preload
    }
    initMediaElementSrc(video, url, meta)

    const el = document.createElement(MediaEnum.Video)
    el.classList.add(MediaEnum.Class_Media)
    el.setAttribute(MediaEnum.Alt, '$video')
    el.setAttribute(MediaEnum.State, state)
    el.setAttribute(HtmlAttrEnum.Popup_Key, MediaEnum.Popup_Key)
    el.append(video)

    video.onloadedmetadata = () => {
      // 视频加载后向css提供宽高比
      video.style.setProperty('--et-video_h_w_ratio', `${video.videoHeight / video.videoWidth}`)
    }
    video.onerror = () => {
      el.setAttribute(MediaEnum.State, MediaState.Failed)
      el.textContent = HtmlCharEnum.ZERO_WIDTH_SPACE
    }

    return el
  }

  static override readonly fromNativeElementTransformerMap: HtmlToEtElementTransformerMap = {
    video: (el) => {
      return EtVideoElement.create(el.src)
    },
  }

  toMdast(mdastNode: CreateMdastNode): ToMdastResult {
    const video = this.firstElementChild as unknown as HTMLVideoElement
    return mdastNode({
      type: 'image',
      url: video.src,
      title: video.getAttribute(HtmlAttrEnum.EtTitle),
    })
  }

  static override readonly fromMarkdownHandlerMap: MdastNodeHandlerMap = {
    image: (node, ctx) => {
      const meta = parseMediaUrl(node.url)
      if (!ctx.pctx.$mediaPx.video?.exts.has(meta.ext)) {
        return null
      }
      return EtVideoElement.create(node.url, {
        title: node.title ?? '',
      })
    },
  }
}
