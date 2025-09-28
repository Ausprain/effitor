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

import { defineConfig, Options } from 'tsup'

import { importCssRawPlugin } from './tsup-plugin-import-css-raw'

export default defineConfig({
  entry: [
    './src/index.ts',
  ],
  outDir: './dist',
  format: ['esm'],
  dts: {
    // 引入全局 dts 工具类到产物 dts 中
    banner: 'import "./helper"',
  },
  clean: true,
  minify: false,
  define: {
    // 移除开发环境代码
    'import.meta.env.DEV': JSON.stringify(false),
  },
  esbuildPlugins: [
    importCssRawPlugin(),
  ],

  tsconfig: './tsconfig.build.json',
}) as Options
