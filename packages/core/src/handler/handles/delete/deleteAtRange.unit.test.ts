import { describe, expect, test } from 'vitest'

import { clearHtmlAttrs, initEditor, minifiedHtml } from '../../../__tests__/shared.test'
import type { Et } from '../../../@types'
import { EtBlockquote } from '../../../element'
import { registerEtElement } from '../../../element/register'
import { cr } from '../../../selection'
import {
  removeByTargetRange,
  removeInDifferentParagraphWithSameParent,
  removeInDifferentParagraphWithSameTopElement,
  removeInDifferentTopElement,
  removeInSameParagraph,
  removeInSameTextNode,
} from './deleteAtRange'

// 选区在同文本节点内
test('removeInSameTextNode', async () => {
  const editor = await initEditor('<et-p>Hello A78<b>bold<i>I123</i></b>B12</et-p>')
  const ctx = editor.context as Et.UpdatedContext
  const p = editor.bodyEl.children[0] as Et.EtParagraphElement
  ctx.setSelection(cr.range(p.firstChild!, 2, p.firstChild!, 5))
  expect(removeInSameTextNode(ctx, ctx.selection.getTargetRange()!, p, p.firstChild! as Et.Text)).toBe(true)
  expect(ctx.commandManager.handleAndUpdate()).toBe(true)
  expect(p.innerHTML).toBe('He A78<b>bold<i>I123</i></b>B12')
  const i = p.children[0]!.children[0]!
  ctx.setSelection(cr.range(i.firstChild as Et.Text, 0, i.firstChild as Et.Text, (i.firstChild! as Et.Text).length))
  expect(removeInSameTextNode(ctx, ctx.selection.getTargetRange()!, p, i.firstChild as Et.Text)).toBe(true)
  expect(ctx.commandManager.handleAndUpdate()).toBe(true)
  expect(p.innerHTML).toBe('He A78<b>bold</b>B12')
})

// 选区在同段落内跨节点
describe('removeInSameParagraph', () => {
  test('start, end are sibling and commonAncestor is p', async () => {
    const editor = await initEditor('<et-p>Hello A78<b>bold<i>I123</i></b>B12</et-p>')
    const ctx = editor.context as Et.UpdatedContext
    const p = editor.bodyEl.children[0] as Et.EtParagraphElement
    ctx.setSelection(cr.range(p.firstChild!, 2, p.lastChild!, 1))
    expect(ctx.selection.commonAncestor === p).toBe(true)
    expect(ctx.selection.commonAncestor === ctx.body.findCommonAncestor(p.firstChild as any, p.lastChild as any)).toBe(true)
    expect(removeInSameParagraph(ctx, ctx.selection.getTargetRange()!, p)).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    expect(p.innerHTML).toBe(`He12`)
  })
  test('start, end are sibling and commonAncestor is not p', async () => {
    const editor = await initEditor('<et-p>Hello A78<b>bold<i>I123</i>D12</b>B12</et-p>')
    const ctx = editor.context as Et.UpdatedContext
    const p = editor.bodyEl.children[0] as Et.EtParagraphElement
    const b = p.children[0] as any
    // '<et-p>Hello A78<b>bo^ld<i>I123</i>D|12</b>B12</et-p>'
    ctx.setSelection(cr.range(b.firstChild, 2, b.lastChild, 1))
    expect(ctx.selection.commonAncestor === b).toBe(true)
    expect(ctx.selection.commonAncestor === ctx.body.findCommonAncestor(b.firstChild, b.lastChild)).toBe(true)
    expect(removeInSameParagraph(ctx, ctx.selection.getTargetRange()!, p)).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    // ~~原本的b 已经被删除, 成为 orphan 节点保存在命令中~~
    // expect(b.isConnected).toBe(false)
    // expect(b.innerHTML).not.toBe('bo12')
    // 不应删除, 应保留
    expect(b.isConnected).toBe(true)
    expect(b.innerHTML).toBe('bo12')
    expect(p.innerHTML).toBe('Hello A78<b>bo12</b>B12')
  })
  test('start, end are same but not #text', async () => {
    const editor = await initEditor('<et-p>Hello A78<b>bold<i>I123</i></b>B12</et-p>')
    const ctx = editor.context as Et.UpdatedContext
    const p = editor.bodyEl.children[0] as Et.EtParagraphElement
    const b = p.children[0] as any
    ctx.setSelection(cr.range(b, 0, b, 1))
    expect(removeInSameParagraph(ctx, ctx.selection.getTargetRange()!, p)).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    expect(p.childNodes.length).toBe(3)
    expect(b.innerHTML).toBe(`<i>I123</i>`)
    expect(p.innerHTML).toBe('Hello A78<b><i>I123</i></b>B12')
    // 验证连带删除祖先
    const i = p.children[0]!.firstChild as Et.HTMLElement
    expect(i.localName).toBe('i')
    ctx.setSelection(cr.rangeAllIn(i))
    expect(removeInSameParagraph(ctx, ctx.selection.getTargetRange()!, p)).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    expect(p.innerHTML).toBe('Hello A78B12')
    // 验证合并
    expect(ctx.selection.range.startContainer.textContent).toBe('Hello A78B12')
    expect(ctx.selection.range.startOffset).toBe(9)
  })
  test('start, end are not sibling and commonAncestor is p', async () => {
    const editor = await initEditor('<et-p>Hello A78<b>bold<i>I123</i>B12</b>P12</et-p>')
    const ctx = editor.context as Et.UpdatedContext
    const p = editor.bodyEl.children[0] as Et.EtParagraphElement
    const b = p.children[0] as any
    ctx.setSelection(cr.range(p.firstChild!, 5, b, 1))
    expect(ctx.selection.commonAncestor === p).toBe(true)
    expect(removeInSameParagraph(ctx, ctx.selection.getTargetRange()!, p)).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    // 原本的b 已经被删除, 成为 orphan 节点保存在命令中, 其内容应当不变
    expect(b.isConnected).toBe(false)
    expect(b.innerHTML).toBe('bold<i>I123</i>B12')
    expect(p.innerHTML).toBe('Hello<b><i>I123</i>B12</b>P12')

    const newB = p.children[0]!
    ctx.setSelection(cr.range(p.firstChild!, 2, newB.lastChild as any, 3))
    expect(ctx.selection.commonAncestor === p).toBe(true)
    expect(removeInSameParagraph(ctx, ctx.selection.getTargetRange()!, p)).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    // 与选区无交集的 P12 节点, 在删除选区内容后与前面的 Hello文本节点相邻, 应当合并, 最终段落应该只有 1 节点
    expect(p.childNodes.length).toBe(1)
    expect(p.innerHTML).toBe('HeP12')
    expect(ctx.selection.range.collapsed).toBe(true)
    expect(ctx.selection.range.startContainer.textContent).toBe('HeP12')
    expect(ctx.selection.range.startOffset).toBe(2)
  })
  test('start, end are not sibling and commonAncestor is not p', async () => {
    const editor = await initEditor('<et-p>Hello A78<b>bold<i>I123</i>B12</b>P12</et-p>')
    const ctx = editor.context as Et.UpdatedContext
    const p = editor.bodyEl.children[0] as Et.EtParagraphElement
    const b = p.children[0] as any
    const i = b.children[0]
    ctx.setSelection(cr.range(b.firstChild, 2, i.firstChild, 2))
    expect(ctx.selection.commonAncestor === b).toBe(true)
    expect(removeInSameParagraph(ctx, ctx.selection.getTargetRange()!, p)).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    // 范围未全选公共祖先 b, b被保留
    expect(b.isConnected).toBe(true)
    expect(i.isConnected).toBe(false)
    expect(b.innerHTML).toBe('bo<i>23</i>B12')
    expect(p.innerHTML).toBe('Hello A78<b>bo<i>23</i>B12</b>P12')

    const newB = p.children[0]! as any
    const newI = newB.children[0]! as any
    ctx.setSelection(cr.range(newI.firstChild, 0, newB.lastChild, 1))
    expect(ctx.selection.commonAncestor === newB).toBe(true)
    expect(removeInSameParagraph(ctx, ctx.selection.getTargetRange()!, p)).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    expect(p.childNodes.length).toBe(3)
    expect(p.innerHTML).toBe('Hello A78<b>bo12</b>P12')
    expect(ctx.selection.range.collapsed).toBe(true)
    expect(ctx.selection.range.startContainer.textContent).toBe('bo12')
    expect(ctx.selection.range.startOffset).toBe(2)

    ctx.commandManager.discard()
    ctx.setSelection(cr.range(b.firstChild, 0, i.firstChild, 4))
    expect(ctx.selection.commonAncestor === b).toBe(true)
    expect(removeInSameParagraph(ctx, ctx.selection.getTargetRange()!, p)).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    expect(p.innerHTML).toBe('Hello A78<b>B12</b>P12')
  })
})

// 选区在不同段落内，但段落父节点相同
describe('removeInDifferentParagraphWithSameParent', () => {
  test('merge text', async () => {
    const editor = await initEditor(`
    <et-p>Hello A78<b>bold<i>I123</i></b>B12</et-p>
    <et-p>Hello A78<b>bold<i>I123</i></b>B12</et-p>
    `)
    const ctx = editor.context as Et.UpdatedContext
    const body = ctx.bodyEl
    const originHtml = body.innerHTML
    const p1 = body.children[0] as Et.EtParagraphElement
    const p2 = body.children[1] as Et.EtParagraphElement
    // <et-p>Hello ^A78<b>bold<i>I123</i></b>B12</et-p>
    // <et-p>He|llo A78<b>bold<i>I123</i></b>B12</et-p>
    // =>
    // <et-p>Hello |llo A78<b>bold<i>I123</i></b>B12</et-p>
    ctx.setSelection(cr.range(p1.firstChild!, 6, p2.firstChild!, 2))
    expect(removeInDifferentParagraphWithSameParent(ctx, ctx.selection.getTargetRange()!, p1, p2)).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    expect(p1.innerHTML).toBe('Hello llo A78<b>bold<i>I123</i></b>B12')

    expect(ctx.commandManager.discard()).toBe(true)
    expect(body.childNodes.length).toBe(2)

    expect(body.children[0]!.innerHTML).toBe('Hello A78<b>bold<i>I123</i></b>B12')
    expect(body.children[1]!.innerHTML).toBe('Hello A78<b>bold<i>I123</i></b>B12')

    // <et-p>Hello A78<b>bold<i>I123</i></b>B^12</et-p>
    // <et-p>Hello A78<b>bold<i>I123</i></b>B1|2</et-p>
    // =>
    // <et-p>Hello A78<b>bold<i>I123</i></b>B|2</et-p>
    ctx.setSelection(cr.range(p1.lastChild!, 1, p2.lastChild!, 2))
    expect(removeInDifferentParagraphWithSameParent(ctx, ctx.selection.getTargetRange()!, p1, p2)).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    expect(body.children[0]).toBe(p1)
    expect(p1.innerHTML).toBe('Hello A78<b>bold<i>I123</i></b>B2')

    ctx.commandManager.discard()
    expect(clearHtmlAttrs(body.innerHTML)).toBe(clearHtmlAttrs(originHtml))
  })
  test('no merge', async () => {
    const editor = await initEditor(`
    <et-p>Hello A78<b>bold<i>I123</i></b>B12</et-p>
    <et-p>Hello A78<b>bold<i>I123</i></b>B12</et-p>
    `)
    const ctx = editor.context as Et.UpdatedContext
    const body = ctx.bodyEl
    const p1 = body.children[0] as Et.EtParagraphElement
    const p2 = body.children[1] as Et.EtParagraphElement
    const b1 = p1.children[0] as any
    ctx.setSelection(cr.range(b1.firstChild!, 2, p2.firstChild!, 2))
    expect(removeInDifferentParagraphWithSameParent(ctx, ctx.selection.getTargetRange()!, p1, p2)).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    expect(p1.innerHTML).toBe('Hello A78<b>bo</b>llo A78<b>bold<i>I123</i></b>B12')
  })
  test('merge element', async () => {
    const editor = await initEditor(`
    <et-p>Hello A78<b>bold<i>I123</i></b>B12</et-p>
    <et-p>Hello A78<b>bold<i>I456</i></b>B12</et-p>
    <et-p>Hello A78<b>bold</b>B12</et-p>
    `)
    const ctx = editor.context as Et.UpdatedContext
    const body = ctx.bodyEl
    const p1 = body.children[0] as Et.EtParagraphElement
    const p2 = body.children[1] as Et.EtParagraphElement
    const i1 = p1.children[0]!.lastChild as any
    const i2 = p2.children[0]!.lastChild as any
    ctx.setSelection(cr.range(i1.firstChild!, 1, i2.firstChild!, 1))
    expect(removeInDifferentParagraphWithSameParent(ctx, ctx.selection.getTargetRange()!, p1, p2)).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    expect(p1.innerHTML).toBe('Hello A78<b>bold<i>I456</i></b>B12')
    expect(body.children[1]!.innerHTML).toBe(`Hello A78<b>bold</b>B12`)
  })
})

// 选区在不同段落内，且段落父节点不同，但 top 元素相同
describe('removeInDifferentParagraphWithSameTopElement', () => {
  test('simple', async () => {
    await Promise.resolve().then(() => registerEtElement(EtBlockquote))
    const editor = await initEditor(`
      <et-bq>
        <et-p>Hello A78<b>bold<i>I123</i></b>B12</et-p>
        <list>
          <et-p>Hello A78<b>bold</b>B12</et-p>
        </list>
      </et-bq>
    `)
    const ctx = editor.context as Et.UpdatedContext
    const body = ctx.bodyEl
    const top = body.children[0] as Et.Paragraph
    const p1 = top.children[0] as Et.EtParagraphElement
    const p2 = top.children[1]!.children[0] as Et.EtParagraphElement

    // <et-bq>
    //     <et-p>Hello^ A78<b>bold<i>I123</i></b>B12</et-p>
    //     <list>
    //       <et-p>Hello A78<b>bold</b>B|12</et-p>
    //     </list>
    //   </et-bq>
    // =>
    // <et-bq>
    //     <et-p>Hello|</et-p>
    //     <list>
    //       <et-p>12</et-p>
    //     </list>
    //   </et-bq>
    ctx.setSelection(cr.range(p1.firstChild!, 5, p2.lastChild!, 1))
    expect(removeInDifferentParagraphWithSameTopElement(ctx, ctx.selection.getTargetRange()!, p1, p2)).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    expect(p1.innerHTML).toBe(`Hello`)
    expect(p2.innerHTML).toBe('12')
    expect(ctx.selection.range.startContainer.textContent).toBe('Hello')
    expect(ctx.selection.range.startOffset).toBe(5)

    ctx.commandManager.discard()
    // <et-bq>
    //     <et-p>Hello^ A78<b>bold<i>I123</i></b>B12</et-p>
    //     <list>
    //       <et-p>Hello A78<b>bold</b>B12|</et-p>
    //     </list>
    //   </et-bq>
    // =>
    // <et-bq>
    //     <et-p>Hello|</et-p>
    //   </et-bq>
    ctx.setSelection(cr.range(p1.firstChild!, 5, p2.lastChild!, 3))
    // list应当被整个移除
    expect(removeInDifferentParagraphWithSameTopElement(ctx, ctx.selection.getTargetRange()!, p1, p2)).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    expect(top.childNodes.length).toBe(1)
    expect(p1.innerHTML).toBe(`Hello`)
    expect(p2.isConnected).toBe(false)
    expect(p2.innerHTML).toBe('Hello A78<b>bold</b>B12')
    expect(ctx.selection.range.startContainer.textContent).toBe('Hello')
    expect(ctx.selection.range.startOffset).toBe(5)
  })
  test('multi', async () => {
    await Promise.resolve().then(() => registerEtElement(EtBlockquote))
    const editor = await initEditor(`
      <et-bq>
        <list>
          <et-p>Hello A78<b>bold</b>B12</et-p>
          <et-p>World B78</et-p>
        </list>
        <et-p>Hello A78<b>bold<i>I123</i></b>B12</et-p>
      </et-bq>
    `)
    const ctx = editor.context as Et.UpdatedContext
    const body = ctx.bodyEl
    const top = body.children[0] as Et.Paragraph
    const p1 = top.children[0] as Et.EtParagraphElement
    const p11 = p1.children[0] as Et.EtParagraphElement
    const p12 = p1.children[1] as Et.EtParagraphElement
    const p2 = top.children[1] as Et.EtParagraphElement

    // <et-bq>
    //   <list>
    //     <et-p>Hello^ A78<b>bold</b>B12</et-p>
    //     <et-p>World B78</et-p>
    //   </list>
    //   <et-p>Hello A78<b>bold<i>I123</i></b>B|12</et-p>
    // </et-bq>
    // =>
    // <et-bq>
    //   <list>
    //     <et-p>Hello|12</et-p>
    //   </list>
    // </et-bq>
    ctx.setSelection(cr.range(p11.firstChild!, 5, p2.lastChild!, 1))
    expect(removeInDifferentParagraphWithSameTopElement(ctx, ctx.selection.getTargetRange()!, p11, p2)).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    // p12 在范围内, 应当被整体移除, 内容不变
    expect(p12.isConnected).toBe(false)
    expect(p12.innerHTML).toBe('World B78')
    // p2是孤立段落, 且与p11 可合并, 将并入p11
    expect(p1.childNodes.length).toBe(1)
    expect(p11.innerHTML).toBe(`Hello12`)
    expect(ctx.selection.range.startContainer.textContent).toBe('Hello12')
    expect(ctx.selection.range.startOffset).toBe(5)

    ctx.commandManager.discard()
    // <et-bq>
    //   <list>
    //     <et-p>Hello^ A78<b>bold</b>B12</et-p>
    //     <et-p>World B78</et-p>
    //   </list>
    //   <et-p>Hello A78<b>bold<i>I123</i></b>B12|</et-p>
    // </et-bq>
    // =>
    // <et-bq>
    //   <list>
    //     <et-p>Hello|</et-p>
    //   </list>
    // </et-bq>
    ctx.setSelection(cr.range(p11.firstChild!, 5, p2.lastChild!, 3))
    expect(removeInDifferentParagraphWithSameTopElement(ctx, ctx.selection.getTargetRange()!, p11, p2)).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    expect(top.childNodes.length).toBe(1)
    expect(p11.innerHTML).toBe(`Hello`)
    expect(p2.isConnected).toBe(false)
    // p2 应当被整个移除
    expect(p2.innerHTML).toBe('Hello A78<b>bold<i>I123</i></b>B12')
    expect(ctx.selection.range.startContainer.textContent).toBe('Hello')
    expect(ctx.selection.range.startOffset).toBe(5)
  })
})

// 选区在不同段落内，且段落父节点不同，top 元素也不同
describe('removeInDifferentTopElement', () => {
  test('not merge', async () => {
    // EtBlockquote 是抽象基类, 默认不注册, 这里仅作测试
    await Promise.resolve().then(() => registerEtElement(EtBlockquote))
    const editor = await initEditor(`
      <et-bq>
        <et-p>Hello A78<b>bold<i>I123</i></b>B12</et-p>
      </et-bq>
      <et-p>Hello A78<b>bold</b>B12</et-p>
    `)
    const ctx = editor.context as Et.UpdatedContext
    const body = ctx.bodyEl
    const top1 = body.children[0] as Et.EtParagraphElement
    const p1 = top1.children[0] as any
    const top2 = body.children[1] as Et.EtParagraphElement
    // <et-bq>
    //   <et-p>Hello A78<b>bo^ld<i>I123</i></b>B12</et-p>
    // </et-bq>
    // <et-p>He|llo A78<b>bold</b>B12</et-p>
    // =>
    // <et-bq>
    //   <et-p>Hello A78<b>bo</b>llo A78<b>bold</b>B12</et-p>
    // </et-bq>
    ctx.setSelection(cr.range(p1.children[0]!.firstChild!, 2, top2.firstChild!, 2))
    expect(removeInDifferentTopElement(ctx, ctx.selection.getTargetRange()!, p1, top2)).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    // top2 是孤立简单段落, 且与p1相同, 应当并入p1
    expect(top1.children[0]!.innerHTML).toBe('Hello A78<b>bo</b>llo A78<b>bold</b>B12')
    expect(top2.innerHTML).toBe('')
  })
  test('merge top element', async () => {
    // EtBlockquote 是抽象基类, 默认不注册, 这里仅作测试
    await Promise.resolve().then(() => registerEtElement(EtBlockquote))
    const editor = await initEditor(`
      <et-bq>
        <et-p>Hello A78<b>bold123<i>I123</i></b>B12</et-p>
      </et-bq>
      <et-bq>
        <et-p><b>bold789<i>I123</i></b>IJK</et-p>
        <et-p>Hello A78<b>bold</b>B12</et-p>
      </et-bq>
    `)
    const ctx = editor.context as Et.UpdatedContext
    const body = ctx.bodyEl
    const top1 = body.children[0] as Et.EtParagraphElement
    const top2 = body.children[1] as Et.EtParagraphElement
    const p1 = top1.children[0] as any
    const p2 = top2.children[0] as any
    const p3 = top2.children[1] as any
    // <et-bq>
    //   <et-p>Hello A78<b>bold^123<i>I123</i></b>B12</et-p>
    // </et-bq>
    // <et-bq>
    //   <et-p><b>bold|789<i>I123</i></b>IJK</et-p>
    //   <et-p>Hello A78<b>bold</b>B12</et-p>
    // </et-bq>
    // =>
    // <et-bq>
    //   <et-p>Hello A78<b>bold|789<i>I123</i></b>IJK</et-p>
    //   <et-p>Hello A78<b>bold</b>B12</et-p>
    // </et-bq>
    ctx.setSelection(cr.range(p1.children[0]!.firstChild!, 4, p2.children[0]!.firstChild!, 4))
    expect(removeInDifferentTopElement(ctx, ctx.selection.getTargetRange()!, p1, p2)).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    // 若顶层节点可合并, 则范围起始位置的顶层节点保留在页面上, 末尾位置的顶层节点被移除
    expect(top1.isConnected).toBe(true)
    expect(top2.isConnected).toBe(false)
    expect(body.childNodes.length).toBe(1)
    expect(body.children[0]!.localName).toBe('et-bq')
    expect(body.children[0]!.childNodes.length).toBe(2)
    expect(body.children[0]!.children[0]!.innerHTML).toBe('Hello A78<b>bold789<i>I123</i></b>IJK')
    expect(body.children[0]!.children[1]!.innerHTML).toBe('Hello A78<b>bold</b>B12')
  })
})
