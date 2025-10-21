import './augment'

import type { Et } from '@effitor/core'

import { initMarkPluginContext } from './config'
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
    register(ctxMeta, setSchema, mountEtHandler) {
      initMarkPluginContext(ctxMeta, options?.enableHinting)
      setSchema({ mark: EtMarkElement })
      mountEtHandler(EtMarkElement, inMarkHandler, [])
      mountEtHandler(EtMarkElement, markHandler, [])
      // 注册接收markEffect的元素
      ;(options?.needMarkEffectElementCtors ?? [ctxMeta.schema.paragraph]).forEach((Ctor) => {
        mountEtHandler(Ctor, markHandler, [EtMarkElement])
      })
    },
  }
}
