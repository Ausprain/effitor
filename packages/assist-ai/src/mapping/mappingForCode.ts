// import type { Et } from '@effitor/core'

import { Et } from '@effitor/core'

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
    return null
  },
}
