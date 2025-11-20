import type { Et } from '@effitor/core'
import { cmd, cr, dom } from '@effitor/core'
import { HtmlCharEnum } from '@effitor/shared'

import { MediaType } from './config'
import { parseMediaUrl } from './utils'

export const markMediaHandler: Et.EffectHandler = {
  markMedia(ctx, tc) {
    const out = dom.checkParseMarkdownReference('image', tc.container.data, tc.offset)
    if (!out) {
      return
    }
    const { url, title, text, leftRemainText, rightRemainText } = out
    const data = parseMediaUrl(url)
    const meta = {
      title,
      alt: '',
    }
    const media = ctx.pctx.$mediaPx
    let type: MediaType | undefined = void 0
    if (media.image.exts.has(data.ext)) {
      type = MediaType.Image
      meta.alt = text
      Object.assign(meta, media.image)
    }
    else if (media.audio?.exts.has(data.ext)) {
      type = MediaType.Audio
      Object.assign(meta, media.audio)
    }
    else if (media.video?.exts.has(data.ext)) {
      type = MediaType.Video
      Object.assign(meta, media.video)
    }
    if (!type) {
      return
    }

    const el = ctx.schema[type].create(url, meta)

    ctx.commandManager.commitNextHandle(true)
    let dest
    const df = ctx.createFragment()
    if (leftRemainText) {
      df.append(leftRemainText)
    }
    df.appendChild(el)

    if (rightRemainText) {
      const text = new Text(rightRemainText) as Et.Text
      df.appendChild(text)
      dest = cr.caret(text, 0)
    }
    else {
      const zws = new Text(HtmlCharEnum.ZERO_WIDTH_SPACE) as Et.Text
      df.appendChild(zws)
      dest = cr.caret(zws, 1)
    }
    ctx.commandManager.push(
      cmd.removeNode({ node: tc.container }),
      cmd.insertContent({ content: df, execAt: cr.caretOutStart(tc.container) }),
    )
    return ctx.commandManager.handleAndUpdate(dest)
  },
  insertMedia(ctx, { targetCaret, type, url, meta }) {
    const el = ctx.schema[type].create(url, meta)
    return insertMediaContents(ctx, targetCaret, [el])
  },

  insertMediaChunk(ctx, { targetCaret, type, chunk }) {
    const ctor = ctx.schema[type]

    const els = []
    for (const meta of chunk) {
      els.push(ctor.create(meta.url, meta))
    }
    return insertMediaContents(ctx, targetCaret, els)
  },
}

const insertMediaContents = (ctx: Et.EditorContext, targetCaret: Et.ValidTargetCaret, els: Et.EtEmbedment[]) => {
  if (els.length === 0) {
    return
  }
  const df = document.createDocumentFragment()
  df.append(...els)
  const zws = new Text(HtmlCharEnum.ZERO_WIDTH_SPACE) as Et.Text
  df.appendChild(zws)
  ctx.commandManager.commitNextHandle(true)
  ctx.commonHandler.insertContentsAtCaret(df, targetCaret, cr.caret(zws, 1))
}
