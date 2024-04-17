import { Et, HtmlChar } from "../@types";
import type { EffectElement } from "../element";
import { dom } from "../utils";

type NotEmptyClipboardEvent = Et.EtClipboardEvent & { clipboardData: DataTransfer };
type EmptyClipboardEvent = Et.EtClipboardEvent & { clipboardData: null };

export const getCopyListener = (ctx: Et.EditorContext, callbacks: Et.ClipboardAction[]) => {
    return (ev: EmptyClipboardEvent | NotEmptyClipboardEvent) => {
        // console.log('copy', ev.clipboardData?.types, ev)
        if (!ev.clipboardData) return
        ev.preventDefault()

        for (const cb of callbacks) {
            // 回调返回true, 跳过后续
            if (cb(ev, ctx)) break
        }
        if (ctx.skipDefault) return (ctx.skipDefault = false)
        copySelectionToClipboard(ctx, ev.clipboardData)
    }
}
export const getCutListener = (ctx: Et.EditorContext, callbacks: Et.ClipboardAction[]) => {
    return (ev: EmptyClipboardEvent | NotEmptyClipboardEvent) => {
        // console.log('cut', ev.clipboardData?.types, ev)
        if (!ev.clipboardData) return
        ev.preventDefault()

        for (const cb of callbacks) {
            // 回调返回true, 跳过后续
            if (cb(ev, ctx)) break
        }
        if (ctx.skipDefault) return (ctx.skipDefault = false)
        copySelectionToClipboard(ctx, ev.clipboardData)
        dom.dispatchInputEvent(ctx.root, 'beforeinput', {
            inputType: 'deleteByCut',
            data: null,
            targetRanges: [dom.staticFromRange(ctx.range)]
        })
    }
}
export const getPasteListener = (ctx: Et.EditorContext, callbacks: Et.ClipboardAction[]) => {
    return (ev: EmptyClipboardEvent | NotEmptyClipboardEvent) => {
        // console.error('paste', ev.clipboardData?.types, ev)
        // // todo remove
        // for (const type of ev.clipboardData!.types) {
        //     console.log(type, ev.clipboardData!.getData(type))
        // }

        if (!ev.clipboardData) return
        // 判断是否粘贴编辑器复制内容
        const etHtml = ev.clipboardData.getData(Et.MIMEType.ET_COPY_METADATA)
        // 否则尝试调用插件回调
        if (!etHtml) {
            for (const cb of callbacks) {
                if (cb(ev, ctx)) break
            }
            if (ctx.skipDefault) return (ctx.skipDefault = false)
        }
        // 粘贴纯文本
        const data = etHtml || ev.clipboardData.getData('text/plain')
        // 接管默认粘贴行为，使用data粘贴数据
        dom.dispatchInputEvent(ctx.root, 'beforeinput', {
            data: data,
            inputType: 'insertFromPaste',
            // dataTransfer: ev.clipboardData,
            targetRanges: [dom.staticFromRange(ctx.range)]
        })
        return ev.preventDefault()


        // for (const cb of callbacks) {
        //     if (cb(ev, ctx)) break
        // }
        // if (ctx.skipDefault) return (ctx.skipDefault = false)

        // const fileReader = new FileReader()
        // fileReader.onload = (ev) => {           
        //     const img = document.createElement('img')
        //     img.src = ev.target!.result as string
        //     img.alt = 'pasted image'
        //     const dataTransfer = new DataTransfer()
        //     dataTransfer.setData(Et.MIMEType.TEXT_HTML, img.outerHTML)
        //     dom.dispatchInputEvent(ctx.root, 'beforeinput', {
        //         inputType: 'insertFromPaste',
        //         dataTransfer,
        //         targetRanges: [dom.staticFromRange(ctx.range)]
        //     })
        // }
        // for (const file of ev.clipboardData.files) {
        //     if (file.type.startsWith('image/')) {
        //         ev.preventDefault()
        //         fileReader.readAsDataURL(file)
        //     }
        //     // console.log(file.name, file.type, file.size)
        //     return
        // }
    }
}


/**
 * 复制`or`剪切时添加数据到clipboardData
 */
const copySelectionToClipboard = (ctx: Et.EditorContext, clipboardData: Et.EtDataTransfer) => {
    const sel = ctx.selection ?? (ctx.root.getSelection ? ctx.root.getSelection() : getSelection())
    const range = sel?.getRangeAt(0)
    if (!range || !sel) return

    const fragment = range.cloneContents()
    const etElList: EffectElement[] = []
    dom.traverseNode(fragment, (el) => {
        if (dom.isEtElement(el)) {
            etElList.push(el)
            if (el.elType === 'paragraph') {
                dom.removeStatusClassOfEl(el)
            }
        }
    }, {
        whatToShow: NodeFilter.SHOW_ELEMENT
    })

    clipboardData!.setData('text/plain', range.toString().replace(HtmlChar.ZERO_WIDTH_SPACE, ''))
    clipboardData!.setData(Et.MIMEType.ET_TEXT_HTML, dom.fragmentHTML(fragment))
    etElList.forEach(el => el.replaceToNativeElement?.())
    clipboardData!.setData('text/html', dom.fragmentHTML(fragment).replace(HtmlChar.ZERO_WIDTH_SPACE, ''))
}


// /**
//  * 尝试从clipboardData中提取出<a></a>, 判断是否粘贴链接
//  */
// const extractLink = (clipboard: DataTransfer): Et.EtLink | null => {
//     const htmlLinkPattern = /<!--StartFragment--><a.*?href="(http[s]?:\/\/[\w]+.*?)">(.+?)<\/a><!--EndFragment-->/
//     const html = clipboard.getData('text/html')
//     if (!html) return null
//     const linkMatch = htmlLinkPattern.exec(html)
//     if (!linkMatch) return null
//     return {
//         url: linkMatch[1],
//         name: linkMatch[2],
//     }
// }


// const defaultPasteHTML = (clipboard: DataTransfer) => {
//     let html = clipboard.getData(Et.MIMEType.ET_TEXT_HTML)
//     if (html === '') {
//         html = clipboard.getData(Et.MIMEType.TEXT_HTML)
//         if (html !== '') {
//             html = extractPlainHTMLFromPaste(html)
//         }
//         else {
//             html = clipboard.getData(Et.MIMEType.TEXT_PLAIN)
//         }
//     }
//     return html
// }



/**
 * 从粘贴的text/html文本中提取出纯HTML文本（去除所有属性以及不在允许范围内的节点）
 */
// const extractPlainHTMLFromPaste = (html: string, allowTags: (keyof HTMLElementTagNameMap)[] = [
//     'div', 'span', 'br'
// ]): string => {
//     const pattern = /<!--StartFragment-->(.*)<!--EndFragment-->/g
//     html = pattern.exec(html)?.[1] ?? ''
//     if (html === '') return ''
//     const fragment = document.createRange().createContextualFragment(html)
//     // 替换所有非允许节点; 在treewalker中替换会导致遍历终止
//     const repElList: HTMLElement[] = []
//     dom.traverseNode(fragment, (el) => {
//         if (!allowTags.includes(el.localName as any)) repElList.push(el)
//     }, {
//         whatToShow: NodeFilter.SHOW_ELEMENT
//     })
//     repElList.forEach(el => {
//         const repEl = dom.isBlockElement(el) ? document.createElement('div') : document.createElement('span')
//         repEl.append(...el.childNodes)
//         el.replaceWith(repEl)
//     })
//     html = dom.fragmentHTML(fragment)
//     // 去除所有属性
//     html = html.replace(/<(\w+-?)+( .+?)>/g, ($0, $1, $2) => {
//         return $0.replace($2, '')
//     })

//     return html
// }
