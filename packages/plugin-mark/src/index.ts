import './augment'

import type { Et } from '@effitor/core'

import { initContext, MarkEnum } from './config'
import { markEffector } from './effector'
import { EtMarkElement } from './element'
import { inMarkHandler } from './handler/inMarkHandler'
import { markHandler } from './handler/markHandles'

/**
 * mark标记节点插件
 * @param needMarkEffectElementCtors 需要mark effect的元素构造器列表, 若为缺省, 则默认添加schema段落
 */
export const useMarkPlugin = (needMarkEffectElementCtors?: Et.EtElementCtor[]): Et.EditorPluginSupportInline => {
  return {
    name: MarkEnum.PluginName,
    effector: markEffector,
    elements: [EtMarkElement],
    registry(ctxMeta, setSchema, extentEtElement) {
      setSchema({ mark: EtMarkElement })
      initContext(ctxMeta)
      extentEtElement(EtMarkElement, inMarkHandler, [])
      extentEtElement(EtMarkElement, markHandler, [])
      if (!needMarkEffectElementCtors) {
        needMarkEffectElementCtors = [ctxMeta.schema.paragraph]
      }
      // 注册接收markEffect的元素
      needMarkEffectElementCtors.forEach(Ctor => extentEtElement(Ctor, markHandler, [EtMarkElement]))
    },
  }
}
