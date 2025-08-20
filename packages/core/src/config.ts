import type { Et } from '~/core/@types'

export const platform = {
  locale: navigator.language,
  isMac: navigator.userAgentData ? navigator.userAgentData.platform === 'macOS' : /Mac/.test(navigator.userAgent),
  isSafari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
}

export const defaultConfig: Readonly<Et.EditorConfig> = {
  /** 缩进margin-left像素值 */
  INDENT_PIXEL: 22,
  /** 页面最大缩进数 */
  MAX_INDENT: 6,
  /** 编辑区字体大小 */
  FONT_SIZE: 16,
  /** 撤回栈长度 */
  UNDO_LENGTH: 1000,
  // 链接url最大有效长度
  ALLOW_LINK_URL_MAX_LENGTH: 2048,
  ALLOW_MOUNT_WHILE_MOUNTED: false,
  AUTO_CREATE_FIRST_PARAGRAPH: true,
  WITH_EDITOR_DEFAULT_STYLE: true,
  AUTO_REPLACE_FULL_WIDTH_PUNC_WITH_HALF_AFTER_SPACE: true,
}

// export type DefaultConfig = typeof defaultConfig
