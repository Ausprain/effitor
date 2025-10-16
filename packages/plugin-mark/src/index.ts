import './augment'

import type { Et } from '@effitor/core'

import { initMarkContext } from './config'
import { markEffector } from './effector'
import { EtMarkElement } from './element'
import { inMarkHandler } from './handler/inMarkHandler'
import { markHandler } from './handler/markHandles'

export { EtMarkElement }

interface MarkPluginOptions {
  /** 是否开启标记符hinting */
  enableHinting?: boolean
  /** 需要mark effect的元素构造器列表, 若为缺省, 则默认添加schema段落 */
  needMarkEffectElementCtors?: Et.EtElementCtor[]
}

/**
 * mark标记节点插件
 */
export const useMarkPlugin = (options?: MarkPluginOptions): Et.EditorPluginSupportInline => {
  return {
    name: '@effitor/plugin-mark',
    effector: markEffector,
    elements: [EtMarkElement],
    registry(ctxMeta, setSchema, extentEtElement) {
      initMarkContext(ctxMeta, options?.enableHinting)
      setSchema({ mark: EtMarkElement })
      extentEtElement(EtMarkElement, inMarkHandler, [])
      extentEtElement(EtMarkElement, markHandler, [])
      // 注册接收markEffect的元素
      ;(options?.needMarkEffectElementCtors ?? [ctxMeta.schema.paragraph]).forEach((Ctor) => {
        extentEtElement(Ctor, markHandler, [EtMarkElement])
      })
    },
  }
}
