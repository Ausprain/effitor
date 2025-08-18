/**
 * 使用 tsup 构建生产产物;
 *
 * 使用 swc 插件对源代码ast 进行优化; 对以下内容进行替换:
 * ```
 * CmdType.XXX 替换为实际常量值
 * dom.isText/isElement/... 替换为内联判断
 * ```
 *
 */

import fs from 'fs-extra'
import { defineConfig } from 'tsup'
import { importCssRawPlugin } from './tsup-plugin-import-css-raw'

export default defineConfig({
  entry: ['./main/src'],
  outDir: './dist',
  format: ['esm'],
  dts: true,
  clean: true,
  // minify: true,
  // 使用 minify + define 移除开发环境代码
  define: {
    'import.meta.env.DEV': JSON.stringify(false),
  },
  esbuildPlugins: [
    importCssRawPlugin(),
  ],

  onSuccess: async () => {
    if (!fs.existsSync('./dist/styles')) {
      fs.mkdirSync('./dist/styles', { recursive: true })
    }
    fs.copySync('./packages/core/src/assets/fonts', './dist/styles/fonts')
    fs.copySync('./packages/core/src/assets/font.css', './dist/styles/font.css')
    return
  },
})
