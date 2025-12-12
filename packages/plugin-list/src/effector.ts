import type { Dropdown } from '@effitor/assist-dropdown'
import type { Et } from '@effitor/core'
import { HtmlCharEnum, orderedListIcon, unorderedListIcon } from '@effitor/shared'

import { ListEnum, styleTypeMapping, unOrderedListStyle } from './config'
import type { EtListItemElement } from './EtListElement'
import { listHandler } from './handler/listHandler'

const beforeKeydownSolver: Et.KeyboardKeySolver = {
  ' ': (ev, ctx) => {
    const currP = ctx.focusParagraph
    if (!ctx.isPlainParagraph(currP)) {
      // 不是schema段落, 跳过
      return
    }
    const text = currP.textContent
    if (!text || text.length > 3) {
      return
    }
    const styleType = styleTypeMapping[text.replaceAll(HtmlCharEnum.ZERO_WIDTH_SPACE, '')]
    if (!styleType) {
      return
    }
    listHandler.replaceParagraphWithList(ctx, {
      listType: {
        styleType,
        ordered: !unOrderedListStyle.includes(styleType),
      },
      paragraph: currP,
    })
    return ctx.preventAndSkipDefault(ev)
  },
}

const keydownSolver: Et.KeyboardKeySolver = {
  Tab: (ev, ctx) => {
    const tc = ctx.selection.getTargetCaret()
    if (!tc || !ctx.schema.listItem.is(tc.anchorParagraph)) {
      return
    }
    if (ev.shiftKey) {
      ctx.getEtHandler(tc.anchorParagraph).listItemOutdent?.(ctx, {
        targetCaret: tc as Et.ValidTargetCaretWithParagraph<EtListItemElement>,
      })
      return ctx.preventAndSkipDefault(ev)
    }
    if (ctx.selection.isCaretAtParagraphStart) {
      ctx.getEtHandler(tc.anchorParagraph).listItemIndent?.(ctx, {
        targetCaret: tc as Et.ValidTargetCaretWithParagraph<EtListItemElement>,
      })
      return ctx.preventAndSkipDefault(ev)
    }
  },
  Enter: (ev, ctx) => {
    // alt+enter更改check状态
    if (!ev.altKey || ev.metaKey || ev.shiftKey || ev.ctrlKey || !ctx.schema.listItem.is(ctx.focusParagraph)) {
      return
    }
    const li = ctx.focusParagraph
    const checked = li.checked
    if (checked === null) {
      // null -> false
      li.checked = false
    }
    else if (checked) {
      // true -> null
      li.checked = null
    }
    else {
      // false -> true
      li.checked = true
    }
    return ctx.preventAndSkipDefault(ev)
  },
  ArrowUp: (ev, ctx) => {
    const tc = ctx.selection.getTargetCaret()
    if (!tc || !ctx.schema.listItem.is(tc.anchorParagraph)) {
      return
    }
    ctx.getEtHandler(tc.anchorParagraph).listItemMoveUp?.(ctx, {
      targetCaret: tc as Et.ValidTargetCaretWithParagraph<EtListItemElement>,
    })
    return ctx.preventAndSkipDefault(ev)
  },
  ArrowDown: (ev, ctx) => {
    const tc = ctx.selection.getTargetCaret()
    if (!tc || !ctx.schema.listItem.is(tc.anchorParagraph)) {
      return
    }
    ctx.getEtHandler(tc.anchorParagraph).listItemMoveDown?.(ctx, {
      targetCaret: tc as Et.ValidTargetCaretWithParagraph<EtListItemElement>,
    })
    return ctx.preventAndSkipDefault(ev)
  },
}

export const listEffector: Et.Effector = {
  beforeKeydownSolver,
  keydownSolver,

  onMounted(ctx) {
    // 初始化dropdown
    initListDropdown(ctx.assists.dropdown)
  },
}

/* -------------------------------------------------------------------------- */
/*                                  dropdown                                  */
/* -------------------------------------------------------------------------- */
const initListDropdown = (dropdown?: Dropdown) => {
  if (!dropdown) {
    return
  }
  dropdown.addBlockRichTextMenuItem(dropdown.createMenuItem(
    unorderedListIcon(),
    (ctx) => {
      // 通过dropdown插入无序列表
      replaceCurrentParagraphWithList(ctx, false)
    },
    {
      prefixes: ['list', 'unordered'],
    },
  )).addBlockRichTextMenuItem(dropdown.createMenuItem(
    orderedListIcon(),
    (ctx) => {
      // 通过dropdown插入有序列表
      replaceCurrentParagraphWithList(ctx, true)
    },
    {
      prefixes: ['list', 'ordered'],
    },
  ))
}

export const replaceCurrentParagraphWithList = (ctx: Et.EditorContext, ordered: boolean) => {
  if (!ctx.focusParagraph || !ctx.isPlainParagraph(ctx.focusParagraph)) {
    return
  }
  return listHandler.replaceParagraphWithList(ctx, {
    listType: {
      ordered,
      styleType: ordered ? ListEnum.Default_Ordered_Style_Type : ListEnum.Default_Unordered_Style_Type,
    },
    paragraph: ctx.focusParagraph,
    moveContents: true,
  })
}

export const listActions = {
  replaceCurrentParagraphWithList,
}
export type ListActionMap = typeof listActions
