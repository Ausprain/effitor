import { type Et, etcode } from '@effitor/core'

import { MarkType, nestedMarkMap } from '../config'
import { EtMarkElement, MARK_ET_TYPE } from '../EtMarkElement'
import { nestedChecker } from '../util'

export const checkAllowMark = (anchorEtElement: Et.EtElement, markType: MarkType) => {
  return checkAllowMarkEffect(anchorEtElement) && checkAllowNested(anchorEtElement, markType)
}

export const checkAllowMarkEffect = (anchorEtElement: Et.EtElement) => {
  return etcode.checkIn(anchorEtElement, MARK_ET_TYPE)
}
export const checkAllowNested = (anchorEtElement: Et.HTMLElement, markType: MarkType) => {
  if (!nestedChecker.check(anchorEtElement, markType)) {
    return false
  }
  if (!EtMarkElement.is(anchorEtElement)) {
    return true
  }
  return nestedMarkMap[anchorEtElement.markType as MarkType]?.includes(markType)
}
