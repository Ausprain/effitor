
/**
 * shadowRoot的默认内联css text
 */
export const shadowCssText = `
*, ::before, ::after {
    margin: 0;
    padding: 0;
    outline: none;
    box-sizing: border-box;
}
et-body {
    position: relative;
    display: block;
    white-space: pre-wrap;
}
et-p {
    display: block;
    min-height: 1.5em;
    line-height: 1.5em;
}

`

export const defaultConfig = {
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
}

export type DefaultConfig = typeof defaultConfig;