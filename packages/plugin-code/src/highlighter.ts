import { createHighlighterCore, ThemeRegistrationAny } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import { BundledLanguage, LanguageInput, ThemeInput } from 'shiki/types'

import { CodeEnum } from './config'

/**
 * 代码高亮器
 */
export interface EtCodeHighlighter<L extends string> {
  langs: Record<string, L>
  /**
   * 高亮代码, 返回高亮后的 html 字符串; 仅在复制代码时用于向剪切板写入高亮代码 html
   */
  highlight(code: string, lang: L, isDark: boolean): string
  /**
   * 将代码转换为高亮代码行, 每个代码行元素需要带有 css 类名 `et-code-line` (CodeEnum.Class_CodeLine)
   */
  codeToLines(code: string, lang: L): HTMLElement[]
  /**
   * 初始化时, 会尝试调用此回调更新 pre 元素的类名或样式
   * @param pre 代码块元素
   */
  onInit?(pre: Readonly<HTMLElement>, lang: L): void
}

export interface ShikiHighlighterOptions {
  themes?: {
    light: ThemeInput
    dark: ThemeInput
  }
  /**
   * 支持的语言模块, 每个元素是一个语言模块`import('@shikijs/langs/xxx')`或导入函数 `() => import()`;
   * * 必须在alias中配置对应语言的“别名”, 否则无法通过 \`\`\`lang 创建代码块;
   * 已内置导入语言(始终导入):
   * ```
   * javascript
   * typescript
   * html
   * css
   * java
   * kotlin
   * python
   * go
   * rust
   * json
   * markdown
   * sql
   * ```
   */
  langs?: LanguageInput[]
  /**
   * 语言别名, `键`是通过markdown: \`\`\`lang 创建代码块中的 lang, `值`是 shiki 支持的语言名;
   * 也即 `langs` 中导入到语言模块id; 不在alias键中的语言无法通过 \`\`\`lang 创建代码块;
   * 若对应值的语言没有导入(不在 `langs` 中), 创建对应语言代码块时, shiki则会报错;
   *
   * 已内置别名:
   * ```
   * javascript: 'javascript',
   * typescript: 'typescript',
   * js: 'javascript',
   * ts: 'typescript',
   * html: 'html',
   * css: 'css',
   * java: 'java',
   * kotlin: 'kotlin',
   * py: 'python',
   * go: 'go',
   * rust: 'rust',
   * rs: 'rust',
   * json: 'json',
   * md: 'markdown',
   * sql: 'sql',
   * vue: 'vue',
   * ```
   */
  alias?: Record<string, BundledLanguage>
}
export const defaultOptions: Required<ShikiHighlighterOptions> = {
  themes: {
    light: () => import(`@shikijs/themes/github-light`),
    dark: () => import(`@shikijs/themes/github-dark`),
  },
  langs: [
    () => import(`@shikijs/langs/javascript`),
    () => import(`@shikijs/langs/typescript`),
    () => import(`@shikijs/langs/html`),
    () => import(`@shikijs/langs/css`),
    () => import(`@shikijs/langs/java`),
    () => import(`@shikijs/langs/kotlin`),
    () => import(`@shikijs/langs/python`),
    () => import(`@shikijs/langs/go`),
    () => import(`@shikijs/langs/rust`),
    () => import(`@shikijs/langs/json`),
    () => import(`@shikijs/langs/markdown`),
    () => import(`@shikijs/langs/sql`),
    () => import(`@shikijs/langs/vue`),
  ],
  alias: {
    javascript: 'javascript',
    typescript: 'typescript',
    js: 'javascript',
    ts: 'typescript',
    html: 'html',
    css: 'css',
    java: 'java',
    kotlin: 'kotlin',
    py: 'python',
    go: 'go',
    rust: 'rust',
    rs: 'rust',
    json: 'json',
    markdown: 'markdown',
    md: 'markdown',
    sql: 'sql',
    vue: 'vue',
  },
  // langs: [
  //   'bat', 'ps1', 'shell', 'c', 'c++', 'cmake', 'c#',
  //   'html', 'css', 'latex',
  //   'javascript', 'js', 'jsx', 'typescript', 'ts', 'tsx',
  //   'java', 'kotlin', 'python', 'py', 'go', 'rust', 'swift',
  //   'json', 'markdown', 'md', 'yaml', 'toml',
  //   'sql', 'nginx',
  // ],
}
export const createShikiHighlighter = async (
  options?: ShikiHighlighterOptions,
): Promise<EtCodeHighlighter<BundledLanguage>> => {
  const langs = [...(options?.langs || []), ...defaultOptions.langs]
  const themeModules = options?.themes || defaultOptions.themes
  const shiki = await createHighlighterCore({
    langs,
    themes: [themeModules.light, themeModules.dark],
    engine: createJavaScriptRegexEngine({ forgiving: true }), // 抑制解析报错
  })
  const themes = {
    light: (await (typeof themeModules.light === 'function' ? themeModules.light() : themeModules.light) as {
      default: ThemeRegistrationAny
    }).default,
    dark: (await (typeof themeModules.dark === 'function' ? themeModules.dark() : themeModules.dark) as {
      default: ThemeRegistrationAny
    }).default,
  }

  return {
    langs: { ...options?.alias, ...defaultOptions.alias },
    onInit(pre, lang) {
      const { themeName, bg, fg } = shiki.codeToTokens('', {
        lang,
        themes,
      })
      pre.classList.add('shiki', ...(themeName?.split(' ') || []))
      let cssText = ''
      if (bg) {
        cssText += `background-color:${bg};`
      }
      if (fg) {
        cssText += `color:${fg};`
      }
      pre.style.cssText = cssText
    },
    highlight(code, lang, isDark) {
      return shiki.codeToHtml(code, {
        lang,
        theme: isDark ? themes.dark : themes.light,
      })
    },
    /**
     * 将代码转换为高亮代码行, 每个代码行元素需要带有 css 类名 `et-code-line` (CodeEnum.Class_CodeLine)
     * * code 末尾的换行符会让 shiki 多解析出一个空行; 如果不需要这个空行, 那么传入的 code 末尾不能有换行符
     * @param code 代码字符串
     * @param lang 代码语言
     * @returns 高亮代码行元素数组
     */
    codeToLines(code, lang) {
      const { tokens, fg } = shiki.codeToTokens(code, {
        lang,
        themes,
      })
      const fgColor = (fg?.split(';')?.[0] || '').toUpperCase()
      const res: HTMLElement[] = []
      // 最后一行的换行符会让 shiki 多解析出一个空行
      for (const tokensOfLine of tokens) {
        const lineEl = document.createElement('span')
        lineEl.classList.add(CodeEnum.Class_CodeLine)
        let endText: Text | null = null
        for (const token of tokensOfLine) {
          const color = token.htmlStyle?.color
          // 相同颜色不用 span 包装
          if (color === fgColor) {
            endText = document.createTextNode(token.content)
            lineEl.appendChild(endText)
          }
          else {
            const tokenEl = document.createElement('span')
            tokenEl.style.cssText = !token.htmlStyle ? '' : Object.entries(token.htmlStyle).map(([k, v]) => `${k}:${v};`).join('')
            endText = document.createTextNode(token.content)
            tokenEl.appendChild(endText)
            lineEl.appendChild(tokenEl)
          }
        }
        if (endText) {
          endText.data = endText.data + '\n'
        }
        else {
          endText = document.createTextNode('\n')
          lineEl.appendChild(endText)
        }
        res.push(lineEl)
      }
      return res
    },
  }
}
