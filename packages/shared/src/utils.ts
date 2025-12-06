// /**
//  * 去掉 html 字符串首尾和`><`中间的空白符
//  */
// export const minifyHtml = (html: string) => {
//   return html.replaceAll(/(?<=>)\s+|\s+(?=<)/g, '').trim()
// }
/**
 * 去掉 html 字符串首尾空白符和`>`尾随换行, 以及`<`的前导换行+空格缩进
 */
export const trimHtml = (html: string) => {
  return html.replaceAll(/(?<=>)\n+|\n+[ ]*(?=[ ]?<)/g, '').trim()
}

/**
 * @internal
 * 判断一个字符串(当前光标所在#text节点的data)是否含markdown引用语法, **不判断最后一个括弧)** 即默认最后一个字符是括弧;
 * 即该方法用于在输入`)`后判断前面的文本是否构成链接节点 \
 * 即含有: ` [abc](url "title")`或`![abc](url "title")`; 不匹配返回 undefined
 *
 * 匹配返回解析后的内容 { text, url, title, leftRemainText, rightRemainText }
 * text即`[ ]`内的文本; left/right分别为`[`左边和`)`右边的无文本则为空字符串 \
 *
 * * `(`和`!`会尝试匹配全角符号(中文标点)
 *
 * @param data 待匹配的文本
 * @param offset 当前光标位置, 即从此位置向前匹配, 此位置之后都属于right的内容; 默认为data.length
 */
export const checkParseMarkdownReference = (type: 'link' | 'image', data: string, offset = data.length) => {
  let leftSquareIndex = -1
  if (type === 'link') {
    leftSquareIndex = data.lastIndexOf('[', offset)
    if (leftSquareIndex < 0 || data[leftSquareIndex - 1] === '!') {
      return null
    }
  }
  else {
    leftSquareIndex = data.lastIndexOf('![', offset)
    if (leftSquareIndex < 0) {
      leftSquareIndex = data.lastIndexOf('\uff01[' /** ！[ */, offset)
    }
    if (leftSquareIndex < 0) return null
  }

  const rightSquareIndex = data.lastIndexOf(']', offset)
  if (rightSquareIndex < 0) return null

  let leftBracketIndex = data.lastIndexOf('(', offset)
  if (leftBracketIndex < 0) {
    leftBracketIndex = data.lastIndexOf('\uff08' /** （ */, offset)
  }
  if (leftBracketIndex < 0 || leftBracketIndex !== rightSquareIndex + 1) return null

  const text = data.slice(leftSquareIndex + 2, rightSquareIndex)

  const urlTitleArr = data.slice(leftBracketIndex + 1, offset - 1).split(' ')
  if (!urlTitleArr.length || urlTitleArr.length > 2) return null
  const url = urlTitleArr[0] as string
  let title = urlTitleArr[1]
  if (title) {
    if (title.startsWith('“')) title = title.slice(1)
    if (title.endsWith('”')) title = title.slice(0, -1)
  }
  else {
    title = ''
  }

  const leftRemainText = data.slice(0, leftSquareIndex)
  const rightRemainText = data.slice(offset)

  return {
    text,
    url,
    title,
    leftRemainText,
    rightRemainText,
  }
}
