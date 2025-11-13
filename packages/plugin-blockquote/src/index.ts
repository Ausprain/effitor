/**
 * 引用块插件
 *
 * 与传统 markdown 的引用块不同，~~effitor 的引用块不支持嵌套~~（待商榷），其更像是一个段落组。
 * 内置 gfm 风格引用块：NOTE, TIP, IMPORTANT, WARNING, CAUTION，通过热字符串触发
 */

import type { Et } from '@effitor/core'

import { BlockquoteMeta, initBlockquotePluginContext } from './config'
import { blockquoteEffector } from './effector'
import { EtBlockquoteElement } from './EtBlockquoteElement'
import { blockquoteHandler } from './handler'
import cssText from './index.css?raw'

export interface BlockquotePluginOptions {
  /**
   * 自定义引用块元数据映射表
   */
  metaMap?: Record<string, BlockquoteMeta>
  /**
   * 是否包含内置引用块元数据, 内置引用块类型将占用以下键名, 以及应用于热字符串的缩写词:
   * ```ts
   * NOTE, note.
   * TIP, tip.
   * IMPORTANT, impt.
   * WARNING, warning.
   * CAUTION, caution.
   * ```
   */
  withBuiltinMeta?: boolean
}

export const useBlockquotePlugin = (options?: BlockquotePluginOptions): Et.EditorPluginSupportInline => {
  return {
    name: '@effitor/plugin-blockquote',
    cssText: cssText,
    effector: blockquoteEffector,
    elements: [EtBlockquoteElement],
    register(ctxMeta, setSchema, mountEtHandler) {
      setSchema({
        blockquote: EtBlockquoteElement,
      })
      initBlockquotePluginContext(ctxMeta, options)
      mountEtHandler(ctxMeta.schema.paragraph, blockquoteHandler, [])
    },
  }
}
