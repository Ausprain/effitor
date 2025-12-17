import dompurify from 'dompurify'

import { EtTableCellElement } from '@effitor/plugin-table'
import '@effitor/themes/default/index.css'
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

const createEditorOptions: Et.CreateEditorOptions = {
  htmlOptions: {
    sanitizer: html => dompurify.sanitize(html),
  },
  config: {
    AUTO_CREATE_FIRST_PARAGRAPH: false,
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
    {
      // 内置插件补丁
      name: 'plugin-patch',
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
          // text counter ui
          const countDiv = document.createElement('span')
          countDiv.style = 'position: absolute; top: 8px; right: 8px; font-size: 12px; color: #888;'
          ctx.root.appendChild(countDiv)
          ctx.assists.textCounter.setUpdatedCallback((count) => {
            countDiv.textContent = count.textCount.toString()
          })
        },
      },
    },
  ],
}

export const createEditor = ({
  editorStyle = '',
  config = {},
  extraPlugins = [],
}: {
  editorStyle?: string
  config?: Partial<Et.EditorConfig>
  extraPlugins?: Et.EditorPlugin[]
} = {}) => {
  return new Effitor({
    ...createEditorOptions,
    editorStyle,
    config: {
      ...createEditorOptions.config,
      ...config,
    },
    plugins: [...extraPlugins, ...(createEditorOptions.plugins || [])],
  })
}
