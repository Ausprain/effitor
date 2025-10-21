import { useDialogAssist } from '@effitor/assist-dialog'
import { useDropdownAssist } from '@effitor/assist-dropdown'
import { usePopupAssist } from '@effitor/assist-popup'
import { Effitor } from '@effitor/core'

import { useMediaPlugin } from './src'
import { CreateImageOptions } from './src/config'

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
                        if (Date.now() - start > 1025000) {
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
  ],
})

const host = document.getElementById('effitor-host') as HTMLDivElement
editor.mount(host)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.ctx = editor.context
