import dompurify from 'dompurify'

import '@effitor/themes/default.min.css'
import { Effitor, type Et } from 'effitor'
import {
  useCounterAssist,
  useDialogAssist,
  useDropdownAssist,
  useMessageAssist,
  usePopupAssist,
} from 'effitor/assists'
import {
  useBlockquotePlugin,
  useCodePlugin,
  useHeadingPlugin,
  useLinkPlugin,
  useListPlugin,
  useMarkPlugin,
  useMediaPlugin,
  useTablePlugin,
} from 'effitor/plugins'
import { EtTableCellElement } from '@effitor/plugin-table'
import { EtListItemElement } from '@effitor/plugin-list'

export const createEditor = async ({
  config = {},
  extraPlugins = [],
}: {
  config?: Partial<Et.EditorConfig>
  extraPlugins?: Et.EditorPlugin[]
}) => {
  return new Effitor({
    htmlOptions: {
      sanitizer: html => dompurify.sanitize(html),
    },
    config: {
      // AUTO_CREATE_FIRST_PARAGRAPH: false,
      ...config,
    },
    assists: [
      useCounterAssist(),
      useDialogAssist(),
      useDropdownAssist(),
      useMessageAssist(),
      usePopupAssist(),
    ],
    plugins: [
      useHeadingPlugin(),
      useMarkPlugin({
        needMarkEffectElementCtors: [EtTableCellElement, EtListItemElement],
      }),
      useLinkPlugin(),
      useListPlugin(),
      useMediaPlugin(),
      useTablePlugin(),
      useBlockquotePlugin(),
      await useCodePlugin(),
      ...extraPlugins,
    ],
  })
}
