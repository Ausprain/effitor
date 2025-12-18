import type { Et } from '@effitor/core'

import type { MarkdownTextMapping } from '../config'

interface MarkElement {
  localName: 'et-mark'
  markType: 'bold' | 'italic' | 'highlight' | 'code' | 'delete'
}

// 需处理内联代码内的反引号
//  ` `` `,
// `` ` ``,
// `` AB`D` ``,
// ```` A``B`C``` ````
// 总结：内联代码的标记符为，内部最长连续反引号个数+1，+空格包裹
let startBackquoteNum = 0

const checkInMark = (ctx: Et.EditorContext, type: MarkElement['markType']) => {
  const el = ctx.focusEtElement as MarkElement | null
  return el?.localName === 'et-mark' && el.markType === type
}
const checkToTabout = (ctx: Et.EditorContext, i: number, s: string, type: MarkElement['markType'], char: string, dbl: boolean) => {
  if (!checkInMark(ctx, type)) {
    return null
  }
  if (char === '`') {
    if (s[i - 1] !== char && s[i + 1] !== char) {
      return {
        type: 'key',
        value: 'Tab',
        nextIndex: i + 1,
      } as const
    }
    return {
      type: 'data',
      value: '`',
      nextIndex: i + 1,
    } as const
  }
  else if (dbl ? (s[i + 1] === char) : (s[i - 1] !== char)) {
    return {
      value: 'Tab',
      type: 'key',
      nextIndex: dbl ? i + 2 : i + 1,
    } as const
  }
  return null
}

export const mappingForMark: MarkdownTextMapping = {
  '*': (ctx, i, s) => {
    // 行首的 `* ` 应视为列表
    if (s[i - 1] === '\n' && s[i + 1] === ' ') {
      return {
        value: '*',
        type: 'data',
        nextIndex: i + 1,
      }
    }
    return checkToTabout(ctx, i, s, 'bold', '*', true)
      ?? checkToTabout(ctx, i, s, 'italic', '*', false)
  },
  '`': (ctx, i, s) => {
    // 退出
    const ret = checkToTabout(ctx, i, s, 'code', '`', false)
    if (ret) {
      return ret
    }
    if (s[i + 1] === ' ') {
      return {
        type: 'key',
        value: '`',
        nextIndex: i + 2,
      }
    }
    // 进入
    if (s[i + 1] !== '`') {
      return null
    }
    let j = i + 1
    while (s[j] === '`') {
      j++
    }
    if (s[j] === ' ') {
      const end = s.indexOf(' ' + '`'.repeat(j - i), j + 1)
      if (end === -1) {
        return {
          type: 'data',
          value: s.slice(i, j + 1),
          nextIndex: j + 1,
        }
      }
      startBackquoteNum = j - i
      return {
        type: 'key',
        value: '`',
        nextIndex: j + 1,
      }
    }
    return null
  },
  ' ': (ctx, i, s) => {
    if (s[i + 1] !== '`') {
      return null
    }
    if (checkInMark(ctx, 'code')) {
      let nextIndex = i + 1
      if (s[i + 2] !== '`') {
        nextIndex = i + 2
      }
      else if (s.slice(nextIndex, nextIndex + startBackquoteNum) === '`'.repeat(startBackquoteNum)) {
        nextIndex = nextIndex + startBackquoteNum
      }
      if (nextIndex !== i + 1) {
        return {
          type: 'key',
          value: 'Tab',
          nextIndex,
        }
      }
    }

    return null
  },
  '~': (ctx, i, s) => {
    return checkToTabout(ctx, i, s, 'delete', '~', true)
  },
  '=': (ctx, i, s) => {
    return checkToTabout(ctx, i, s, 'highlight', '=', true)
  },

}
