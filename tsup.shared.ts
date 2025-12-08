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

import { defineConfig, type Options } from 'tsup'

import { importCssRawPlugin } from './tsup-plugin-import-css-raw'
import { resolve } from 'path'
import fs from 'fs-extra'

export default defineConfig({
  entry: [
    './src/index.ts',
  ],
  outDir: './dist',
  format: ['esm'],
  dts: true,
  clean: true,
  define: {
    // 移除开发环境代码
    'import.meta.env.DEV': JSON.stringify(false),
  },
  esbuildPlugins: [
    importCssRawPlugin(),
  ],
  esbuildOptions(options) {
    options.assetNames = '[name]'
  },
  loader: {
    '.css': 'copy',
  },
  async onSuccess() {
    const themesDir = resolve(import.meta.dirname, './src/themes')
    console.log('theme dir', themesDir)
    if (!fs.existsSync(themesDir)) {
      return
    }
    if (!fs.existsSync(resolve(import.meta.dirname, './dist/themes/'))) {
      fs.mkdirSync(resolve(import.meta.dirname, './dist/themes/'))
    }
    fs.copy(themesDir, resolve(import.meta.dirname, './dist/themes/'), {
      overwrite: true,
    })
  },

  tsconfig: './tsconfig.build.json',
}) as Options
