import type { Et } from '@effitor/core'
import { cmd, cr, dom } from '@effitor/core'

export const checkInsertLink = (
  ctx: Et.EditorContext, tc: Et.ValidTargetCaret,
  link: { text: string, url: string, title: string },
) => {
  const url = link.url || ''
  if (!url) {
    return
  }
  const linkCtx = ctx.pctx.$link_ctx
  if (url && url.length > linkCtx.maxUrlLength) {
    ctx.assists.msg?.warn('链接超出最大允许长度.')
    return
  }
  if (!linkCtx.urlReg.test(url)) {
    ctx.assists.msg?.error('链接格式错误.')
    return
  }
  if (!tc.anchorEtElement.checkIn(ctx.schema.link.etType)) {
    ctx.assists.msg?.warn('当前位置不可插入链接.')
    return
  }
  const title = link.title || ''
  let text = link.text || url
  text = text.slice(0, linkCtx.maxNameLength).trim()
  const linkEl = ctx.schema.link.create(url, title, text)
  // 插入链接后, 使用 tabout 将光标移出链接节点
  ctx.commandManager.pushHandleCallback(() => {
    const tc = ctx.selection.getTargetCaret()
    if (tc) {
      ctx.getEtHandler(linkEl).tabout?.(ctx, tc)
    }
  })
  ctx.commandManager.commitNextHandle(true)
  return ctx.commonHandler.insertElement(linkEl, tc, cr.caretInEnd(linkEl))
}

export const markLinkHandler: Et.EffectHandler = {
  EinsertLink(ctx, { data, targetRange }) {
    if (!data || !targetRange.collapsed) {
      return
    }
    let link
    try {
      link = JSON.parse(data)
    }
    catch (_) {
      return
    }
    return checkInsertLink(ctx, targetRange.toTargetCaret(), link)
  },
  markLink(ctx, tc) {
    const out = dom.checkParseMarkdownReference('link', tc.container.data, tc.offset)
    if (!out) {
      return false
    }
    const { text, url, title, leftRemainText, rightRemainText } = out
    const linkEl = ctx.schema.link.create(url, title, text)

    const df = document.createDocumentFragment() as Et.Fragment
    if (leftRemainText) df.appendChild(new Text(leftRemainText))
    df.appendChild(linkEl)
    if (rightRemainText) df.appendChild(new Text(rightRemainText))

    const removeAt = cr.caretOutStart(tc.container)

    let destCaretRange: Et.CaretRange
    const cmds: Et.Command[] = [cmd.removeNode({
      node: tc.container,
      execAt: removeAt,
    })]
    if (df.childNodes.length === 1) {
      cmds.push(cmd.insertNode({
        node: linkEl,
        execAt: removeAt,
      }))
      // linkEl 是 uneditable 的, 但此时其没有父节点, 无法定位到其外末尾
      destCaretRange = cr.caretOutEndFuture(linkEl)
    }
    else {
      cmds.push(cmd.insertContent({
        content: df,
        execAt: removeAt,
      }))
      // todo ,这里插入片段, 光标可判断是否定位至后文本节点开头
      destCaretRange = cr.caretOutEndFuture(linkEl)
    }

    ctx.commandManager.pushHandleCallback(() => {
      const tc = ctx.selection.getTargetCaret()
      if (tc) {
        ctx.getEtHandler(linkEl).tabout?.(ctx, tc)
      }
    })
    ctx.commandManager.withTransaction(cmds, destCaretRange)
  },

}
