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
  entry: [
    './src/index.ts',
  ],
  outDir: './dist',
  format: ['esm'],
  dts: {
    banner: 'import "./helper"',
  },
  clean: true,
  minify: false,
  // 使用 minify + define 移除开发环境代码
  define: {
    'import.meta.env.DEV': JSON.stringify(false),
  },
  esbuildPlugins: [
    importCssRawPlugin(),
  ],

  tsconfig: './tsconfig.build.json',

  onSuccess: async () => {
    if (!fs.existsSync('./dist/styles')) {
      fs.mkdirSync('./dist/styles', { recursive: true })
    }
    fs.copySync('./src/assets/fonts', './dist/styles/fonts')
    fs.copySync('./src/assets/font.css', './dist/styles/font.css')
    // FIXME onSuccess 回调在构建 js 之后就执行了, 而构建 dts 成功之前会清空 dist 目录的所有.d.ts 文件
    // 此处延迟复制
    setTimeout(() => {
      fs.copySync('../shared/helper.d.ts', './dist/helper.d.ts')
    }, 5000)
    return
  },
})
