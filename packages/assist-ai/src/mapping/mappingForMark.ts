import type { Et } from '@effitor/core'

import type { MarkdownTextMapping } from '../config'

interface MarkElement {
  localName: 'et-mark'
  markType: 'bold' | 'italic' | 'highlight' | 'code' | 'delete'
}

const checkToTabout = (ctx: Et.EditorContext, i: number, s: string, type: MarkElement['markType'], char: string, dbl: boolean) => {
  const el = ctx.focusEtElement as MarkElement | null
  if (el?.localName !== 'et-mark' || el.markType !== type) {
    return null
  }
  if (dbl ? (s[i + 1] === char) : (s[i - 1] !== char)) {
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
    return checkToTabout(ctx, i, s, 'code', '`', false)
  },
  '~': (ctx, i, s) => {
    return checkToTabout(ctx, i, s, 'delete', '~', true)
  },
  '=': (ctx, i, s) => {
    return checkToTabout(ctx, i, s, 'highlight', '=', true)
  },

}
