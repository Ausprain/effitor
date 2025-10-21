/**
 * 数学公式插件
 * 使用[katex](https://www.npmjs.com/package/katex)渲染katex公式
 */

import type { Et } from '@effitor/core'
// import { renderToString } from 'katex'
// import css from 'katex/dist/katex.min.css'

// const html = renderToString('$x^2$')

export const useMathPlugin = (): Et.EditorPluginSupportInline => {
  return {
    name: '@effitor/plugin-math',
    effector: [],
  }
}
