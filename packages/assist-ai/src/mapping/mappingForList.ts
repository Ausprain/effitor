import type { Et } from '@effitor/core'

import type { MarkdownTextMapping } from '../config'

export const mappingForList: MarkdownTextMapping = {
  '\n': (ctx, i, s) => {
    // li 末尾 \n\n -> list结束
    const n = s[i + 1]
    if (n === '\n' || n === undefined) {
      if (ctx.focusEtElement?.localName === 'et-li') {
        return (_ctx: Et.EditorContext) => {
          _ctx.commonHandler.appendParagraph(null, { newP: ctx.createPlainParagraph() })
          return i + 2
        }
      }
    }
    // 无序列表
    else if ((n === '-' || n === '*') && s[i + 2] === ' ') {
      if (ctx.focusEtElement?.localName === 'et-li') {
        return {
          value: 'Enter',
          type: 'key',
          nextIndex: i + 3,
        }
      }
    }
    // 有序列表
    else {
      for (let j = 1; j < 5; j++) {
        if (s[i + j] === '.') {
          if (s[i + j + 1] === ' ' && Number.isInteger(Number(s.slice(i, i + j)))) {
            return {
              value: 'Enter',
              type: 'key',
              nextIndex: i + j + 2,
            }
          }
          break
        }
      }
    }
    return null
  },
}
