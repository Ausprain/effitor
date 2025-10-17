import './augment'

import { type Et } from '@effitor/core'

import { listEffector } from './effector'
import { EtListElement, EtListItemElement } from './EtListElement'
import { inListHandler } from './handler/inListHandler'
import listCss from './index.css?raw'

export { EtListElement, EtListItemElement }

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ListPluginOptions {}

export const useListPlugin = (_options?: ListPluginOptions): Et.EditorPluginSupportInline => {
  return {
    name: '@effitor/plugin-list',
    cssText: listCss,
    effector: listEffector,
    elements: [EtListElement, EtListItemElement],
    registry(_ctxMeta, setSchema, extentEtElement) {
      setSchema({ list: EtListElement, listItem: EtListItemElement })
      extentEtElement(EtListItemElement, inListHandler, [])
    },
  }
}
