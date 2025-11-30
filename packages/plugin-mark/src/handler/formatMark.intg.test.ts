import { cr, type Et } from '@effitor/core'
import { expect, test } from 'vitest'

import { clearHtmlAttrs, initEditor } from '../../../core/src/__tests__/shared.test'
import { useMarkPlugin } from '..'
import { MarkType } from '../config'

test('tryMarkElement', async () => {
  const html = `<et-p>hello<img>world<br></et-p>`
  const editor = await initEditor(html, {
    plugins: [useMarkPlugin()],
  })
  const ctx = editor.context
  const p = ctx.bodyEl.firstChild as Et.EtParagraphElement

  const ret = ctx.effectInvoker.invoke(p, 'checkFormatMark', ctx, {
    markType: MarkType.BOLD,
    targetElement: p,
  })

  expect(ret).toBe(true)
  expect(
    clearHtmlAttrs(p.innerHTML, ['style', 'class', 'data-type']),
  ).toBe(`<et-mark>hello</et-mark><img><et-mark>world</et-mark><br>`)

  ctx.commandManager.undoTransaction()
  expect(clearHtmlAttrs(p.outerHTML)).toBe(html)
})

test('tryMarkRange', async () => {
  const html = `<et-p>AABB<img>CCDD<br></et-p><et-p>para 2<br></et-p>`
  const editor = await initEditor(html, {
    plugins: [useMarkPlugin()],
  })
  const ctx = editor.context
  const p1 = ctx.bodyEl.firstChild as Et.EtParagraphElement
  const p2 = ctx.bodyEl.lastChild as Et.EtParagraphElement
  const originHtml = clearHtmlAttrs(p1.outerHTML)

  let ret = ctx.effectInvoker.invoke(p1, 'checkFormatMark', ctx, {
    markType: MarkType.BOLD,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    targetRange: ctx.selection.createTargetRange(cr.range(p1.firstChild, 2, p2.firstChild, 2)),
  })
  expect(ret).toBe(false)

  ret = ctx.effectInvoker.invoke(p1, 'checkFormatMark', ctx, {
    markType: MarkType.BOLD,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    targetRange: ctx.selection.createTargetRange(cr.range(p1.firstChild, 1, p1.firstChild, 3)),
  })
  expect(ret).toBe(true)
  expect(
    clearHtmlAttrs(p1.innerHTML, ['style', 'class', 'data-type']),
  ).toBe(`A<et-mark>AB</et-mark>B<img>CCDD<br>`)
  ctx.commandManager.undoTransaction()
  expect(clearHtmlAttrs(p1.outerHTML)).toBe(originHtml)

  ret = ctx.effectInvoker.invoke(p1, 'checkFormatMark', ctx, {
    markType: MarkType.BOLD,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    targetRange: ctx.selection.createTargetRange(cr.range(p1.firstChild, 2, p1.lastChild?.previousSibling, 2)),
  })
  expect(ret).toBe(true)
  expect(
    clearHtmlAttrs(p1.innerHTML, ['style', 'class', 'data-type']),
  ).toBe(`AA<et-mark>BB</et-mark><img><et-mark>CC</et-mark>DD<br>`)
  ctx.commandManager.undoTransaction()
  expect(clearHtmlAttrs(p1.outerHTML)).toBe(originHtml)
})
