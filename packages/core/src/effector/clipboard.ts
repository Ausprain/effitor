/**
 * 当effitor完全接管输入行为, 即preventDefault 所有 keydown 事件时,
 * 无法获取 isTrusted 的剪切板事件, 受浏览器安全限制, 非 trusted 的
 * 剪切板事件将不会有任何效果, 因此需要额外实现剪切板功能
 */

import { BuiltinConfig, HtmlCharEnum, MIMETypeEnum } from '@effitor/shared'

import type { Et } from '../@types'
import { fragmentUtils } from '../handler'
import { dom } from '../utils'

type NotEmptyClipboardEvent = Et.ClipboardEvent & { clipboardData: DataTransfer }
type EmptyClipboardEvent = Et.ClipboardEvent & { clipboardData: null }

export const getCopyListener = (ctx: Et.EditorContext, callback?: Et.ClipboardAction) => {
  return (ev: EmptyClipboardEvent | NotEmptyClipboardEvent) => {
    // import.meta.env.DEV && console.log('copy', ev.clipboardData?.types, ev)
    // 非trusted的copy事件不会产生任何作用, 直接返回
    if (!ev.isTrusted || !ev.clipboardData || !ctx.isUpdated()) return
    ev.preventDefault() // preventDefault 以更改clipboardData的内容

    callback?.(ev, ctx)
    if (ctx.defaultSkipped) return false

    copySelectionToClipboard(ctx, ev.clipboardData)
  }
}
export const getCutListener = (ctx: Et.EditorContext, callback?: Et.ClipboardAction) => {
  return (ev: EmptyClipboardEvent | NotEmptyClipboardEvent) => {
    // import.meta.env.DEV && console.log('cut', ev.clipboardData?.types, ev)
    if (!ev.isTrusted || !ev.clipboardData || !ctx.isUpdated()) return
    ev.preventDefault()

    if (ctx.selection.isCollapsed) {
      // 选区 collapsed状态下，复制当前行并删除
      ctx.selection.selectSoftLine()
      if (!ctx.selection.rawEl) {
        ctx.forceUpdate()
      }
    }
    callback?.(ev, ctx)
    if (ctx.defaultSkipped) return false

    copySelectionToClipboard(ctx, ev.clipboardData)
    ctx.body.dispatchInputEvent('beforeinput', {
      inputType: 'deleteByCut',
    })
  }
}
export const getPasteListener = (ctx: Et.EditorContext, callback?: Et.ClipboardAction) => {
  return (ev: EmptyClipboardEvent | NotEmptyClipboardEvent) => {
    if (!ev.isTrusted || !ev.clipboardData || !ctx.isUpdated()) return
    // for (const type of ev.clipboardData.types) {
    //   console.log(type, ev.clipboardData.getData(type))
    // }
    ev.preventDefault()
    // 判断是否粘贴编辑器复制内容
    const etHtml = ev.clipboardData.getData(MIMETypeEnum.ET_TEXT_HTML)
    if (etHtml && !ctx.selection.rawEl) {
      // 使用内置隐藏粘贴行为
      const res = ctx.effectInvoker.invoke(
        ctx.commonEtElement,
        BuiltinConfig.INSERT_FROM_ET_HTML as 'E',
        ctx,
        etHtml,
      )
      if (res) {
        // 粘贴成功，发送 input 事件
        ctx.body.dispatchInputEvent('input', {
          inputType: 'insertFromPaste',
        })
      }
      return
    }
    // 否则尝试调用插件回调
    callback?.(ev, ctx)
    if (ctx.defaultSkipped) return false
    // 接管默认粘贴行为
    ctx.body.dispatchInputEvent('beforeinput', {
      inputType: 'insertFromPaste',
      dataTransfer: ev.clipboardData,
    })
  }
}

/**
 * 复制`or`剪切时添加数据到clipboardData
 */
const copySelectionToClipboard = (ctx: Et.UpdatedContext, clipboardData: Et.DataTransfer) => {
  if (ctx.selection.isCollapsed) {
    return
  }
  clipboardData.setData('text/plain', ctx.selection.selectedTextContent.replace(HtmlCharEnum.ZERO_WIDTH_SPACE, ''))
  if (ctx.selection.rawEl) {
    return
  }
  const etFragment = ctx.selection.cloneContents()
  const htmlFragment = etFragment.cloneNode(true)
  fragmentUtils.onCopyToEtHTML(ctx, etFragment)
  fragmentUtils.onCopyToNativeHTML(ctx, htmlFragment)
  clipboardData.setData(MIMETypeEnum.ET_TEXT_HTML, dom.fragmentToHTML(etFragment))
  clipboardData.setData('text/html', dom.fragmentToHTML(htmlFragment).replace(HtmlCharEnum.ZERO_WIDTH_SPACE, ''))
}
