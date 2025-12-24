import { cmd, type Et } from '@effitor/core'
import { HtmlCharEnum } from '@effitor/shared'

import { HeadingEnum } from '../config'
import { inHeadingHandler, replaceParagraphWithHeading } from '../handler'

const parseLevel = (data: string): Et.HeadingLevel | null => {
  if (data.length > 6) {
    return null
  }
  data = data.trim().replaceAll(HtmlCharEnum.ZERO_WIDTH_SPACE, '')
  let level = null
  if (/^#{1,6}$/.test(data)) {
    level = data.length
  }
  else if (/^#[1-6]$/.test(data)) {
    level = parseInt(data[1] as string)
  }
  return level as Et.HeadingLevel | null
}
const checkAtxToHeading = (ctx: Et.UpdatedContext) => {
  // import.meta.env.DEV && console.error('check heading start')
  if (!ctx.selection.isCollapsed || !ctx.focusEtElement || !ctx.selection.anchorText) return false
  // 只在纯段落内生效
  if (!ctx.isPlainParagraph(ctx.focusParagraph) || ctx.focusParagraph.childElementCount > 1) return false
  const level = parseLevel(ctx.focusParagraph.textContent)
  if (!level) {
    return false
  }
  return replaceParagraphWithHeading(ctx, {
    level,
    paragraph: ctx.focusParagraph,
  })
}

const checkChangeHeadingLevel = (ctx: Et.UpdatedContext, hEl: Et.EtHeading) => {
  const text = ctx.selection.anchorText
  if (!text || text.parentNode !== hEl) {
    return false
  }
  const level = parseLevel(hEl.textContent.slice(0, ctx.selection.anchorOffset))
  if (!level || level === hEl.headingLevel) {
    return false
  }
  ctx.commandManager.commitNextHandle(true)
  ctx.commandManager.pushHandleCallback(() => {
    ctx.commandManager.push(cmd.functional({
      meta: {
        heading: hEl,
        level,
      },
      execCallback() {
        const l = this.meta.heading.headingLevel
        this.meta.heading.headingLevel = this.meta.level
        this.meta.level = l
      },
      undoCallback(_) {
        this.execCallback(_)
      },
    })).handle()
  })
  return ctx.commandManager.handleUpdateText(text, 0, ctx.selection.anchorOffset, '', true)
}

export const beforeKeydownSolver: Et.KeyboardSolver = {
  ' ': (_ev, ctx) => checkAtxToHeading(ctx),
  'Enter': (_ev, ctx) => checkAtxToHeading(ctx),
  // heading 专有 keydown solver
  [HeadingEnum.ElName]: (ev, ctx) => {
    if (ev.key === 'Tab') {
      return ctx.preventAndSkipDefault(ev)
    }
    if (ev.key === ' ') {
      if (checkChangeHeadingLevel(ctx, ctx.commonEtElement)) {
        return ctx.preventAndSkipDefault(ev)
      }
    }
    else if (ev.key === 'Backspace'
      && ctx.selection.isCollapsed
      && ctx.selection.anchorOffset === 0
    ) {
      inHeadingHandler.regressHeadingToParagraph(ctx, {
        heading: ctx.commonEtElement,
      })
      return ctx.preventAndSkipDefault(ev)
    }
  },
}

export const keydownSolver: Et.KeyboardSolver = {

}
