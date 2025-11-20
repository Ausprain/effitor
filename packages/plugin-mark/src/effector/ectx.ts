import type { Et } from '@effitor/core'
import { useEffectorContext } from '@effitor/core'

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

export const ectx = useEffectorContext('$markEx', {
  checkInsertMark,
  checkFormatMark,

  // /**
  //  * 判断一个节点是否为 EtMarkElement
  //  */
  // isMarkElement: (node: Et.NodeOrNull): node is EtMarkElement => {
  //   return node?.localName === EtMarkElement.elName
  // },
  // /**
  //  * 判断是否为空 mark节点
  //  */
  // isTempMarkElement: (el: EtMarkElement): boolean => el.textContent === '\u200b',

})
