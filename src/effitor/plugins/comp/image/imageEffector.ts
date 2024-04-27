import { MIMETypeEnum, type Effitor } from '../../../@types'
import { dom } from "@/effitor/utils";
import { EtImageElement } from "./EtImageElement";


export const pasteImage: Effitor.Effector.ClipboardAction = (ev, ctx) => {
    // 有文本内容, 退出
    if (ev.clipboardData.getData(MIMETypeEnum.TEXT_PLAIN)) return false
    // 仅当clipboardData只有图片时粘贴图片
    const reader = new FileReader()
    reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        if (!dataUrl) return
        const img = new Image()
        img.src = dataUrl
        img.alt = 'pasted image'
        dom.dispatchInputEvent(ctx.root, 'beforeinput', {
            data: EtImageElement.create(img).outerHTML,
            inputType: 'insertFromPaste',
            targetRanges: [dom.staticFromRange(ctx.range)]
        })
    }
    for (const file of ev.clipboardData.files) {
        if (file.type.startsWith('image/')) {
            ev.preventDefault()
            reader.readAsDataURL(file)
            // 返回true跳过后续回调 并跳过默认行为
            return (ctx.skipDefault = true)
        }
    }
}