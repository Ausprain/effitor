import type { Et } from '@effitor/core'
import { useEffectorContext } from '@effitor/core'
import { h1Icon, h2Icon, h3Icon, h4Icon, h5Icon, h6Icon } from '@effitor/shared'

import { HeadingEnum } from './config'
import { headingHandler, inHeadingHandler, replaceParagraphWithHeading } from './handler'

const ectx = useEffectorContext('_et_$heading', {
  // 标题 handler 比较少, 直接挂到 ectx 上调用, 不注册到效应元素
  headingHandler,
  inHeadingHandler,
  checkAtxToHeading(ctx: Et.UpdatedContext) {
    // import.meta.env.DEV && console.error('check heading start')
    if (!ctx.selection.isCollapsed || !ctx.focusEtElement || !ctx.selection.anchorText) return false
    // 只在纯段落内生效
    if (!ctx.isPlainParagraph(ctx.focusParagraph) || ctx.focusParagraph.childNodes.length > 1) return false
    const data = ctx.focusParagraph.textContent
    if (data.length > 6) return false
    let level = -1
    if (/^#{1,6}$/.test(data)) {
      level = data.length
    }
    else if (/^#[1-6]$/.test(data)) {
      level = parseInt(data[1])
    }
    if (level === -1) return false
    return this.headingHandler.replaceParagraphWithHeading(ctx, {
      level: level as Et.HeadingLevel,
      paragraph: ctx.focusParagraph,
    })
  },

})

const beforeKeydownSolver: Et.KeyboardKeySolver = {
  ' ': (_ev, ctx) => ectx._et_$heading.checkAtxToHeading(ctx),
  'Enter': (_ev, ctx) => ectx._et_$heading.checkAtxToHeading(ctx),
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
      ectx._et_$heading.inHeadingHandler.regressHeadingToParagraph(ctx, {
        heading: ctx.commonEtElement,
      })
      return ctx.skipDefault()
    }
  },
}

export const headingEffector: Et.EffectorSupportInline = {
  inline: true,
  beforeKeydownSolver,
  keydownSolver,
  onMounted(ctx) {
    // todo 添加按钮到dropdown
    const dropdown = ctx.assists.dropdown
    if (!dropdown) {
      return
    }
    dropdown.addMenuToDefaultContent(headingMenuForDropdown(ctx, dropdown), 0)
  },
}

/* -------------------------------------------------------------------------- */
/*                                  dropdown                                  */
/* -------------------------------------------------------------------------- */

const headingMenuForDropdown = (ctx: Et.EditorContext, dropdown: Required<Et.EditorContext['assists']>['dropdown']) => {
  const items = [
    [h1Icon(), (ctx: Et.EditorContext) => toHeadingAtCaret(ctx, 1), ['h1', 'heading1']],
    [h2Icon(), (ctx: Et.EditorContext) => toHeadingAtCaret(ctx, 2), ['h2', 'heading2']],
    [h3Icon(), (ctx: Et.EditorContext) => toHeadingAtCaret(ctx, 3), ['h3', 'heading3']],
    [h4Icon(), (ctx: Et.EditorContext) => toHeadingAtCaret(ctx, 4), ['h4', 'heading4']],
    [h5Icon(), (ctx: Et.EditorContext) => toHeadingAtCaret(ctx, 5), ['h5', 'heading5']],
    [h6Icon(), (ctx: Et.EditorContext) => toHeadingAtCaret(ctx, 6), ['h6', 'heading6']],
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
const toHeadingAtCaret = (ctx: Et.EditorContext, level: Et.HeadingLevel) => {
  // 不是纯段落, 无法转为标题; 不过不是段落应该会被filter过滤掉
  if (!ctx.isUpdated() || !ctx.isPlainParagraph(ctx.focusParagraph)) {
    return
  }
  // 校验段落长度, 避免将长段落转为标题
  const title = ctx.focusParagraph.textContent
  if (title.length > 50) {
    ctx.assists.msg?.info('当前段落内容太长, 无法转为标题.')
    return
  }
  return replaceParagraphWithHeading(ctx, {
    level,
    title,
    paragraph: ctx.focusParagraph,
  })
}
