import type { MarkdownTextMapping } from '../config'

export const builtinMapping: MarkdownTextMapping = {
  '\\': (_, i, s) => {
    const n = s[i + 1]
    if (n === '*' || n === '`' || n === '_' || n === '\\' || n === '=' || n === '~') {
      return {
        value: n,
        type: 'data',
        nextIndex: i + 2,
      }
    }
    // \\n -> 换行
    if (n === '\n') {
      return (ctx) => {
        ctx.body.dispatchInputEvent('beforeinput', { inputType: 'insertLineBreak' })
        return i + 2
      }
    }
    return null
  },
  ' ': (_, i, s) => {
    // `  \n` -> 换行
    if (s[i + 1] === ' ' && s[i + 2] === '\n') {
      return (ctx) => {
        ctx.body.dispatchInputEvent('beforeinput', { inputType: 'insertLineBreak' })
        return i + 2
      }
    }
    return null
  },
  '\n': (_, i, s) => {
    // `\n\n` -> 相邻两个换行符视为一个段落结束
    if (s[i + 1] === '\n') {
      return (ctx) => {
        ctx.body.dispatchInputEvent('beforeinput', { inputType: 'insertParagraph' })
        return i + 2
      }
    }
    // 孤立的换行符, 按回车处理
    // 虽然标准markdown中, 单个换行不被视为段落结束, 也不视为换行(linebreak)
    // 但这不符合常规编辑习惯, 并且, ai生成的markdown中, 通常不会出现孤立的换行符
    // 如果这里将单个\n转化掉, 就不好处理 \n```, \n# 等情况了
    return {
      value: 'Enter',
      type: 'key',
      nextIndex: i + 1,
    }
  },
  '\t': (_, i) => {
    return {
      value: 'Tab',
      type: 'key',
      nextIndex: i + 1,
    }
  },
}
