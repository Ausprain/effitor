import { HtmlCharEnum } from '@effitor/shared'

import type { Et } from '../@types'
import { platform } from '../config'
import { dom } from '../utils'

export const getCompositionStart = (ctx: Et.EditorContext) => {
  return () => {
    // 输入法开始时, 选区非 collapsed, 先删除(自动更新光标位置信息)
    if (!ctx.selection.isCollapsed) {
      ctx.commonHandlers.removeRangingContents()
    }
    else {
      // 更新光标位置信息, 并滚到可见区域
      ctx.forceUpdate()
      ctx.selection.revealSelectionSync()
    }
    ctx.commandManager.commit()

    // 输入法开始, 记录段落尾节点
    ctx.paragraphLastNodeInCompositionStart = ctx.focusParagraph?.lastChild
    // 标记使用 IME
    ctx.isUsingIME = true
    ctx.inCompositionSession = true
    ctx.compositionUpdateCount = 0
    ctx.skipNextKeydown()
  }
}

export const getCompositionUpdate = (ctx: Et.EditorContext) => {
  return (ev: CompositionEvent) => {
    ctx.compositionUpdateCount++
    ctx.skipNextKeydown()
    ev.preventDefault()
  }
}

export const getCompositionEnd = (ctx: Et.EditorContext) => {
  return (ev: CompositionEvent) => {
    // fixed. Windows 下 Chromium, 采用页面内失焦方式结束输入法会话, 会在compositionend后
    // 发送一个不可取消的 deleteContentBackward 因此需要延迟 inCompositionSession = false,
    // 让beforeinput跳过这个 deleteContentBackward
    setTimeout(() => {
      ctx.inCompositionSession = false
      ctx.commandManager.commit()
    }, 0)

    // fixed. 若ev.data 为空, 即用户删除输入法组合串或使用 Esc 取消输入法输入
    // 此时若段落只有唯一一个子节点(就是输入法组合串所在的文本节点, 其内容会被替换为 ev.data)
    // 此时插入一个尾 br; 这是各浏览器的"共识", 大概目的是防止输入法组合串被删除后, 段落为空,
    // 而如果段落没有设置最小高度, 那么段落高度会坍缩, 导致光标跳跃或无法选中等情况于是采用了
    // 插入一个 br的方式撑起段落;
    // 但这对 Effitor 来说是灾难, 因为我们是直接操作DOM 的,
    // 需要完全接管浏览器对编辑器内的所有 DOM 操作, 任何对编辑器内容的非命令更改都可能会导致 cr
    // 定位的光标位置不精确, 从而导致一些异常
    // 因此我们要在此恢复 composition 会话开始时被浏览器删除的尾 br, 或使用被删除的尾 br 来替换
    // 浏览器为撑起段落而插入的新 br
    if (ctx.focusParagraph) {
      const pLast = ctx.focusParagraph.lastChild
      if (pLast && dom.isBrElement(pLast) && pLast !== ctx.paragraphLastNodeInCompositionStart) {
        if (!ctx.paragraphLastNodeInCompositionStart) {
          // 这是浏览器私自插入的 br, 移除
          pLast.remove()
        }
        else if (dom.isBrElement(ctx.paragraphLastNodeInCompositionStart)) {
          // 或替换为一开始被浏览器私自删除的 br
          pLast.replaceWith(ctx.paragraphLastNodeInCompositionStart)
        }
      }
      // 段落为空, 而输入法开始时非空, 插回被意外删除的节点; 这种情况应该不太会发生
      // 可能的情况是, 浏览器在用户取消输入法输入时, 段落为空而没有惯例地插入一个 br
      if (!pLast && ctx.paragraphLastNodeInCompositionStart) {
        ctx.focusParagraph.appendChild(ctx.paragraphLastNodeInCompositionStart)
      }
    }
    ctx.paragraphLastNodeInCompositionStart = null

    // 输入法插入字符, 去掉插入位置前导的零宽字符
    if (ev.data && ctx.selection.anchorText
      && ctx.selection.anchorText.data[ctx.selection.anchorOffset - 1] === HtmlCharEnum.ZERO_WIDTH_SPACE) {
      ctx.commonHandlers.deleteInTextNode(ctx.selection.anchorText, ctx.selection.anchorOffset - 1, 1, false)
    }

    if (ev.data && ctx.focusEtElement) {
      // ctx.effectInvoker.invoke(ctx.focusEtElement, 'InsertCompositionTextSuccess', ctx, ev.data)
      ctx.getEtHandler(ctx.focusEtElement).InsertCompositionTextSuccess?.(ctx, ev.data)
    }

    // fixed. 解决 MacOS 下 Safari 的 composition 事件先于 keydown 执行, 导致输入法结束后
    // 多执行一个 keydown 引起的 beforeinput 事件的问题
    ctx.skipNextKeydown()

    if (!platform.isSupportInsertFromComposition) {
      // Safari 的输入法插入文本可拦截, 使用 insertText 命令插入 并设置设置光标位置, 更新ctx
      // 非 Safari 下, 输入法插入无法拦截, 需手动更新上下文
      ctx.forceUpdate()
    }
  }
}
