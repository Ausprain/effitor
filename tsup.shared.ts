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

export default defineConfig({
  entry: [
    './src/index.ts',
  ],
  outDir: './dist',
  format: ['esm'],
  dts: true,
  clean: true,
  minify: false,
  define: {
    // 移除开发环境代码
    'import.meta.env.DEV': JSON.stringify(false),
  },
  esbuildPlugins: [
    importCssRawPlugin(),
  ],
  onSuccess: async () => {
    // fixed. 构建完成后将 helper.d.ts 复制到 dist 中
    // 但由于该回调是在构建 js 结束就执行, 而随后的构建 dts 的过程又会将 dist 下的所有 dts 删除
    // 所以不在这里复制, 在 build 脚本中复制;
    // 因此仅在测试时可在某个子包内使用 bun tsup 单独打包, 最终构建时应在全局使用 bun run build 执行 build 脚本打包
  },

  tsconfig: './tsconfig.build.json',
}) as Options
