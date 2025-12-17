import type { Et } from '@effitor/core'

import type { MarkdownTextMapping, MarkdownTextMappingFnResult } from '../config'

const checkInUnorderedListHead = (ctx: Et.EditorContext, i: number, s: string): MarkdownTextMappingFnResult => {
  if (s[i + 1] !== ' ' || ctx.focusParagraph?.localName !== 'et-li' || ctx.focusParagraph.textContent.length > 1) {
    return null
  }
  return () => i + 2
}
const checkInOrderedListHead = (ctx: Et.EditorContext, i: number, s: string): MarkdownTextMappingFnResult => {
  if (ctx.focusParagraph?.localName !== 'et-li' || ctx.focusParagraph.textContent.length > 1) {
    return null
  }
  return checkIsValidOrdered(i, s)
}
const checkIsValidOrdered = (i: number, s: string) => {
  const j = s.indexOf('. ', i)
  if (j === -1) {
    return null
  }
  const val = parseInt(s.slice(i, j))
  if (isNaN(val)) {
    return null
  }
  return () => j + 2
}
const indentToTab = (ctx: Et.EditorContext, indent: number) => {
  indent = Math.floor(indent / 4)
  for (let j = 0; j < indent; j++) {
    ctx.assists.ai.typeKey({ key: 'Tab', code: 'Tab' })
  }
}

export const mappingForList: MarkdownTextMapping = {
  '-': checkInUnorderedListHead,
  '*': checkInUnorderedListHead,
  '1': checkInOrderedListHead,
  '2': checkInOrderedListHead,
  '3': checkInOrderedListHead,
  '4': checkInOrderedListHead,
  '5': checkInOrderedListHead,
  '6': checkInOrderedListHead,
  '7': checkInOrderedListHead,
  '8': checkInOrderedListHead,
  '9': checkInOrderedListHead,
  '\n': (ctx, i, s) => {
    // li 末尾 \n\n -> list结束
    const n = s[i + 1]
    if (n === '\n') {
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
  ' ': (ctx, i, s) => {
    if (i !== 0 || s[i - 1] !== '\n'
      || ctx.focusParagraph?.localName !== 'et-li'
    ) {
      return null
    }
    // 处理缩进情况
    let indent = 1
    while (s[i + 1] === ' ') {
      i++
      indent++
    }
    const nCode = s[i + 1]?.charCodeAt(0)
    if (!nCode) {
      return null
    }
    if (nCode === 0x2a /** * */ || nCode === 0x2d /** - */) {
      if (s[i + 2] !== ' ') {
        return null
      }
      return () => {
        indentToTab(ctx, indent)
        return i + 3
      }
    }
    if (nCode >= 0x30 && nCode <= 0x39) {
      const check = checkIsValidOrdered(i, s)
      if (!check) {
        return null
      }
      return () => {
        indentToTab(ctx, indent)
        return check()
      }
    }
    return null
  },
}
