import { Effitor } from '@effitor/core'

import { useBlockquotePlugin } from './src'

const editor = new Effitor({
  plugins: [
    useBlockquotePlugin(),
  ],
})

const host = document.getElementById('effitor-host') as HTMLDivElement
editor.mount(host)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.ctx = editor.context

const md = `
> [!NOTE]
> 这是一条注意事项

> [!TIP]
> 这是一条提示事项

> [!IMPORTANT]
> 这是一条重要事项

> [!WARNING]
> 这是一条警告事项

> [!CAUTION]
> 这是一条警告事项
`

editor.fromMarkdown(md, false)
