/**
 * 代码块插件
 * 现行方案: CodeMirror: (textarea + pre)
 * 未来方案: 直接编辑 DOM, highlighter 即时渲染, 并使用 TreeWalker 记录和恢复光标位置
 */
import './augment'

import type { Et } from '@effitor/core'

import { initCodePluginContext } from './config'
import { codeEffector } from './effector'
import { EtCodeElement } from './EtCodeElement'
import { codeHandler } from './handler'
import { createShikiHighlighter, ShikiHighlighterOptions } from './highlighter'
import cssText from './index.css?raw'

export interface CodePluginOptions {
  /**
   * Shiki 配置项, 未提供highlighter时有效
   */
  shikiOptions?: ShikiHighlighterOptions
  /**
   * 强制代码块使用深色主题; 当为false时, 会根据系统主题自动切换; 否则无论系统主题如何, 都使用深色主题
   * @default false
   */
  // 强制深色的话, 将 shiki配置的 themes 选项的 light 设置为与dark 一样即可
  // forceStyleDark?: boolean
  /**
   * 默认 Tab 大小, 单位为字符宽度
   * @default 2
   */
  defaultTabSize?: 2 | 3 | 4
}

export const useCodePlugin = async (options?: CodePluginOptions): Promise<Et.EditorPluginSupportInline> => {
  const highlighter = await createShikiHighlighter(options?.shikiOptions)
  return {
    name: '@effitor/plugin-code',
    cssText: cssText,
    effector: [codeEffector],
    elements: [EtCodeElement],
    registry(ctxMeta, setSchema, extentEtElement) {
      initCodePluginContext(ctxMeta, highlighter, options?.defaultTabSize ?? 2)
      setSchema({
        code: EtCodeElement,
      })
      extentEtElement(EtCodeElement, codeHandler, [])
    },
  }
}
