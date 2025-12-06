import './augment'

import { EffectElement, type Et } from '@effitor/core'

import { initMarkPluginContext } from './config'
import { type MarkActionMap, markActions, markEffector } from './effector'
import { EtMarkElement, MARK_ET_TYPE } from './EtMarkElement'
import { inMarkHandler } from './handler/inMarkHandler'
import { markHandler, markInputTypeHandler } from './handler/markHandler'
import markCssText from './index.css?raw'

export interface MarkPluginOptions {
  /** 是否开启标记符hinting */
  enableHinting?: boolean
  /** 需要mark effect的元素构造器列表, 若为缺省, 则默认添加schema段落 */
  needMarkEffectElementCtors?: Et.EtElementCtor[]
  /**
   * 使用 mark 插件动作
   * @param actions mark 插件动作
   */
  useActions?: (actions: MarkActionMap) => void
}
export { EtMarkElement }
export const useMarkPlugin = (options?: MarkPluginOptions): Et.EditorPlugin => {
  options?.useActions?.(markActions)
  return {
    name: '@effitor/plugin-mark',
    cssText: markCssText,
    effector: markEffector,
    elements: [EtMarkElement],
    register(ctxMeta, setSchema, mountEtHandler) {
      initMarkPluginContext(ctxMeta, options?.enableHinting)
      setSchema({ mark: EtMarkElement })
      mountEtHandler(EtMarkElement, inMarkHandler)
      mountEtHandler(EtMarkElement, markHandler)
      mountEtHandler(EffectElement, markInputTypeHandler)
      // 注册接收markEffect的元素
      ;(options?.needMarkEffectElementCtors ?? [ctxMeta.schema.paragraph]).forEach((Ctor) => {
        mountEtHandler(Ctor, markHandler, MARK_ET_TYPE)
      })
    },
  }
}
