import type { Et } from '@effitor/core'

import { BlockquoteMeta, initBlockquotePluginContext } from './config'
import { blockquoteEffector, replaceCurrentParagraphWithBlockquote } from './effector'
import { EtBlockquoteElement } from './EtBlockquoteElement'
import { blockquoteHandler } from './handler'
import cssText from './index.css?raw'

const blockquoteActions = {
  /**
   * 替换当前段落为引用块
   * @param ctx 编辑器上下文
   * @param param1 选项
   * @param param1.meta 引用块元数据
   * @param param1.reuse 是否复用被替换的段落 (将被替换段落插入引用块末尾)
   * @returns 是否成功替换
   */
  replaceCurrentParagraphWithBlockquote,
}

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
  useActions?: (actions: typeof blockquoteActions) => void
}

export { EtBlockquoteElement } from './EtBlockquoteElement'

export const useBlockquotePlugin = (options?: BlockquotePluginOptions): Et.EditorPlugin => {
  if (options?.useActions) {
    options.useActions(blockquoteActions)
  }
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
      mountEtHandler(ctxMeta.schema.paragraph, blockquoteHandler)
    },
  }
}
