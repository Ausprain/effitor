import type { Et } from '@effitor/core'
import { cr, createEffectHandle } from '@effitor/core'
import { HtmlCharEnum } from '@effitor/shared'

import { EtHeadingElement } from './element'

export const replaceParagraphWithHeading = createEffectHandle(
  'replaceParagraphWithHeading',
  (ctx, { level, title, paragraph }) => {
    let heading, dest
    if (title) {
      const text = new Text(title) as Et.Text
      heading = EtHeadingElement.create(level, text)
      dest = cr.caret(text, text.length)
    }
    // 没有内容, 即空段落转标题, 在标题中插入一个br, 不然光标可能无法聚焦其中
    else {
      if (ctx.editor.config.INSERT_BR_FOR_LINE_BREAK) {
        heading = EtHeadingElement.create(level, document.createElement('br'))
        dest = cr.caret(heading, 0)
      }
      else {
        const text = ctx.createText(HtmlCharEnum.ZERO_WIDTH_SPACE)
        heading = EtHeadingElement.create(level, text)
        dest = cr.caret(text, 1)
      }
    }
    ctx.commandManager.commitNextHandle(true)
    return ctx.commonHandlers.replaceNode(paragraph, heading, dest)
  },
)

export const headingHandler: Et.EffectHandler & Pick<Required<Et.EffectHandler>, 'replaceParagraphWithHeading'> = {
  replaceParagraphWithHeading,
}

export const inHeadingHandler: Et.EffectHandler & Pick<Required<Et.EffectHandler>, 'regressHeadingToParagraph'> = {
  /** 触发前确保当前“段落”文本非空; 若为空，则应删除而非触发此effect */
  regressHeadingToParagraph: (ctx, { heading }) => {
    const newP = ctx.createPlainParagraph(false)
    newP.textContent = heading.textContent
    return ctx.commonHandlers.replaceNode(heading, newP, true)
  },
}
