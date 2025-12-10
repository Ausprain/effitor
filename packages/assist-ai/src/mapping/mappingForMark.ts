import type { MarkdownTextMapping } from '../config'

interface MarkElement {
  localName: 'et-mark'
  markType: 'bold' | 'italic' | 'highlight' | 'code'
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
    const el = ctx.focusEtElement as MarkElement | null
    if (s[i + 1] === '*'
      ? (el?.localName === 'et-mark' && el.markType === 'bold')
      : (el?.localName === 'et-mark' && el.markType === 'italic' && s[i - 1] !== '*')
    ) {
      return {
        value: 'Tab',
        type: 'key',
        nextIndex: i + 2,
      }
    }
    return null
  },
  '=': (ctx, i, s) => {
    const el = ctx.focusEtElement as MarkElement | null
    if (s[i + 1] === '=' && el?.localName === 'et-mark' && el.markType === 'highlight') {
      return {
        value: 'Tab',
        type: 'key',
        nextIndex: i + 2,
      }
    }
    return null
  },
  '`': (ctx, i, s) => {
    const el = ctx.focusEtElement as MarkElement | null
    if (s[i - 1] !== '`' && el?.localName === 'et-mark' && el.markType === 'code') {
      return {
        value: 'Tab',
        type: 'key',
        nextIndex: i + 1,
      }
    }
    return null
  },
}
