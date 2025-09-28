import type { Et } from '@effitor/core'

import { EtHeadingElement } from './element'

export const headingHandler: Et.EffectHandler & Pick<Required<Et.EffectHandler>, 'checkAtxToHeading'> = {
  checkAtxToHeading: (ctx, { level, paragraph }) => {
    if (!ctx.isUpdated()) return false
    const heading = EtHeadingElement.create(level)
    return ctx.commonHandlers.replaceNode(paragraph, heading, true)
  },
}

export const inHeadingHandler: Et.EffectHandler & Pick<Required<Et.EffectHandler>, 'regressHeadingToParagraph'> = {
  /** 触发前确保当前“段落”文本非空; 若为空，则应删除而非触发此effect */
  regressHeadingToParagraph: (ctx, { heading }) => {
    const newP = ctx.createPlainParagraph(false)
    newP.textContent = heading.textContent
    return ctx.commonHandlers.replaceNode(heading, newP, true)
  },
}
