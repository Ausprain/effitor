// /**
//  * 子类可重写此方法来自定义处理粘贴内容, 也可通过原型链调用此实现, 获取父类 parse 的结果
//  */
// const TransformInsertContents = (): DocumentFragment => {
//   // 子类实现时, 可通过获取原型调用父类实现获取父类处理结果
//   const df = ctx.effectInvoker.getEtProto(_that).TransformInsertContents()
//   ...
// }
// const insertFromPaste = (): boolean => {
//   // 调用当前解析方法
//   _that.TransformInsertContents()
// }

import { MIMETypeEnum } from '@effitor/shared'

import { createEffectHandle, createInputEffectHandle } from '../../utils'
import { insertContentsAtCaret, insertTextAtCaret } from './insert.shared'

export const insertFromPaste = createInputEffectHandle((_that, ctx, pl) => {
  const clipboardData = pl.dataTransfer
  if (!clipboardData) {
    return true
  }
  return ctx.commonHandlers.checkRemoveTargetRange(pl.targetRange, (ctx, caret) => {
    const html = clipboardData.getData(MIMETypeEnum.TEXT_HTML)
    if (html) {
      const etFragment = ctx.editor.htmlProcessor.fromHtml(ctx, html)
      if (_that.TransformInsertContents) {
        _that.TransformInsertContents(_that, ctx, {
          fragment: etFragment,
          insertToEtElement: caret.anchorEtElement,
        })
      }
      if (etFragment.hasChildNodes()) {
        insertContentsAtCaret(ctx, etFragment, caret)
        return true
      }
    }
    const plainText = clipboardData.getData(MIMETypeEnum.TEXT_PLAIN)
    if (plainText) {
      return insertTextAtCaret(ctx, plainText, caret)
    }
    return false
  })
})

/**
 * 内置隐藏粘贴行为, 用于粘贴从编辑器自身复制的内容
 */
export const insertFromEtHtml = createEffectHandle('InsertFromEtHtml' as 'E', (_that, ctx, etHtml) => {
  const tr = ctx.selection.getTargetRange()
  if (!tr || typeof etHtml !== 'string') {
    return false
  }
  return ctx.commonHandlers.checkRemoveTargetRange(tr, (ctx, caret) => {
    const df = ctx.createFragment(etHtml)
    if (_that.TransformInsertContents) {
      _that.TransformInsertContents(_that, ctx, {
        fragment: df,
        insertToEtElement: caret.anchorEtElement,
      })
    }
    if (df.hasChildNodes()) {
      return insertContentsAtCaret(ctx, df, caret)
    }
    return false
  })
})
