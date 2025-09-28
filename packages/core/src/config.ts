import type { Et } from './@types'

// navigator.userAgent On macOS
// Edge: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0'
// Chrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
// Safari: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15"
// Firefox: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:142.0) Gecko/20100101 Firefox/142.0"
// macOS WKWebView: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)"
export const platform = {
  locale: navigator.language,
  isMac: navigator.userAgentData ? navigator.userAgentData.platform === 'macOS' : /Mac/.test(navigator.userAgent),
  isFirefox: /Firefox/.test(navigator.userAgent),
  isSafari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
  /**
   * 当前平台是否支持 inputType="insertFromComposition" 的 InputEvent\
   * 目前已知 Safari 和 macOS WKWebView 支持; Chromium 和 Firefox 均不支持
   */
  isSupportInsertFromComposition: new InputEvent('beforeinput', {
    inputType: 'insertFromComposition',
  }).inputType === 'insertFromComposition',
} as const

export const defaultConfig: Readonly<Et.EditorConfig> = {
  /** 缩进margin-left像素值 */
  // INDENT_PIXEL: 22,
  /** 页面最大缩进数 */
  // MAX_INDENT: 6,
  /** 撤回栈长度 */
  UNDO_LENGTH: 1000,
  ALLOW_MOUNT_WHILE_MOUNTED: false,
  AUTO_CREATE_FIRST_PARAGRAPH: true,
  WITH_EDITOR_DEFAULT_STYLE: true,
  WITH_EDITOR_DEFAULT_LOGGER: false,
  AUTO_REPLACE_FULL_WIDTH_PUNC_WITH_HALF_AFTER_SPACE: true,
  INSERT_BR_FOR_LINE_BREAK: false,
}

// export type DefaultConfig = typeof defaultConfig
