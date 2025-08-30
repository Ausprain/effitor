// /**
//  * 子类可重写此方法来自定义处理粘贴内容, 也可通过原型链调用此实现, 获取父类 parse 的结果
//  */
// const TransformInsertContents = (): DocumentFragment => {
//   // 子类实现时, 可通过获取原型调用父类实现获取父类处理结果
//   const df = ctx.effectInvoker.getEtProto(_this).TransformInsertContents()
//   ...
// }
// const insertFromPaste = (): boolean => {
//   // 调用当前解析方法
//   _this.TransformInsertContents()
// }

import { MIMETypeEnum } from '~/core/enums'

import { createEffectHandle, createInputEffectHandle } from '../../utils'
import { checkRemoveRangingContents } from '../delete/deleteAtRange'
import { insertContentsAtCaret, insertTextAtCaret } from './insert.shared'

export const insertFromPaste = createInputEffectHandle((_this, ctx, ev) => {
  const clipboardData = ev.dataTransfer
  if (!clipboardData) {
    return true
  }
  const tr = ctx.selection.getTargetRange()
  if (!tr) {
    return true
  }
  ctx.commandManager.withTransactionFn(() => {
    checkRemoveRangingContents(ctx, (caret) => {
      const html = clipboardData.getData(MIMETypeEnum.TEXT_HTML)
      if (html) {
        const etFragment = ctx.editor.htmlProcessor.fromHtml(ctx, html)
        if (_this.TransformInsertContents) {
          _this.TransformInsertContents(_this, ctx, {
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
        insertTextAtCaret(ctx, plainText, caret)
      }
    })
    return true
  })
  return true
})

/**
 * 内置隐藏粘贴行为, 用于粘贴从编辑器自身复制的内容
 */
export const insertFromEtHtml = createEffectHandle('InsertFromEtHtml' as 'E', (_this, ctx, etHtml) => {
  if (typeof etHtml !== 'string') {
    return false
  }
  ctx.commandManager.withTransactionFn(() => {
    checkRemoveRangingContents(ctx, (caret) => {
      const df = ctx.createFragment(etHtml)
      if (_this.TransformInsertContents) {
        _this.TransformInsertContents(_this, ctx, {
          fragment: df,
          insertToEtElement: caret.anchorEtElement,
        })
      }
      if (df.hasChildNodes()) {
        insertContentsAtCaret(ctx, df, caret)
      }
    })
    return true
  })
  return true
})
