/**
 * 代码块插件
 * 现行方案: CodeContext: (textarea + pre)
 * 未来方案: 直接编辑 DOM, highlighter 即时渲染, 并使用 TreeWalker 记录和恢复光标位置
 *
 * 在代码块中, 约定以下术语:
 * * highlight: 高亮代码
 * * render: 渲染代码, 即将代码块内的代码渲染到页面上, 仅支持部分语言, 如 html, katex, markdown
 */
import './augment'

import type { Et } from '@effitor/core'

import { initCodePluginContext } from './codePluginContext'
import { RenderOptions } from './codeRenderer'
import type { CodeBlockRenderOptions } from './config'
import { codeEffector } from './effector'
import { EtCodeElement } from './EtCodeElement'
import { codeHandler } from './handler'
import { createShikiHighlighter, type ShikiHighlighterOptions } from './highlighter'
import cssText from './index.css?raw'

export interface CodePluginOptions extends CodeBlockRenderOptions {
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
export { EtCodeElement }
export type { EtCodeHighlighter } from './highlighter'
export const useCodePlugin = async (options?: CodePluginOptions): Promise<Et.EditorPluginSupportInline> => {
  const highlighter = await createShikiHighlighter(options?.shikiOptions)

  const renderOptions: RenderOptions = {}
  if (options?.canRenderLangs?.includes('html')) {
    let sanitizer: ((html: string) => string) | undefined
    if (options.sanitizer === void 0) {
      const dp = (await import('dompurify')).default
      if (dp) {
        const cfgAllowSMIL = {
          ADD_TAGS: ['animate'],
          ADD_ATTR: [
            'attributeName',
            'values',
            'from',
            'to',
            'dur',
            'repeatCount',
            'calcMode',
            'keyTimes',
            'keySplines',
            'begin',
            'end',
            // 'fill', // 注意：这个 fill 是 SMIL 的 fill，不是 CSS fill
          ],
        }
        sanitizer = (html: string) => dp.sanitize(html, options.allowSMIL ? cfgAllowSMIL : {})
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
    renderOptions.html = {
      sanitizer,
    }
  }
  if (options?.canRenderLangs?.includes('latex')) {
    // 动态加载 katex css, 由 vite 实现
    import('katex/dist/katex.min.css')
    const katex = (await import('katex')).default
    renderOptions.latex = {
      texToHtml: katex.renderToString,
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
        renderOptions,
      })
      setSchema({
        code: EtCodeElement,
      })
      mountEtHandler(EtCodeElement, codeHandler, [])
    },
  }
}
