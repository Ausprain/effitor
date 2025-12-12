import type { Dropdown } from '@effitor/assist-dropdown'
import type { Et } from '@effitor/core'
import { h1Icon, h2Icon, h3Icon, h4Icon, h5Icon, h6Icon, HtmlCharEnum } from '@effitor/shared'

import { HeadingEnum } from './config'
import { inHeadingHandler, replaceParagraphWithHeading } from './handler'

const checkAtxToHeading = (ctx: Et.UpdatedContext) => {
  // import.meta.env.DEV && console.error('check heading start')
  if (!ctx.selection.isCollapsed || !ctx.focusEtElement || !ctx.selection.anchorText) return false
  // 只在纯段落内生效
  if (!ctx.isPlainParagraph(ctx.focusParagraph) || ctx.focusParagraph.childElementCount > 1) return false
  let data = ctx.focusParagraph.textContent
  if (data.length > 6) return false
  data = data.trim().replaceAll(HtmlCharEnum.ZERO_WIDTH_SPACE, '')
  let level = -1
  if (/^#{1,6}$/.test(data)) {
    level = data.length
  }
  else if (/^#[1-6]$/.test(data)) {
    level = parseInt(data[1] as string)
  }
  if (level === -1) return false
  return replaceParagraphWithHeading(ctx, {
    level: level as Et.HeadingLevel,
    paragraph: ctx.focusParagraph,
  })
}
const beforeKeydownSolver: Et.KeyboardKeySolver = {
  ' ': (_ev, ctx) => checkAtxToHeading(ctx),
  'Enter': (_ev, ctx) => checkAtxToHeading(ctx),
  'Tab': (_ev, ctx) => {
    if (ctx.focusEtElement.localName === HeadingEnum.ElName) {
      return true
    }
  },
}

const keydownSolver: Et.KeyboardSolver = {
  // heading 专有 keydown solver
  [HeadingEnum.ElName]: (ev, ctx) => {
    if (ev.key === 'Backspace'
      && ctx.selection.isCollapsed
      && ctx.selection.anchorOffset === 0
    ) {
      inHeadingHandler.regressHeadingToParagraph(ctx, {
        heading: ctx.commonEtElement,
      })
      return ctx.skipDefault()
    }
  },
}

export const headingEffector: Et.Effector = {
  beforeKeydownSolver,
  keydownSolver,
  onMounted(ctx) {
    // 注册 dropdown
    initHeadingDropdown(ctx)
  },
}

/* -------------------------------------------------------------------------- */
/*                                  dropdown                                  */
/* -------------------------------------------------------------------------- */
const initHeadingDropdown = (ctx: Et.EditorContext) => {
  const dropdown = ctx.assists.dropdown
  if (!dropdown) {
    return
  }
  dropdown.addMenuToDefaultContent(headingMenuForDropdown(ctx, dropdown), 0)
}

const headingMenuForDropdown = (ctx: Et.EditorContext, dropdown: Dropdown) => {
  const items = [
    [h1Icon(), (ctx: Et.EditorContext) => replaceCurrentParagraphWithHeading(ctx, 1), ['h1', 'heading1']],
    [h2Icon(), (ctx: Et.EditorContext) => replaceCurrentParagraphWithHeading(ctx, 2), ['h2', 'heading2']],
    [h3Icon(), (ctx: Et.EditorContext) => replaceCurrentParagraphWithHeading(ctx, 3), ['h3', 'heading3']],
    [h4Icon(), (ctx: Et.EditorContext) => replaceCurrentParagraphWithHeading(ctx, 4), ['h4', 'heading4']],
    [h5Icon(), (ctx: Et.EditorContext) => replaceCurrentParagraphWithHeading(ctx, 5), ['h5', 'heading5']],
    [h6Icon(), (ctx: Et.EditorContext) => replaceCurrentParagraphWithHeading(ctx, 6), ['h6', 'heading6']],
  ] as [SVGElement, (ctx: Et.EditorContext) => void, string[]][]
  const menu = dropdown.createMenu('heading', {
    items: items.map(([icon, onchosen, prefixes]) => dropdown.createMenuItem(icon, onchosen, {
      prefixes: prefixes,
    })),

    // 仅在纯段落中dropdown时显示heading菜单
    filter: {
      etType: 0,
      matchEtType: ctx.schema.paragraph.etType,
      unmatchEtType: ~ctx.schema.paragraph.etType,
    },
    prefixes: ['heading'],
  })

  return menu
}

/**
 * 在光标位置将当前段落转为标题, 原有内容转为纯文本
 */
export const replaceCurrentParagraphWithHeading = (ctx: Et.EditorContext, level: Et.HeadingLevel) => {
  // 不是纯段落, 无法转为标题; 不过不是段落应该会被filter过滤掉
  if (!ctx.isUpdated() || !ctx.isPlainParagraph(ctx.focusParagraph)) {
    return
  }
  // 校验段落长度, 避免将长段落转为标题
  const title = ctx.focusParagraph.textContent
  if (title.length > 50) {
    ctx.assists.msg?.info('Too many content to convert to heading.')
    return
  }
  return replaceParagraphWithHeading(ctx, {
    level,
    title,
    paragraph: ctx.focusParagraph,
  })
}

export const headingActions = {
  replaceCurrentParagraphWithHeading,
}
export type HeadingActionMap = typeof headingActions
