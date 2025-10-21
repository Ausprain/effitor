import type { Et } from '@effitor/core'

import { MEDIA_ET_CODE, type MediaOptions, MediaPluginContext, MediaType } from './config'
import { mediaEffector } from './effector'
import { EtAudioElement } from './EtAudioElement'
import { EtImageElement } from './EtImageElement'
import { EtVideoElement } from './EtVideoElement'
import { markMediaHandler } from './handler'
import cssText from './index.css?raw'

export type {
  CreateAudioOptions,
  CreateImageOptions,
  CreateVideoOptions,
} from './config'

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

/**
 * 使用媒体插件, 含图片、音频、视频
 * * 此插件在调整资源尺寸的过程中, 会对document.onmousedown/move/up属性赋值, 注意避免冲突
 * @param options 配置项, 缺省时只有图片
 */
export const useMediaPlugin = (options?: MediaOptions): Et.EditorPluginSupportInline => {
  return {
    name: '@effitor/plugin-media',
    cssText,
    effector: mediaEffector,

    registry(ctxMeta, setSchema, extentEtElement) {
      const media: Mutable<MediaPluginContext> = { MEDIA_ET_CODE: MEDIA_ET_CODE } as Mutable<MediaPluginContext>
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
      // @ts-expect-error first assign
      ctxMeta.pctx.$media_ctx = media
      setSchema(schemaInit)
      extentEtElement(ctxMeta.schema.paragraph, markMediaHandler, els)
    },
  }
}
