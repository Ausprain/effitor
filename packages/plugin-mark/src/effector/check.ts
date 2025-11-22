import type { Et } from '@effitor/core'

import { MarkType } from '../config'

export const checkInsertMark = (ctx: Et.EditorContext, markType: MarkType, checkRemoveMarkChar = true) => {
  return !!ctx.commonEtElement && ctx.effectInvoker.invoke(
    ctx.commonEtElement, 'checkInsertMark', ctx, {
      markType,
      checkRemoveMarkChar,
    },
  )
}

export const checkFormatMark = (ctx: Et.EditorContext, markType: MarkType) => {
  return !!ctx.commonEtElement && ctx.effectInvoker.invoke(
    ctx.commonEtElement, 'checkFormatMark', ctx, { markType },
  )
}
