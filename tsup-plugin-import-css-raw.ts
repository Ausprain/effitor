import * as esbuild from 'esbuild'
import { Plugin } from 'esbuild'
import fs from 'node:fs'
import { resolve } from 'path'

export interface ImportCssRawOptions {
  /**
   * 支持的样式文件类型
   */
  kind?: ('css' | 'less' | 'sass' | 'scss')[]
  /**
   * 自定义css内 url("path") 的处理函数
   * @param path 原始 url 路径
   * @returns 处理后的 url 路径
   */
  urlMapping?: (path: string) => string
  /**
   * 自定义样式文件内容处理函数
   * @param cssContent 读取的样式文件内容
   * @param transform esbuild.transform 函数
   * @returns 处理后的样式文件内容
   */
  transform?: (cssContent: string, transform: typeof esbuild.transform) => string | Promise<string>
  /**
   * 若定义了, 将在 transform 处理后, 再调用该函数进行处理;
   * @param cssContent 读取的样式文件内容
   * @returns 处理后的样式文件内容
   */
  postProcess?: (cssContent: string) => string | Promise<string>
}

/**
 * 导入样式文件原始内容插件, 处理 `import cssText from './style.css?raw'` 语法;
 * 默认会将样式文件内容进行压缩后以纯文本导出; 可以通过 `transform` 选项自定义处理函数;
 * 需额外配置 ts 类型声明
 * @example
 * // env.d.ts
 * declare module '*.css?raw' {
 *   const content: string
 *   export default content
 * }
 * @param options 插件选项
 * @returns esbuild 插件
 */
export function importCssRawPlugin(options?: ImportCssRawOptions): Plugin {
  const kind = [...new Set(options?.kind ?? ['css'])].join('|')
  const filter = new RegExp(`\\.(${kind})\\?raw$`)

  // 递归处理 CSS 内容的函数
  async function processCssFile(
    filePath: string, alreadyProcessed = new Set<string>(),
  ): Promise<string> {
    // 防止循环引用
    const normalizedPath = resolve(filePath)
    if (alreadyProcessed.has(normalizedPath)) {
      return ''
    }
    alreadyProcessed.add(normalizedPath)

    // 读取原始 CSS 内容
    let contents = await fs.promises.readFile(normalizedPath, 'utf8')

    // 处理 @import 规则
    // 只支持引号语法 @import "xx.css" 或 @import 'xx.css'
    const importRegex = /@import\s+(?:"([^"]+)"|'([^']+)');/g
    const importMatches = [...contents.matchAll(importRegex)]

    // 递归处理每个导入
    for (const match of importMatches) {
      const importPath = match[1] || match[2]
      const fullImportPath = resolve(normalizedPath, '..', importPath.endsWith('.css') ? importPath : `${importPath}.css`)

      try {
        const importedContent = await processCssFile(fullImportPath, alreadyProcessed)
        contents = contents.replace(match[0], importedContent)
      }
      catch (err) {
        console.warn(`Failed to process @import in ${normalizedPath}:`, err)
      }
    }

    return contents
  }

  return {
    name: 'import-css-raw',
    setup(build) {
      build.onResolve({ filter }, (args) => {
        return {
          path: resolve(args.resolveDir, args.path),
          namespace: 'import-css-raw',
        }
      })
      build.onLoad({ filter, namespace: 'import-css-raw' }, async (args) => {
        let contents = await processCssFile(args.path.slice(0, -4))
        if (options?.transform) {
          contents = await options.transform(contents, esbuild.transform)
        }
        else {
          contents = (await esbuild.transform(contents, {
            loader: 'css',
            minify: true,
          })).code
        }
        if (options?.urlMapping) {
          const mappping = options.urlMapping
          contents = contents.replace(/url\(["']?([^"')]+)["']?\)/g, (_, path) => {
            return `url(${mappping(path)})`
          })
        }
        if (options?.postProcess) {
          contents = await options.postProcess(contents)
        }
        return {
          contents: `export default ${JSON.stringify(contents)}`,
          loader: 'js',
        }
      })
    },
  }
}
