/**
 * 去掉 html 字符串首尾和`><`中间的空白符
 */
export const minifyHtml = (html: string) => {
  return html.replaceAll(/(?<=>)\s+|\s+(?=<)/g, '').trim()
}
/**
 * 去掉 html 字符串首尾空白符和`>`尾随换行, 以及`<`的前导换行+空格缩进
 */
export const trimHtml = (html: string) => {
  return html.replaceAll(/(?<=>)\n+|\n+[ ]*(?=[ ]?<)/g, '').trim()
}
