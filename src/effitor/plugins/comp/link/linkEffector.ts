import { Et } from "@/effitor";
import { defaultConfig } from "@/effitor/config";
import { dom } from "@/effitor/utils";
import { EtLinkElement } from "./EtLinkElement";


export const pasteLink: Et.ClipboardAction = (ev, ctx) => {
    const html = ev.clipboardData.getData(Et.MIMEType.TEXT_HTML)
    if (!html || html.length > defaultConfig.ALLOW_LINK_URL_MAX_LENGTH) return
    const fragment = ctx.range.createContextualFragment(html)
    const alink = fragment.querySelector('a')
    if (!alink) return
    const etlink = EtLinkElement.create(alink)
    dom.dispatchInputEvent(ctx.root, 'beforeinput', {
        data: etlink.outerHTML,
        inputType: 'insertFromPaste',
        targetRanges: [dom.staticFromRange(ctx.range)]
    })
    ev.preventDefault()
    return (ctx.skipDefault = true)
}