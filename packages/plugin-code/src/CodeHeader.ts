import type { Et } from '@effitor/core'
import { CssClassEnum, HtmlAttrEnum } from '@effitor/shared'

import { CodeEnum } from './config'
import type { CodeDecorateCallbacks } from './EtCodeElement'

export const codeHeader = (ctx: Et.EditorContext, cbs: CodeDecorateCallbacks) => {
  const header = document.createElement('div')
  const copyBtn = document.createElement('div')
  header.classList.add(CodeEnum.Class_Header)
  copyBtn.classList.add(CodeEnum.Class_Copy, CssClassEnum.BgItem)
  // copyBtn.title = 'Copy Code'
  copyBtn.setAttribute(HtmlAttrEnum.HintTitle, 'Copy Code')
  header.appendChild(copyBtn)

  copyBtn.onclick = () => {
    if (copyBtn.classList.contains(CodeEnum.Class_Copied)) {
      return
    }
    cbs.onCopy(ctx)
    copyBtn.classList.add(CodeEnum.Class_Copied)
    setTimeout(() => {
      copyBtn.classList.remove(CodeEnum.Class_Copied)
    }, 2000)
  }
  return header
}
