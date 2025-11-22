import type { Et } from '@effitor/core'

import type {
  AudioOptions,
  ImageOptions,
  MediaPluginContext,
  VideoOptions,
} from './config'
import { MEDIA_ET_TYPE, MediaType } from './config'
import { mediaEffector } from './effector'
import { EtAudioElement } from './EtAudioElement'
import { EtImageElement } from './EtImageElement'
import { EtVideoElement } from './EtVideoElement'
import { markMediaHandler } from './handler'
import cssText from './index.css?raw'

const defaultOptions = {
  image: {
    type: MediaType.Image,
    maxSize: 10 * 1024 * 1024, // 10MB
    exts: new Set(['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'avif']),
  },
  audio: {
    type: MediaType.Audio,
    maxSize: 10 * 1024 * 1024, // 10MB
    exts: new Set(['mp3', 'wav', 'aac']), // , 'ogg', 'flac', 'webm']
  },
  video: {
    type: MediaType.Video,
    maxSize: 10 * 1024 * 1024, // 10MB
    exts: new Set(['mp4', 'webm']),
  },
} as const

export interface MediaOptions {
  /** 通用资源url映射; 若图片/音/视频的url映射规则不同, 应单独配置 */
  urlMapping?: Et.MdUrlMapping
  /** hover media效应元素时会显示popup选项, 可通过此配置对popup的功能进行自定义 */
  popupOptions?: Required<Et.EditorPluginContext>['$mediaPx']['popupOptions']
  image: ImageOptions | true
  audio?: AudioOptions | true
  video?: VideoOptions | true
}
export type {
  CreateAudioOptions,
  CreateImageOptions,
  CreateVideoOptions,
} from './config'

export { EtAudioElement, EtImageElement, EtVideoElement }
/**
 * 使用媒体插件, 含图片、音频、视频
 * * 此插件在调整资源尺寸的过程中, 会对document.onmousedown/move/up属性赋值, 注意避免冲突
 * @param options 配置项, 缺省时只有图片
 */
export const useMediaPlugin = (options?: MediaOptions): Et.EditorPlugin => {
  return {
    name: '@effitor/plugin-media',
    cssText,
    effector: mediaEffector,
    elements: [
      EtImageElement,
      ...[
        options?.audio ? EtAudioElement : undefined,
        options?.video ? EtVideoElement : undefined,
      ].filter(el => !!el),
    ],

    register(ctxMeta, setSchema, mountEtHandler) {
      const media: Mutable<MediaPluginContext> = { MEDIA_ET_TYPE } as Mutable<MediaPluginContext>
      const els = [], schemaInit = {} as Et.EditorSchema
      if (!options) {
        media.image = defaultOptions.image
        els.push(EtImageElement)
        schemaInit.image = EtImageElement
      }
      else {
        const { urlMapping, popupOptions, image, audio, video } = options
        media.popupOptions = popupOptions
        if (image) {
          els.push(EtImageElement)
          schemaInit[MediaType.Image] = EtImageElement
          media.image = image === true
            ? defaultOptions.image
            : {
                ...image,
                type: MediaType.Image,
                maxSize: image.maxSize ?? defaultOptions.image.maxSize,
                urlMapping: image.urlMapping ?? urlMapping,
                exts: new Set((image.exts?.length) ? image.exts : defaultOptions.image.exts),
              }
        }
        if (audio) {
          els.push(EtAudioElement)
          schemaInit[MediaType.Audio] = EtAudioElement
          media.audio = audio === true
            ? defaultOptions.audio
            : {
                ...audio,
                type: MediaType.Audio,
                maxSize: audio.maxSize ?? defaultOptions.audio.maxSize,
                urlMapping: audio.urlMapping ?? urlMapping,
                exts: new Set((audio.exts?.length) ? audio.exts : defaultOptions.audio.exts),
              }
        }
        if (video) {
          els.push(EtVideoElement)
          schemaInit[MediaType.Video] = EtVideoElement
          media.video = video === true
            ? defaultOptions.video
            : {
                ...video,
                type: MediaType.Video,
                maxSize: video.maxSize ?? defaultOptions.video.maxSize,
                urlMapping: video.urlMapping ?? urlMapping,
                exts: new Set((video.exts?.length) ? video.exts : defaultOptions.video.exts),
              }
        }
      }
      ctxMeta.pctx.$mediaPx = media
      setSchema(schemaInit)
      mountEtHandler(ctxMeta.schema.paragraph, markMediaHandler, MEDIA_ET_TYPE)
    },
  }
}
