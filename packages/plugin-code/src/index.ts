/**
 * 代码块插件
 * 现行方案: CodeContext: (textarea + pre)
 * 未来方案: 直接编辑 DOM, highlighter 即时渲染, 并使用 TreeWalker 记录和恢复光标位置
 */
import './augment'

import type { Et } from '@effitor/core'

import { initCodePluginContext } from './codePluginContext'
import type { HTMLRenderOptions } from './config'
import { codeEffector } from './effector'
import { EtCodeElement } from './EtCodeElement'
import { codeHandler } from './handler'
import { createShikiHighlighter, type ShikiHighlighterOptions } from './highlighter'
import cssText from './index.css?raw'

export interface CodePluginOptions extends HTMLRenderOptions {
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
  let sanitizer: ((html: string) => string) | undefined
  if (options?.canRenderHTML) {
    if (options.sanitizer === void 0) {
      const dp = (await import('dompurify')).default
      if (dp) {
        sanitizer = (html: string) => dp.sanitize(html)
      }
      else {
        if (import.meta.env.DEV) {
          throw new Error('dompurify not found, code block html render will be disabled')
        }
        sanitizer = (html: string) => html
      }
    }
    else if (options.sanitizer === null) {
      sanitizer = (html: string) => html
    }
    else {
      sanitizer = options.sanitizer
    }
  }
  return {
    name: '@effitor/plugin-code',
    cssText: cssText,
    effector: [codeEffector],
    elements: [EtCodeElement],
    register(ctxMeta, setSchema, mountEtHandler) {
      initCodePluginContext(ctxMeta, highlighter, {
        ...options,
        sanitizer,
      })
      setSchema({
        code: EtCodeElement,
      })
      mountEtHandler(EtCodeElement, codeHandler, [])
    },
  }
}
