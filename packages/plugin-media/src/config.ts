import type { PopupItem } from '@effitor/assist-popup'
import type { Et } from '@effitor/core'
import { etcode } from '@effitor/core'
import type { TrueOrVoid } from '@effitor/shared'

import type { MediaActionMap } from './effector'
import type { EtAudioElement } from './EtAudioElement'
import type { EtImageElement } from './EtImageElement'
import type { EtVideoElement } from './EtVideoElement'

declare module '@effitor/core' {
  interface DefinedEtElementMap {
    [MediaEnum.Image]: EtImageElement
    [MediaEnum.Audio]: EtAudioElement
    [MediaEnum.Video]: EtVideoElement
  }
  interface EditorSchema {
    [MediaType.Image]: typeof EtImageElement
    [MediaType.Audio]: typeof EtAudioElement
    [MediaType.Video]: typeof EtVideoElement
  }
  interface EditorActions {
    /** media plugin actions */
    media: MediaActionMap
  }
  interface EditorPluginContext {
    /** 用于mediaPlugin的上下文 */
    $mediaPx: Readonly<MediaPluginContext>
  }
  interface EffectHandleDeclaration {
    /** 当前光标所在文本节点内容符合markdown图片语法时, 将文本转为media元素 */
    markMedia: Et.EffectHandle<Et.ValidTargetCaretAtText>
    /** 插入媒体元素: 图片/音/视频 */
    insertMedia: <T extends `${MediaType}`>(this: Et.EffectHandleThis, ctx: Et.EditorContext, payload: {
      targetCaret: Et.ValidTargetCaret
      type: T
      url: string
      meta: Omit<CreateMediaOptionsMap[T], 'url'>
    }) => TrueOrVoid
    /** 插入多个媒体元素: 图片/音/视频, 但一次只能插入同一个类型 */
    insertMediaChunk: <T extends `${MediaType}`>(this: Et.EffectHandleThis, ctx: Et.EditorContext, payload: {
      targetCaret: Et.ValidTargetCaret
      type: T
      chunk: CreateMediaOptionsMap[T][]
    }) => TrueOrVoid
  }
}

export interface MediaPluginContext {
  MEDIA_ET_TYPE: number
  // 将popup暴露出去, 以供编辑器开发者自定义增删popup item
  popupOptions?: {
    /**
     * hover媒体元素将显示 popup, 显示前调用该函数, 可对popup的items进行过滤 \
     * 也可用 ctx.assists.popup.createPopupItem 创建新item并插入items实现新增功能 \
     * 也可从items移除元素 以去除某些功能; items列表如下:
     * ```
     * image/video:
     *      展开, 左浮动, 右浮动, 居中, 删除
     * audio:
     *      左浮动, 右浮动, 居中, 删除
     * ```
     * 可通过`targetEl.mediaType`判断媒体类型`(image | audio | video)`; \
     * 以及`targetEl.mediaState`判断媒体状态`(expanded | center | float-left | float-right)`
     */
    beforeShow: (
      ctx: Et.EditorContext, targetEl: IEtMediaElement,
      contentEl: HTMLElement, items: PopupItem<IEtMediaElement>[],
    ) => TrueOrVoid
  }
  image: Omit<ImageOptions, 'exts'> & { type: MediaType.Image, exts: Set<string>, maxSize: number }
  audio?: Omit<AudioOptions, 'exts'> & { type: MediaType.Audio, exts: Set<string>, maxSize: number }
  video?: Omit<VideoOptions, 'exts'> & { type: MediaType.Video, exts: Set<string>, maxSize: number }
}

type CreateMediaOptions<T extends MediaUrlMetadata> = Omit<T, 'type'> & {
  /**
   * 媒体资源url, 即媒体元素的 src 属性值, 可以是 base64, 当需要长时间处理时,
   * 应返回一个 Promise 编辑器会先插入一个占位元素, 待 Promise  resolve 后, 再替换为最终url
   */
  url: string | Promise<string>
}
export type CreateImageOptions = CreateMediaOptions<ImageUrlMetadata>
export type CreateAudioOptions = CreateMediaOptions<AudioUrlMetadata>
export type CreateVideoOptions = CreateMediaOptions<VideoUrlMetadata>
export interface CreateMediaOptionsMap {
  image: CreateImageOptions
  audio: CreateAudioOptions
  video: CreateVideoOptions
}
export interface MediaUrlMetadata {
  type: MediaType
  title?: string
  crossorigin?: 'anonymous' | 'use-credentials'
}
export interface ImageUrlMetadata extends MediaUrlMetadata {
  type: MediaType.Image
  alt?: string
  loading?: 'lazy' | 'eager'
  referrerpolicy?: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url'
}
export interface AudioUrlMetadata extends MediaUrlMetadata {
  type: MediaType.Audio
  controls?: boolean
  preload?: 'none' | 'metadata' | 'auto'
}
export interface VideoUrlMetadata extends MediaUrlMetadata {
  type: MediaType.Video
  controls?: boolean
  controlslist?: 'nodownload' | 'nofullscreen' | 'noremoteplayback'
  poster?: string
  preload?: 'none' | 'metadata' | 'auto'
  disablepictureinpicture?: boolean
}
interface IMediaOptions {
  /** 与markdown互转时 对相应的url进行转换; 默认保持原值 */
  urlMapping?: Et.MdUrlMapping
  /**
   * 支持的媒体后缀名(不含`.`), 默认支持
   * ```
   * 图片: jpg, jpeg, png, gif, svg, webp, avif
   * 音频: mp3, wav, aac
   * 视频: mp4, webm
   * ```
   * 声明此项会覆盖默认值, 若要保留默认值, 需包含在内
   */
  exts?: string[]
  /** 最大文件大小, 单位字节, 默认10MB */
  maxSize?: number
  /**
   * 用户打开文件选择窗口, 并确认选择时, 或者用户粘贴符合 exts 配置的符合 MIMEType 的后缀名文件时,
   * 触发该回调; 若没有配置此项, 则选择或粘贴的文件不会被上传, 也不会插入编辑器
   * @param files 符合当前媒体类型的文件列表 (符合当前媒体类型和exts配置的后缀名)
   * @returns 媒体配置项列表, 用于插入媒体元素, 并链接其中的url; 该 url 会直接应用于对应 html 元素的 src 属性
  */
  onfileselected?: (files: File[]) => CreateMediaOptions<MediaUrlMetadata>[]
  /** 跨域请求, 默认禁用 */
  crossorigin?: 'anonymous' | 'use-credentials'
}
/**
 * [mdn](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img)
 */
export interface ImageOptions extends IMediaOptions, Pick<ImageUrlMetadata, 'alt' | 'loading' | 'crossorigin' | 'referrerpolicy'> {
  exts?: string[] | ('jpg' | 'jpeg' | 'png' | 'gif')[]
  onfileselected?: (files: File[]) => CreateImageOptions[]
}
/**
 * [mdn](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/audio)
 */
export interface AudioOptions extends IMediaOptions, Pick<AudioUrlMetadata, 'controls' | 'preload' | 'crossorigin'> {
  exts?: string[] | ('mp3' | 'wav' | 'aac' | 'ogg' | 'flac' | 'webm')[]
  onfileselected?: (files: File[]) => CreateAudioOptions[]
}
/**
 * [mdn](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video)
 */
export interface VideoOptions extends IMediaOptions, Pick<VideoUrlMetadata, 'controls' | 'controlslist' | 'poster' | 'preload' | 'disablepictureinpicture' | 'crossorigin'> {
  exts?: string[] | ('mp4' | 'webm')[]
  onfileselected?: (files: File[]) => CreateVideoOptions[]
}
export interface IEtMediaElement extends Et.EtElement {
  mediaState: MediaState
  mediaType: MediaType
}
export const enum MediaType {
  Image = 'image',
  Audio = 'audio',
  Video = 'video',
}
export const enum MediaEnum {
  // css class
  Class_Media = 'et-media',
  // el name
  Image = 'et-image',
  Audio = 'et-audio',
  Video = 'et-video',
  // attr
  UrlMeta = 'et-media-meta',
  Alt = 'media-alt',
  State = 'media-state',
  // popup key
  Popup_Key = '__popup_$et-media',
}
export const enum MediaState {
  Failed = 'failed',
  Center = 'center',
  FloatLeft = 'float-left',
  FloatRight = 'float-right',
  Collapsed = 'collapsed',
  Expanded = 'expanded',
}
export const MEDIA_ET_TYPE = etcode.get(MediaEnum.Class_Media)
