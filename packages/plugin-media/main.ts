import { useDialogAssist } from '@effitor/assist-dialog'
import { useDropdownAssist } from '@effitor/assist-dropdown'
import { usePopupAssist } from '@effitor/assist-popup'
import { Effitor } from '@effitor/core'

import { useMediaPlugin } from './src'
import { CreateImageOptions, MediaType } from './src/config'

const editor = new Effitor({
  plugins: [
    useDialogAssist(),
    useDropdownAssist(),
    usePopupAssist(),
    useMediaPlugin({
      image: {
        onfileselected(files) {
          const opts: CreateImageOptions[] = []
          for (const file of files) {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            opts.push({
              url: new Promise((resolve) => {
                reader.onloadend = async () => {
                  const start = Date.now()
                  await (async () => {
                    return new Promise<void>((resolve) => {
                      const it = setInterval(() => {
                        // 添加一个延迟，模拟加载大文件效果
                        if (Date.now() - start > 2000) {
                          resolve()
                          clearInterval(it)
                        }
                      }, 500)
                    })
                  })()
                  resolve(reader.result as string)
                }
              }),
              alt: file.name,
            })
          }
          return opts
        },
      },
      audio: true,
      video: true,
    }),
    {
      name: 'media-test',
      effector: {
        keydownSolver: {
          // cmd + k to insert media, just for test
          K: (ev, ctx) => {
            const tc = ctx.selection.getTargetCaret()
            if (!ev.metaKey || !tc || !ctx.focusParagraph) {
              return
            }
            if (ctx.effectInvoker.invoke(ctx.focusParagraph, 'insertMedia', ctx, {
              targetCaret: tc,
              type: MediaType.Video,
              url: `/tmp/media.mp4`,
              meta: ctx.pctx.$mediaPx.video ?? {},
            })) {
              ctx.preventAndSkipDefault(ev)
            }
          },
        },
      },
    },
  ],
})

const host = document.getElementById('effitor-host') as HTMLDivElement
editor.mount(host)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.ctx = editor.context
