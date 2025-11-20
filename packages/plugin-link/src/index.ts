/**
 * link 插件
 * link效应:
 * 1. link元素继承 richText元素
 *  1.1 link元素需能自定义markdown互转时的url转换
 * 2. linkEffector需校验链接合法性 (url-shceme, url-length)
 *  2.1 链接节点hover popup可修改/复制/跳转链接
 *  2.2 dropdown可通过dialog编辑插入链接
 * 3. 粘贴链接
 *  3.1 粘贴时需校验当前效应元素是否允许插入链接
 */

import type { Et } from '@effitor/core'

import { initLinkPluginContext, LINK_ET_TYPE, type LinkPluginContextOptions } from './config'
import { linkEffector } from './effector'
import { EtLinkElement } from './EtLinkElement'
import { markLinkHandler } from './handler'
import cssText from './index.css?raw'

export interface LinkPluginOptions extends LinkPluginContextOptions {
  /** 允许插入链接的效应元素的构造器列表, 默认仅有shcema段落 */
  needLinkEffectElementCtors?: Et.EtElementCtor[]
}
export { EtLinkElement }
export const useLinkPlugin = (options?: LinkPluginOptions): Et.EditorPluginSupportInline => {
  return {
    name: '@effitor/plugin-link',
    cssText,
    effector: linkEffector,
    elements: [EtLinkElement],
    register(ctx, setSchema, mountEtHandler) {
      setSchema({ link: EtLinkElement })
      // 注册link效应到段落上
      new Set(options?.needLinkEffectElementCtors ?? [])
        .add(ctx.schema.paragraph)
        .forEach(ctor => mountEtHandler(ctor, markLinkHandler, LINK_ET_TYPE))
      initLinkPluginContext(ctx, options)
    },
  }
}
