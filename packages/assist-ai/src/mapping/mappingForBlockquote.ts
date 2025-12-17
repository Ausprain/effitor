import { dom, type Et } from '@effitor/core'

import type { MarkdownTextMapping } from '../config'

const blockquoteDepth = (ctx: Et.EditorContext) => {
  if (!ctx.focusParagraph) {
    return 0
  }
  let d = 0
  for (const p of ctx.body.outerParagraphs(ctx.focusParagraph)) {
    if (p && ctx.schema.blockquote?.is(p) && !p.dataset.type?.startsWith('pg')) {
      d++
    }
  }
  return d
}

const checkInBlockquote = (ctx: Et.EditorContext) => {
  return ctx.schema.blockquote?.is(ctx.focusParagraph?.parentNode)
}

export const mappingForBlockquote: MarkdownTextMapping = {
  '>': (ctx, i, s) => {
    if (s[i + 1] !== ' ') {
      return null
    }
    if (ctx.isPlainParagraph(ctx.focusParagraph) && dom.isEmptyContentNode(ctx.focusParagraph)) {
      if (s[i + 2] === '[') {
        return null
      }
      const depth = blockquoteDepth(ctx)
      if (!depth) {
        return () => {
          ctx.assists.ai.typeText('>')
          ctx.assists.ai.typeKey({ key: 'Enter', code: 'Enter' })
          return i + 2
        }
      }
      let k = i + 2
      for (let j = 1; j < depth; j++) {
        if (s[k] === '>' && s[k + 1] === ' ') {
          if (s[k + 2] === '[') {
            break
          }
          k += 2
          continue
        }
        break
      }
      if (s[k] === '>' && s[k + 1] === ' ' && s[k + 2] !== '[') {
        return () => {
          ctx.assists.ai.typeText('>')
          ctx.assists.ai.typeKey({ key: 'Enter', code: 'Enter' })
          return i + 2
        }
      }
      return () => k
    }
    return null
  },
  '\n': (ctx, i, s) => {
    if (s[i + 1] === '>') {
      if (!checkInBlockquote(ctx)) {
        return null
      }
      return {
        type: 'key',
        value: 'Enter',
        nextIndex: i + 2,
      }
    }
    if (!checkInBlockquote(ctx)) {
      return null
    }
    // \n\n后续有内容，且不是\n 也不是>开头；插入顶层段落（退出 bq）
    if (s[i + 1] === '\n' && i + 2 < s.length && s[i + 2] !== '>' && s[i + 2] !== '\n') {
      return () => {
        ctx.commonHandler.appendParagraph(null, { topLevel: true })
        return i + 2
      }
    }
    return () => {
      while (s[i] === '\n') {
        i++
        ctx.assists.ai.typeKey({ key: 'Enter', code: 'Enter' })
      }
      return i
    }
  },
}
