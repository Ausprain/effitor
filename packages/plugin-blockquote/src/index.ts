import './index.css'

import type { Et } from '@effitor/core'

import { type BlockquoteMeta, initBlockquotePluginContext } from './config'
import { type BlockquoteActionMap, blockquoteActions, blockquoteEffector } from './effector'
import { EtBlockquoteElement } from './EtBlockquoteElement'
import { blockquoteHandler } from './handler'

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
   * WARNING, warn.
   * CAUTION, caut.
   * ```
   */
  withBuiltinMeta?: boolean
  /**
   * 使用引用块操作
   * @param actions 引用块操作
   */
  useActions?: (actions: BlockquoteActionMap) => void
}

export { EtBlockquoteElement } from './EtBlockquoteElement'

export const useBlockquotePlugin = (options?: BlockquotePluginOptions): Et.EditorPlugin => {
  if (options?.useActions) {
    options.useActions(blockquoteActions)
  }
  return {
    name: '@effitor/plugin-blockquote',
    effector: [{ onMounted: ctx => initBlockquotePluginContext(ctx, options) }, blockquoteEffector],
    elements: [EtBlockquoteElement],
    register(ctxMeta, setSchema, mountEtHandler) {
      setSchema({
        blockquote: EtBlockquoteElement,
      })
      // 注册actions
      ctxMeta.actions.blockquote = blockquoteActions
      mountEtHandler(ctxMeta.schema.paragraph, blockquoteHandler)
    },
  }
}
