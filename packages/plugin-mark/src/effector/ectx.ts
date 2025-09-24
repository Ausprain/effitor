import { Et, useEffectorContext } from '@effitor/core'

import { MarkEnum, markerMap, MarkType } from '../config'

export const ectx = useEffectorContext(MarkEnum.CtxKey, {
  checkInsertMarkNode: (ctx: Et.EditorContext, markType: MarkType) => {
    return !!ctx.commonEtElement && ctx.effectInvoker.invoke(
      ctx.commonEtElement, 'checkInsertMarkNode', ctx, {
        markType,
        removeMarkerChars: markerMap[markType].marker.length > 1 ? markerMap[markType].char : undefined,
      },
    )
  },
  checkFormatMark: (ctx: Et.EditorContext, markType: MarkType) => {
    return !!ctx.commonEtElement && ctx.effectInvoker.invoke(
      ctx.commonEtElement, 'checkFormatMark', ctx, { markType },
    )
  },

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
