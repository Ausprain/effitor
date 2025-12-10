import dompurify from 'dompurify'

import '@effitor/themes/default/index.css'
import { EtTableCellElement } from '@effitor/plugin-table'
import { Effitor, EtParagraphElement, type Et } from 'effitor'
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

export const createEditor = async ({
  config = {},
  extraPlugins = [],
}: {
  config?: Partial<Et.EditorConfig>
  extraPlugins?: Et.EditorPlugin[]
}) => {
  const editor = new Effitor({
    htmlOptions: {
      sanitizer: html => dompurify.sanitize(html),
    },
    config: {
      AUTO_CREATE_FIRST_PARAGRAPH: false,
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
        needMarkEffectElementCtors: [EtTableCellElement, EtParagraphElement],
      }),
      useLinkPlugin(),
      useListPlugin(),
      useMediaPlugin(),
      useTablePlugin(),
      useBlockquotePlugin(),
      await useCodePlugin(),
      ...extraPlugins,
      {
        name: 'patch_pg_hs',
        effector: {
          enforce: 'post',
          onMounted(ctx) {
            // 段落组热字符串没有提示, 在这里加上
            ctx.hotstringManager.allHotstrings().forEach((hs) => {
              if (hs.hotstring === 'pg.') {
                Object.assign(hs, {
                  title: '段落组',
                })
              }
              else if (hs.hotstring === 'pg2.') {
                Object.assign(hs, {
                  title: '段落组(2栏)',
                })
              }
              else if (hs.hotstring === 'pg3.') {
                Object.assign(hs, {
                  title: '段落组(3栏)',
                })
              }
            })
          },
        },
      },
    ],
  })

  return editor
}
