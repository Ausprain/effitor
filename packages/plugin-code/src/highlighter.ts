import { createHighlighter } from 'shiki'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import { BundledLanguage, BundledTheme } from 'shiki/types'

import { CodeEnum } from './config'

/**
 * 代码高亮器
 */
export interface EtCodeHighlighter<L extends string> {
  langs: readonly L[]
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
    light: BundledTheme
    dark: BundledTheme
  }
  langs?: BundledLanguage[]
}
export const defaultOptions: Required<ShikiHighlighterOptions> = {
  themes: {
    light: 'github-light',
    dark: 'github-dark',
  },
  langs: [
    'bat', 'powershell', 'ps1', 'shell', 'sh', 'c', 'c++', 'cmake', 'c#', 'dart', 'go', 'java', 'kotlin', 'kt', 'groovy',
    'json', 'javascript', 'js', 'jsx', 'typescript', 'ts', 'tsx', 'html', 'css', 'less', 'scss', 'sass',
    'latex', 'lua', 'matlab', 'markdown', 'md',
    'nginx', 'php', 'perl', 'python', 'py', 'r', 'ruby', 'rust', 'rs', 'sql', 'swift', 'yaml', 'toml',
  ],
}
export const createShikiHighlighter = async (
  options?: ShikiHighlighterOptions,
): Promise<EtCodeHighlighter<BundledLanguage>> => {
  const { langs } = options || defaultOptions
  const themes = options?.themes || defaultOptions.themes
  const shiki = await createHighlighter({
    langs: langs || defaultOptions.langs,
    themes: [themes.light, themes.dark],
    engine: createJavaScriptRegexEngine(),
  })

  return {
    langs: [...(langs || defaultOptions.langs)],
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
