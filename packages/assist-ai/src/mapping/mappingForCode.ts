// import type { Et } from '@effitor/core'

import type { Et } from '@effitor/core'

import type { MarkdownTextMapping } from '../config'

const checkInCodeEnd = (ctx: Et.EditorContext, idx: number) => {
  return ctx.focusEtElement?.localName === 'et-code'
    ? (_ctx: Et.EditorContext) => {
        _ctx.commonHandler.appendParagraph(null)
        return idx
      }
    : null
}

export const mappingForCode: MarkdownTextMapping = {
  'beforeStart': (ctx) => {
    ctx.pctx.$codePx.autoComplete = false
    return null
  },
  'afterEnd': (ctx) => {
    ctx.pctx.$codePx.autoComplete = true
    return null
  },
  ' ': (_ctx, i, s) => {
    if (s[i - 1] === ' ') {
      return {
        type: 'data',
        value: ' ',
        nextIndex: i + 1,
      }
    }
    return null
  },
  '`': (ctx, i, s) => {
    if (s[i + 1] === '`' && s[i + 2] === '`') {
      return checkInCodeEnd(ctx, s[i + 3] === '\n' ? i + 4 : i + 3)
    }
    return null
  },
  '\n': (ctx, i, s) => {
    if (s[i + 1] === '`' && s[i + 2] === '`' && s[i + 3] === '`') {
      return checkInCodeEnd(ctx, s[i + 4] === '\n' ? i + 5 : i + 4)
    }
    if (ctx.focusEtElement?.localName === 'et-code') {
      return {
        type: 'data',
        value: '\n',
        nextIndex: i + 1,
      }
    }
    return null
  },
}
