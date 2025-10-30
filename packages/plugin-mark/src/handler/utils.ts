import { type Et, etcode } from '@effitor/core'

import { MarkType, nestedMarkMap } from '../config'
import { ET_MARK_CODE, EtMarkElement } from '../EtMarkElement'
import { nestedChecker } from '../util'

export const checkAllowMarkEffect = (anchorEtElement: Et.EtElement) => {
  return etcode.checkIn(anchorEtElement, ET_MARK_CODE)
}
export const checkAllowNested = (anchorEtElement: Et.EtElement, markType: MarkType) => {
  if (!nestedChecker.check(anchorEtElement, markType)) {
    return false
  }
  if (!EtMarkElement.is(anchorEtElement)) {
    return true
  }
  return nestedMarkMap[anchorEtElement.markType as MarkType]?.includes(markType)
}
