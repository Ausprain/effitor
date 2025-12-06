import { describe, expect, test } from 'vitest'

import { initEditor, minifiedHtml } from '../../../__tests__/shared.test'
import type { Et } from '../../../@types'
import { cr } from '../../../selection'
import {
  checkBackspaceAtCaretDeleteNode,
  checkBackspaceAtCaretDeleteParagraph,
  checkBackspaceAtCaretDeleteText,
  // checkBackspaceAtCaretInTextStart,
  checkDeleteAtCaretDeleteNode,
  checkDeleteAtCaretDeleteParagraph,
  checkDeleteAtCaretDeleteText,
  // checkDeleteAtCaretInTextEnd,
} from './deleteAtCaret'

test('checkBackspaceAtCaretDeleteText', async () => {
  const editor = await initEditor('<et-p>Hello A78<b>bold<i>I123</i></b>B12</et-p>')
  const ctx = editor.context as Et.UpdatedContext
  // 清空撤回栈, 清除上一个测试的命令状态
  ctx.commandManager.commitAll()
  const body = editor.bodyEl
  const p = body.children[0] as Et.EtParagraphElement

  // 测试删除单个字符
  ctx.setSelection(cr.caretIn(p.firstChild as Et.Text, 7))
  expect(checkBackspaceAtCaretDeleteText.call(
    ctx.effectInvoker.getEtElCtor(p),
    ctx, ctx.selection.getTargetRange()!.toTargetCaret()!, false)).toBe(true)
  expect(ctx.commandManager.handleAndUpdate()).toBe(true)
  expect(p.innerHTML).toBe('Hello 78<b>bold<i>I123</i></b>B12')
  // 测试删除整个单词
  ctx.setSelection(cr.caretIn(p.firstChild as Et.Text, 6))
  expect(checkBackspaceAtCaretDeleteText.call(
    ctx.effectInvoker.getEtElCtor(p),
    ctx, ctx.selection.getTargetRange()!.toTargetCaret()!, true)).toBe(true)
  expect(ctx.commandManager.handleAndUpdate()).toBe(true)
  expect(p.innerHTML).toBe('78<b>bold<i>I123</i></b>B12')
  ctx.commandManager.commit()
  ctx.commandManager.undoTransaction()
  expect(p.innerHTML).toBe('Hello A78<b>bold<i>I123</i></b>B12')

  p.firstChild!.textContent = 'H  删除删除789'
  ctx.setSelection(cr.caretIn(p.firstChild as Et.Text, 7))
  expect(checkBackspaceAtCaretDeleteText.call(
    ctx.effectInvoker.getEtElCtor(p),
    ctx, ctx.selection.getTargetRange()!.toTargetCaret()!, true)).toBe(true)
  expect(ctx.commandManager.handleAndUpdate()).toBe(true)
  expect(p.innerHTML).toBe('H789<b>bold<i>I123</i></b>B12')
  ctx.commandManager.commit()
  ctx.commandManager.undoTransaction()
  expect(p.innerHTML).toBe('H  删除删除789<b>bold<i>I123</i></b>B12')
})

describe('checkBackspaceAtCaretDeleteParagraph', () => {
  // 测试在段落开头按Backspace
  test('caret affinity', async () => {
    const editor = await initEditor(minifiedHtml(`
    <et-p>First paragraph</et-p>
    <et-p><b>AA</b>Second paragraph</et-p>
  `))
    const ctx = editor.context as Et.UpdatedContext
    // 清空撤回栈, 清除上一个测试的命令状态
    ctx.commandManager.commitAll()
    const body = editor.bodyEl
    const p1 = body.children[0] as Et.EtParagraphElement
    const p2 = body.children[1] as Et.EtParagraphElement
    // 首段落, 无命令执行
    ctx.setSelection(cr.caretIn(p1.firstChild as Et.Text, 0))
    expect(checkBackspaceAtCaretDeleteParagraph.call(
      ctx.effectInvoker.getEtElCtor(p1), ctx, ctx.selection.getTargetRange()!.toTargetCaret(),
    )).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(false)

    // 非开头, 禁止删除
    ctx.setSelection(cr.caretIn(p1.firstChild as Et.Text, 1))
    expect(checkBackspaceAtCaretDeleteParagraph.call(
      ctx.effectInvoker.getEtElCtor(p1), ctx, ctx.selection.getTargetRange()!.toTargetCaret(),
    )).toBe(false)
    // 非首段落, 允许删除
    ctx.setSelection(cr.caretIn(p2.firstChild as Et.Text, 0))
    expect(checkBackspaceAtCaretDeleteParagraph.call(
      ctx.effectInvoker.getEtElCtor(p2), ctx, ctx.selection.getTargetRange()!.toTargetCaret(),
    )).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    ctx.commandManager.discard()
    // 亲和位置判断
    ctx.setSelection(cr.caretIn(p2.firstChild?.firstChild as Et.Text, 0))
    expect(checkBackspaceAtCaretDeleteParagraph.call(
      ctx.effectInvoker.getEtElCtor(p2), ctx, ctx.selection.getTargetRange()!.toTargetCaret(),
    )).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
  })
  test('both text', async () => {
    const editor = await initEditor(minifiedHtml(`
    <et-p>First paragraph</et-p>
    <et-p>Second paragraph</et-p>
  `))
    const ctx = editor.context as Et.UpdatedContext
    // 清空撤回栈, 清除上一个测试的命令状态
    ctx.commandManager.commitAll()
    const body = editor.bodyEl
    const p1 = body.children[0] as Et.EtParagraphElement
    const p2 = body.children[1] as Et.EtParagraphElement

    const srcCaret = cr.caretIn(p2.firstChild as Et.Text, 0)
    ctx.setSelection(srcCaret)
    expect(checkBackspaceAtCaretDeleteParagraph.call(
      ctx.effectInvoker.getEtElCtor(p2), ctx, ctx.selection.getTargetRange()!.toTargetCaret(),
    )).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    expect(body.children.length).toBe(1)
    expect(p1.innerHTML).toBe('First paragraphSecond paragraph')
    // 验证光标落点位置
    expect(ctx.selection.range.startContainer.textContent).toBe('First paragraphSecond paragraph')
    expect(ctx.selection.range.startOffset).toBe(15)
    // 丢弃命令(回滚)
    ctx.commandManager.discard()
    expect(body.children.length).toBe(2)
    expect(p1.innerHTML).toBe('First paragraph')
    expect(p2.innerHTML).toBe('Second paragraph')
    // 验证回滚后恢复的光标位置
    expect(ctx.selection.getCaretRange().toCaret().isEqualTo(srcCaret)).toBe(true)
  })
  test('text element', async () => {
    const editor = await initEditor(minifiedHtml(`
    <et-p>First paragraph</et-p>
    <et-p><b>Second</b>paragraph</et-p>
  `))
    const ctx = editor.context as Et.UpdatedContext
    // 清空撤回栈, 清除上一个测试的命令状态
    ctx.commandManager.commitAll()
    const body = editor.bodyEl
    const p1 = body.children[0] as Et.EtParagraphElement
    const p2 = body.children[1] as Et.EtParagraphElement

    ctx.setSelection(cr.caretIn(p2.firstChild as Et.Text, 0))
    expect(checkBackspaceAtCaretDeleteParagraph.call(
      ctx.effectInvoker.getEtElCtor(p2), ctx, ctx.selection.getTargetRange()!.toTargetCaret(),
    )).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    expect(body.children.length).toBe(1)
    expect(p1.innerHTML).toBe('First paragraph<b>Second</b>paragraph')
    expect(ctx.selection.range.startContainer.textContent).toBe('First paragraph')
    expect(ctx.selection.range.startOffset).toBe(15)
    ctx.commandManager.commit()
    ctx.commandManager.undoTransaction()
    expect(body.children.length).toBe(2)
    expect(p1.innerHTML).toBe('First paragraph')
    expect(p2.innerHTML).toBe('<b>Second</b>paragraph')
  })
  test('element text', async () => {
    const editor = await initEditor(minifiedHtml(`
    <et-p>First<b>paragraph</b></et-p>
    <et-p>Second paragraph</et-p>
  `))
    const ctx = editor.context as Et.UpdatedContext
    // 清空撤回栈, 清除上一个测试的命令状态
    ctx.commandManager.commitAll()
    const body = editor.bodyEl
    const p1 = body.children[0] as Et.EtParagraphElement
    const p2 = body.children[1] as Et.EtParagraphElement

    ctx.setSelection(cr.caretIn(p2.firstChild as Et.Text, 0))
    expect(checkBackspaceAtCaretDeleteParagraph.call(
      ctx.effectInvoker.getEtElCtor(p2), ctx, ctx.selection.getTargetRange()!.toTargetCaret(),
    )).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    expect(body.children.length).toBe(1)
    expect(p1.innerHTML).toBe('First<b>paragraph</b>Second paragraph')
    // 验证光标落点位置
    expect(ctx.selection.range.startContainer.textContent).toBe('Second paragraph')
    expect(ctx.selection.range.startOffset).toBe(0)
  })
  test('element element', async () => {
    const editor = await initEditor(minifiedHtml(`
    <et-p>First<i>paragraph9</i></et-p>
    <et-p><b>Second</b>paragraph</et-p>
  `))
    const ctx = editor.context as Et.UpdatedContext
    // 清空撤回栈, 清除上一个测试的命令状态
    ctx.commandManager.commitAll()
    const body = editor.bodyEl
    const p1 = body.children[0] as Et.EtParagraphElement
    const p2 = body.children[1] as Et.EtParagraphElement

    ctx.setSelection(cr.caretIn(p2.firstChild as Et.Text, 0))
    expect(checkBackspaceAtCaretDeleteParagraph.call(
      ctx.effectInvoker.getEtElCtor(p2), ctx, ctx.selection.getTargetRange()!.toTargetCaret(),
    )).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    expect(body.children.length).toBe(1)
    expect(p1.innerHTML).toBe('First<i>paragraph9</i><b>Second</b>paragraph')
    // 验证光标落点位置
    expect(ctx.selection.range.startContainer.textContent).toBe('paragraph9')
    expect(ctx.selection.range.startOffset).toBe(10)
  })
  test('element element merge', async () => {
    const editor = await initEditor(minifiedHtml(`
    <et-p>First<b>paragraph9</b></et-p>
    <et-p><b>Second</b>paragraph</et-p>
    <et-p>third paragraph</et-p>
  `))
    const ctx = editor.context as Et.UpdatedContext
    // 清空撤回栈, 清除上一个测试的命令状态
    ctx.commandManager.commitAll()
    const body = editor.bodyEl
    const p1 = body.children[0] as Et.EtParagraphElement
    const p2 = body.children[1] as Et.EtParagraphElement

    ctx.setSelection(cr.caretIn(p2.firstChild as Et.Text, 0))
    expect(checkBackspaceAtCaretDeleteParagraph.call(
      ctx.effectInvoker.getEtElCtor(p2), ctx, ctx.selection.getTargetRange()!.toTargetCaret(),
    )).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    expect(body.children.length).toBe(2)
    expect(p1.innerHTML).toBe('First<b>paragraph9Second</b>paragraph')
    expect(body.lastElementChild!.innerHTML).toBe('third paragraph')
    // 验证光标落点位置
    expect(ctx.selection.range.startContainer.textContent).toBe('paragraph9Second')
    expect(ctx.selection.range.startOffset).toBe(10)
    // 撤回
    ctx.commandManager.commit()
    ctx.commandManager.undoTransaction()
    expect(body.children[0]!.innerHTML).toBe('First<b>paragraph9</b>')
    expect(body.children[1]!.innerHTML).toBe('<b>Second</b>paragraph')
    expect(body.children[2]!.innerHTML).toBe('third paragraph')
  })

  // TODO with top element
})

describe('checkBackspaceAtCaretDeleteNode', () => {
  test('del only node itself', async () => {
    const editor = await initEditor('<et-p>Hello<b>bold</b>text</et-p>')
    const ctx = editor.context as Et.UpdatedContext
    // 清空撤回栈, 清除上一个测试的命令状态
    ctx.commandManager.commitAll()
    const body = editor.bodyEl
    const p = body.children[0] as Et.EtParagraphElement

    ctx.setSelection(cr.caretIn(p, 1)) // 光标在<b>节点前
    expect(checkBackspaceAtCaretDeleteNode(ctx, ctx.selection.getTargetRange()!.toTargetCaret())).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    expect(p.innerHTML).toBe('<b>bold</b>text')
  })
  test('del node with only child ancestor and merge siblings', async () => {
    const editor = await initEditor('<et-p>Hello<b>bold</b>text</et-p>')
    const ctx = editor.context as Et.UpdatedContext
    // 清空撤回栈, 清除上一个测试的命令状态
    ctx.commandManager.commitAll()
    const body = editor.bodyEl
    const p = body.children[0] as Et.EtParagraphElement

    // 测试删除加粗节点
    const firstText = p.firstChild
    ctx.setSelection(cr.caretIn(p, 2))
    expect(checkBackspaceAtCaretDeleteNode(ctx, ctx.selection.getTargetRange()!.toTargetCaret())).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    expect(p.innerHTML).toBe('Hellotext')
    expect(firstText !== ctx.selection.range.startContainer).toBe(true)
    expect(ctx.selection.range.startContainer.textContent).toBe('Hellotext')
    expect(ctx.selection.range.startOffset).toBe(5)

    // 丢弃前述命令开启新测试, 避免影响后续测试
    ctx.commandManager.discard()
    body.innerHTML = '<et-p>Hello<b>AA</b><br><b>BB</b>World</et-p>'
    const p22 = body.children[0] as Et.EtParagraphElement
    const srcCaret = cr.caretIn(p22, 3)
    ctx.setSelection(srcCaret)
    expect(checkBackspaceAtCaretDeleteNode(ctx, ctx.selection.getTargetRange()!.toTargetCaret())).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    expect(p22.innerHTML).toBe('Hello<b>AABB</b>World')
    expect(ctx.selection.range.startContainer.textContent).toBe('AABB')
    expect(ctx.selection.range.startOffset).toBe(2)
    ctx.commandManager.commit()
    ctx.commandManager.undoTransaction()
    expect(p22.innerHTML).toBe('Hello<b>AA</b><br><b>BB</b>World')
    expect(ctx.selection.getCaretRange().toCaret().isEqualTo(srcCaret)).toBe(true)
  })
})

// FIXME 环境不支持 Selection.modify 方法
// tes('checkBackspaceAtCaretInTextStart', () => {
//   const editor = initEditor('<et-p>Hello A78<b>bold<i>I123</i></b>B12</et-p>')
//   const ctx = editor.context as Et.UpdatedContext
// 清空撤回栈, 清除上一个测试的命令状态
//   const body = editor.bodyEl
//   const p = body.children[0] as Et.EtParagraphElement
//   // 测试在文本节点开头
//   ctx.setSelection(cr.caretIn(p.firstChild as Et.Text, 0))
//   expect(checkBackspaceAtCaretInTextStart(ctx)).toBe(false)
// })

test('checkDeleteAtCaretDeleteText', async () => {
  const editor = await initEditor('<et-p>Hello A78<b>bold<i>I123</i></b>B12</et-p>')
  const ctx = editor.context as Et.UpdatedContext
  // 清空撤回栈, 清除上一个测试的命令状态
  ctx.commandManager.commitAll()
  const body = editor.bodyEl
  const p = body.children[0] as Et.EtParagraphElement

  // 测试删除单个字符
  ctx.setSelection(cr.caretIn(p.firstChild as Et.Text, 0))
  expect(checkDeleteAtCaretDeleteText.call(
    ctx.effectInvoker.getEtElCtor(p),
    ctx, ctx.selection.getTargetRange()!.toTargetCaret(), false)).toBe(true)
  expect(ctx.commandManager.handleAndUpdate()).toBe(true)
  expect(p.innerHTML).toBe('ello A78<b>bold<i>I123</i></b>B12')

  // 测试删除整个单词
  ctx.setSelection(cr.caretIn(p.firstChild as Et.Text, 0))
  expect(checkDeleteAtCaretDeleteText.call(
    ctx.effectInvoker.getEtElCtor(p),
    ctx, ctx.selection.getTargetRange()!.toTargetCaret(), true)).toBe(true)
  expect(ctx.commandManager.handleAndUpdate()).toBe(true)
  expect(p.innerHTML).toBe('A78<b>bold<i>I123</i></b>B12')
})

describe('checkDeleteAtCaretDeleteParagraph', () => {
  test('allow', async () => {
    const editor = await initEditor(minifiedHtml(`
    <et-p>First paragraph</et-p>
    <et-p>Second paragraph</et-p>
  `))
    const ctx = editor.context as Et.UpdatedContext
    // 清空撤回栈, 清除上一个测试的命令状态
    ctx.commandManager.commitAll()
    const body = editor.bodyEl
    const p1 = body.children[0] as Et.EtParagraphElement
    // const p2 = body.children[1] as Et.EtParagraphElement

    // 测试在段落结尾按Delete
    // 非末尾, 禁止删除
    ctx.setSelection(cr.caretIn(p1.firstChild as Et.Text, 14)) // "First paragrap|h"
    expect(checkDeleteAtCaretDeleteParagraph.call(
      ctx.effectInvoker.getEtElCtor(p1), ctx, ctx.selection.getTargetRange()!.toTargetCaret(),
    )).toBe(false)
    ctx.setSelection(cr.caretIn(p1.firstChild as Et.Text, 15)) // "First paragraph|"
    expect(checkDeleteAtCaretDeleteParagraph.call(
      ctx.effectInvoker.getEtElCtor(p1), ctx, ctx.selection.getTargetRange()!.toTargetCaret(),
    )).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    expect(body.children.length).toBe(1)
    expect(p1.innerHTML).toBe('First paragraphSecond paragraph')
  })
  test('both text', async () => {
    const editor = await initEditor(minifiedHtml(`
    <et-p>First paragraph</et-p>
    <et-p>Second paragraph</et-p>
  `))
    const ctx = editor.context as Et.UpdatedContext
    // 清空撤回栈, 清除上一个测试的命令状态
    ctx.commandManager.commitAll()
    const body = editor.bodyEl
    const p1 = body.children[0] as Et.EtParagraphElement
    const p2 = body.children[1] as Et.EtParagraphElement

    const srcCaret = cr.caretIn(p1.lastChild as Et.Text, 15)
    ctx.setSelection(srcCaret)
    expect(checkDeleteAtCaretDeleteParagraph.call(
      ctx.effectInvoker.getEtElCtor(p1), ctx, ctx.selection.getTargetRange()!.toTargetCaret(),
    )).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    expect(body.children.length).toBe(1)
    expect(p1.innerHTML).toBe('First paragraphSecond paragraph')
    // 验证光标落点位置
    expect(ctx.selection.range.startContainer.textContent).toBe('First paragraphSecond paragraph')
    expect(ctx.selection.range.startOffset).toBe(15)
    // 丢弃命令(回滚)
    ctx.commandManager.discard()
    expect(body.children.length).toBe(2)
    expect(p1.innerHTML).toBe('First paragraph')
    expect(p2.innerHTML).toBe('Second paragraph')
    // 验证回滚后恢复的光标位置
    expect(ctx.selection.getCaretRange().toCaret().isEqualTo(srcCaret)).toBe(true)
  })
  test('text element', async () => {
    const editor = await initEditor(minifiedHtml(`
    <et-p>First paragraph</et-p>
    <et-p><b>Second</b>paragraph</et-p>
  `))
    const ctx = editor.context as Et.UpdatedContext
    // 清空撤回栈, 清除上一个测试的命令状态
    ctx.commandManager.commitAll()
    const body = editor.bodyEl
    const p1 = body.children[0] as Et.EtParagraphElement
    const p2 = body.children[1] as Et.EtParagraphElement

    ctx.setSelection(cr.caretIn(p1.firstChild as Et.Text, 15))
    expect(checkDeleteAtCaretDeleteParagraph.call(
      ctx.effectInvoker.getEtElCtor(p1), ctx, ctx.selection.getTargetRange()!.toTargetCaret(),
    )).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    expect(body.children.length).toBe(1)
    expect(p1.innerHTML).toBe('First paragraph<b>Second</b>paragraph')
    expect(ctx.selection.range.startContainer.textContent).toBe('First paragraph')
    expect(ctx.selection.range.startOffset).toBe(15)
    ctx.commandManager.commit()
    ctx.commandManager.undoTransaction()
    expect(body.children.length).toBe(2)
    expect(p1.innerHTML).toBe('First paragraph')
    expect(p2.innerHTML).toBe('<b>Second</b>paragraph')
  })
  test('element text', async () => {
    const editor = await initEditor(minifiedHtml(`
    <et-p>First<b>paragraph</b></et-p>
    <et-p>Second paragraph</et-p>
  `))
    const ctx = editor.context as Et.UpdatedContext
    // 清空撤回栈, 清除上一个测试的命令状态
    ctx.commandManager.commitAll()
    const body = editor.bodyEl
    const p1 = body.children[0] as Et.EtParagraphElement

    ctx.setSelection(cr.caretIn(p1.lastChild as Et.Text, 1))
    expect(checkDeleteAtCaretDeleteParagraph.call(
      ctx.effectInvoker.getEtElCtor(p1), ctx, ctx.selection.getTargetRange()!.toTargetCaret(),
    )).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    expect(body.children.length).toBe(1)
    expect(p1.innerHTML).toBe('First<b>paragraph</b>Second paragraph')
    // 验证光标落点位置
    expect(ctx.selection.range.startContainer.textContent).toBe('Second paragraph')
    expect(ctx.selection.range.startOffset).toBe(0)
  })
  test('element element', async () => {
    const editor = await initEditor(minifiedHtml(`
    <et-p>First<i>paragraph9</i></et-p>
    <et-p><b>Second</b>paragraph</et-p>
  `))
    const ctx = editor.context as Et.UpdatedContext
    // 清空撤回栈, 清除上一个测试的命令状态
    ctx.commandManager.commitAll()
    const body = editor.bodyEl
    const p1 = body.children[0] as Et.EtParagraphElement

    ctx.setSelection(cr.caretIn(p1.lastChild?.firstChild as Et.Text, 10))
    expect(checkDeleteAtCaretDeleteParagraph.call(
      ctx.effectInvoker.getEtElCtor(p1), ctx, ctx.selection.getTargetRange()!.toTargetCaret(),
    )).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    expect(body.children.length).toBe(1)
    expect(p1.innerHTML).toBe('First<i>paragraph9</i><b>Second</b>paragraph')
    // 验证光标落点位置
    expect(ctx.selection.range.startContainer.textContent).toBe('paragraph9')
    expect(ctx.selection.range.startOffset).toBe(10)
  })
  test('element element merge', async () => {
    const editor = await initEditor(minifiedHtml(`
    <et-p>First<b>paragraph9</b></et-p>
    <et-p><b>Second</b>paragraph</et-p>
    <et-p>third paragraph</et-p>
  `))
    const ctx = editor.context as Et.UpdatedContext
    // 清空撤回栈, 清除上一个测试的命令状态
    ctx.commandManager.commitAll()
    const body = editor.bodyEl
    const p1 = body.children[0] as Et.EtParagraphElement

    ctx.setSelection(cr.caretIn(p1.lastChild?.firstChild as Et.Text, 10))
    expect(checkDeleteAtCaretDeleteParagraph.call(
      ctx.effectInvoker.getEtElCtor(p1), ctx, ctx.selection.getTargetRange()!.toTargetCaret(),
    )).toBe(true)
    expect(ctx.commandManager.handleAndUpdate()).toBe(true)
    expect(body.children.length).toBe(2)
    expect(p1.innerHTML).toBe('First<b>paragraph9Second</b>paragraph')
    expect(body.lastElementChild!.innerHTML).toBe('third paragraph')
    // 验证光标落点位置
    expect(ctx.selection.range.startContainer.textContent).toBe('paragraph9Second')
    expect(ctx.selection.range.startOffset).toBe(10)
    // 撤回
    ctx.commandManager.commit()
    ctx.commandManager.undoTransaction()
    expect(body.children[0]!.innerHTML).toBe('First<b>paragraph9</b>')
    expect(body.children[1]!.innerHTML).toBe('<b>Second</b>paragraph')
    expect(body.children[2]!.innerHTML).toBe('third paragraph')
  })
})

test('checkDeleteAtCaretDeleteNode', async () => {
  const editor = await initEditor('<et-p>Hello<b>bold</b>text</et-p>')
  const ctx = editor.context as Et.UpdatedContext
  // 清空撤回栈, 清除上一个测试的命令状态
  ctx.commandManager.commitAll()
  const body = editor.bodyEl
  const p = body.children[0] as Et.EtParagraphElement

  // 测试删除加粗节点
  ctx.setSelection(cr.caretIn(p, 2)) // 光标在<b>节点后
  expect(checkDeleteAtCaretDeleteNode(ctx, ctx.selection.getTargetRange()!.toTargetCaret())).toBe(true)
  expect(ctx.commandManager.handleAndUpdate()).toBe(true)
  expect(p.innerHTML).toBe('Hello<b>bold</b>')
  ctx.commandManager.discard()
  ctx.setSelection(cr.caretIn(p.children[0] as any, 0))
  expect(checkDeleteAtCaretDeleteNode(ctx, ctx.selection.getTargetRange()!.toTargetCaret())).toBe(true)
  expect(ctx.commandManager.handleAndUpdate()).toBe(true)
  expect(p.innerHTML).toBe('Hellotext')
})

// FIXME 环境不支持 Selection.modify 方法
// tes('checkDeleteAtCaretInTextEnd', () => {
//   const editor = initEditor('<et-p>Hello A78<b>bold<i>I123</i></b>B12</et-p>')
//   const ctx = editor.context as Et.UpdatedContext
//   const body = editor.bodyEl
//   const p = body.children[0] as Et.EtParagraphElement

//   // 测试在文本节点结尾
//   ctx.setSelection(cr.caretIn(p.firstChild as Et.Text, 5))
//   expect(checkDeleteAtCaretInTextEnd(ctx)).toBe(false)
// })
