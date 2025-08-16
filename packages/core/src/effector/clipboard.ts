import { Et } from '..'
import { type EffectElement, etcode } from '../element'
import { HtmlCharEnum, MIMETypeEnum } from '../enums'
import { dom } from '../utils'

type NotEmptyClipboardEvent = Et.ClipboardEvent & { clipboardData: DataTransfer }
type EmptyClipboardEvent = Et.ClipboardEvent & { clipboardData: null }

export const getCopyListener = (ctx: Et.UpdatedContext, callback?: Et.ClipboardAction) => {
  return (ev: EmptyClipboardEvent | NotEmptyClipboardEvent) => {
    // import.meta.env.DEV && console.log('copy', ev.clipboardData?.types, ev)

    // 非trusted的copy事件不会产生任何作用, 直接返回
    if (!ev.isTrusted || !ev.clipboardData) return
    ev.preventDefault() // preventDefault 以更改clipboardData的内容

    callback?.(ev, ctx)
    if (ctx.skipDefault) return (ctx.skipDefault = false)

    copySelectionToClipboard(ctx, ev.clipboardData)
  }
}
export const getCutListener = (ctx: Et.UpdatedContext, callback?: Et.ClipboardAction) => {
  return (ev: EmptyClipboardEvent | NotEmptyClipboardEvent) => {
    // import.meta.env.DEV && console.log('cut', ev.clipboardData?.types, ev)
    if (ctx.selection.isCollapsed) {
      // 光标状态下，直接删除整行
      // fix. chrome 还不支持 inputType = deleteEntireSoftLine 的beforeinput事件， inputType会被解析为""
      // sol. 用data传，在beforeinput中解析
      return ctx.dispatchInputEvent('beforeinput', {
        inputType: 'deleteEntireSoftLine',
        data: 'deleteEntireSoftLine',
      })
    }
    if (!ev.clipboardData) return
    ev.preventDefault()

    callback?.(ev, ctx)
    if (ctx.skipDefault) return (ctx.skipDefault = false)

    copySelectionToClipboard(ctx, ev.clipboardData)
    ctx.dispatchInputEvent('beforeinput', {
      inputType: 'deleteByCut',
      data: null,
      // TODO 交由 handler 判断删除范围
    //   targetRanges: [ctx.selection.range],
    })
  }
}
export const getPasteListener = (ctx: Et.UpdatedContext, callback?: Et.ClipboardAction) => {
  return (ev: EmptyClipboardEvent | NotEmptyClipboardEvent) => {
    if (!ev.clipboardData) return
    // 判断是否粘贴编辑器复制内容
    const etHtml = ev.clipboardData.getData(MIMETypeEnum.ET_TEXT_HTML)
    // 否则尝试调用插件回调
    if (!etHtml) {
      callback?.(ev, ctx)
      if (ctx.skipDefault) return (ctx.skipDefault = false)
    }
    // 粘贴纯文本
    const data = etHtml || ev.clipboardData.getData('text/plain')
    // 接管默认粘贴行为，使用data粘贴数据 (html)
    ctx.dispatchInputEvent('beforeinput', {
      data: data,
      inputType: 'insertFromPaste',
    //   targetRanges: [ctx.selection.staticRange],
    })
    return ev.preventDefault()
  }
}

/**
 * 复制`or`剪切时添加数据到clipboardData
 */
const copySelectionToClipboard = (ctx: Et.UpdatedContext, clipboardData: Et.DataTransfer) => {
  const fragment = ctx.selection.cloneContents()
  const etElList: EffectElement[] = []
  dom.traverseNode(fragment, void 0, {
    whatToShow: NodeFilter.SHOW_ELEMENT,
    filter(el) {
      if (etcode.check(el)) {
        etElList.push(el)
        dom.removeStatusClassForEl(el)
      }
      return 3 /** NodeFilter.FILTER_SKIP */
    },
  })

  clipboardData.setData('text/plain', ctx.selection.selectedTextContent.replace(HtmlCharEnum.ZERO_WIDTH_SPACE, ''))
  clipboardData.setData(MIMETypeEnum.ET_TEXT_HTML, dom.fragmentToHTML(fragment))
  etElList.forEach(el => el.replaceToNativeElement?.())
  clipboardData.setData('text/html', dom.fragmentToHTML(fragment).replace(HtmlCharEnum.ZERO_WIDTH_SPACE, ''))
}
