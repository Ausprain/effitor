// /**
//  * 通用效应处理器, 这是对十个命令的封装, 自带效应元素校验, 以保证文档结构的规范性
//  * todo
//  * - [ ] duplicateParagraph 克隆一份当前光标所在段落(的空节点), 并插入当前段落前/后; 不局限于纯段落, 只要etcode验证为段落
//  *
//  */

import { HtmlCharEnum } from '@effitor/shared'

import type { Et } from '../@types'
import { etcode } from '../element'
import { cr } from '../selection'
import { dom } from '../utils'
import { cmd } from './command'
import { removeNodesAndChildlessAncestorAndMergeSiblings } from './handles'
import { checkRemoveTargetRange, removeByTargetRange } from './handles/delete/deleteAtRange'
import { insertContentsAtCaret, insertElementAtCaret, insertElementAtCaretTemporarily, insertTextAtCaret, insertTextAtRange } from './handles/insert'
import { fragmentUtils } from './utils'

//   /**
//    * 使用片段替换当前节点, 并自动合并前后内容; 若希望使用节点替换, 则可先把节点插入片段中
//    * @param node 当前节点(将要被替换的节点)
//    * @param fragment 替换片段
//    * @param setCaret 是否设置光标位置
//    * @param caretToStart 光标设置到fragment开始位置; 仅当setCaret为true时有效
//    * @param destCaretRange 最终光标位置; 若setCaret为false, 则destCaretRange无效
//    */
//   replaceNodeAndMerge(
//     ctx: Et.UpdatedContext, node: Et.HTMLNode, fragment: DocumentFragment,
//     setCaret = true, caretToStart = true, destCaretRange?: Et.CaretRange,
//   ) {
//     replaceNodeAndMerge(ctx, node, fragment, setCaret && !destCaretRange, caretToStart)
//     return ctx.commandManager.handle(setCaret ? destCaretRange : void 0)
//   },

//   // /**
//   //  * 替换文本内容
//   //  * @param data
//   //  * @param textRange 要替换的文本区间范围
//   //  * @param setCaret 是否设置光标位置
//   //  * @returns
//   //  */
//   // replaceText(data: string, textRange: Et.TextStaticRange, setCaret = false) {
//   //     if (!data) {
//   //         return false;
//   //     }
//   //     const text = textRange.startContainer
//   //     ctx.commandManager.push(cmd.replaceText({
//   //         text,
//   //         data,
//   //         delLen: textRange.endOffset - textRange.startOffset,
//   //         offset: textRange.startOffset,
//   //         destCaretRange: setCaret ? cr.caret(text, textRange.startOffset + data.length) : null
//   //     }))
//   //     return true
//   // },

// }

/**
 * 通用效应处理器, 不依赖 effectInvoker, 可直接调用处理
 * * 与 CommandManager 的区别:
 *   - CommandManager 直接执行命令, 更底层, 不考虑效应规则;
 *   - CommonHandler 考虑效应规则, 更复杂, 根据效应规则添加相应命令
 */
export class CommonHandler {
  private readonly _ctx: Et.EditorContext
  private readonly commander: Et.EditorContext['commandManager']
  /**
   * 创建一个通用效应处理器, 必须在上下文创建CommandManager之后
   */
  constructor(ctx: Et.EditorContext) {
    this._ctx = ctx
    this.commander = ctx.commandManager
  }

  private handleWith(canHandle: boolean, destCaretRange?: Et.CaretRange | null) {
    if (!canHandle) {
      return false
    }
    if (destCaretRange) {
      return this.commander.handleAndUpdate(destCaretRange)
    }
    return this.commander.handle()
  }

  /**
   * 初始化编辑器内容, 一般初始化为一个普通段落, 可通过编辑器 firstInsertedParagraph 回调自定义;
   * 若编辑器已有内容, 则会先清空再重新初始化
   * @param isFirstInit 是否首次初始化, 即编辑器是否为空; 否则会添加一个命令, 用于清空编辑区内容
   * @param create? 首段落创建函数
   */
  initEditorContents(isFirstInit: boolean, create?: Et.ParagraphCreator) {
    const ctx = this._ctx
    let newP, dest
    const bodyEl = ctx.bodyEl
    const out = create
      ? create(ctx)
      : ctx.editor.callbacks.firstInsertedParagraph?.(ctx) ?? ctx.createPlainParagraph()
    if (Array.isArray(out)) {
      newP = out[0]
      dest = out[1]
    }
    else {
      newP = out
    }
    if (!dest) {
      dest = cr.caretInAuto(newP)
    }
    if (isFirstInit) {
      bodyEl.appendChild(newP)
      ctx.setSelection(dest)
      return true
    }

    if (bodyEl.hasChildNodes()) {
      ctx.commandManager.push(cmd.removeContent({
        removeRange: cr.spanRangeAllIn(bodyEl) as Et.SpanRange,
      }))
    }

    ctx.commandManager.push(cmd.insertNode({
      node: newP,
      execAt: cr.caretInStart(bodyEl),
    })).handleAndUpdate(dest)

    return true
  }

  /**
   * 清空编辑区内容（可撤回）
   * * 如果仅是简单的清空编辑器(至初始状态), 应优先使用 `initEditorContents(false)`
   * @param setCaret 清空后是否定位光标位置，若为 true, 光标会定位到 et-body 内开头，这会触发
   *                  EtBodyElement.focusinCallback 该回调会判断 et-body 是否为空，
   *                  为空会默认插入一个段落(调用initEditorContents(false))
   * @returns 操作是否成功
   */
  clearEditorContents(setCaret: boolean) {
    const ctx = this._ctx
    const bodyEl = ctx.bodyEl
    if (bodyEl.childNodes.length === 0) {
      return true
    }
    const removeRange = cr.spanRangeAllIn(bodyEl)
    if (!removeRange) {
      return true
    }
    this.commander.push(
      cmd.removeContent({ removeRange }),
    )
    return setCaret
      ? this.commander.handleAndUpdate(cr.caretIn(bodyEl, 0))
      : this.commander.handle()
  }

  #updateEditorContentsByFragment(df: Et.Fragment) {
    const ctx = this._ctx
    const bodyEl = ctx.bodyEl
    // 刚刚初始化, 直接插入, 无需撤回支持
    if (ctx.commandManager.stackLength === 0) {
      bodyEl.textContent = ''
      bodyEl.appendChild(df)
      return true
    }
    if (bodyEl.hasChildNodes()) {
      ctx.commandManager.withTransaction([
        cmd.removeContent({
        // body 必有子节点
          removeRange: cr.spanRangeAllIn(bodyEl) as Et.SpanRange,
        }),
        cmd.insertContent({
          content: df,
          execAt: cr.caretInStart(bodyEl),
        }),
      ])
    }
    else {
      ctx.commandManager.withTransaction([
        cmd.insertContent({
          content: df,
          execAt: cr.caretInStart(bodyEl),
        }),
      ])
    }

    return true
  }

  /** 使用 markdown 文本更新编辑器内容 */
  updateEditorContentsFromMarkdown(mdText: string, options?: Et.FmOptions) {
    return this.#updateEditorContentsByFragment(
      this._ctx.fromMarkdown(mdText, options),
    )
  }

  /** 使用HTML更新编辑器内容 */
  updateEditorContentsFromHTML(html: string) {
    const df = this._ctx.editor.htmlProcessor.fromHtml(this._ctx, html)
    fragmentUtils.normalizeToEtFragment(df, this._ctx)
    return this.#updateEditorContentsByFragment(df)
  }

  /**
   * 插入文本
   * @param data 要插入的文本
   * @param insertAt 插入位置 可以是一个光标位置(EtCaret) 或目标选区(TargetCaret | TargetRange);
   *                 若为 null, 则使用当前选区位置
   * @param destCaretRange 命令执行后光标位置; 若缺省, 则使用插入文本后的位置
   */
  insertText(
    data: string,
    insertAt: Et.EtCaret | Et.TargetSelection | null,
    destCaretRange?: Et.CaretRange,
  ) {
    if (!insertAt) {
      insertAt = this._ctx.selection.getTargetCaret()
    }
    else if (this._ctx.selection.tellEtCaret(insertAt)) {
      insertAt = this._ctx.selection.createTargetCaret(insertAt)
    }
    return this._ctx.selection.checkSelectionTarget(insertAt, {
      caretFn: (caret) => {
        insertTextAtCaret(this._ctx, data, caret)
        return this.commander.handleAndUpdate(destCaretRange)
      },
      rangeFn: (range) => {
        insertTextAtRange(this._ctx, data, range)
        return this.commander.handleAndUpdate(destCaretRange)
      },
    })
  }

  /**
   * 在光标位置插入一个元素, 仅允许<br>和效应元素
   * @param el 要插入的元素, 仅允许<br>和效应元素
   * @param insertAt 插入位置 可以是一个光标位置(EtCaret) 或目标光标(TargetCaret);
   *                 若为 null, 则使用当前选区位置, 当前选区非 collapsed, 返回 false
   * @param destCaretRange 命令结束后光标位置, 若未提供, 则添加的命令不指定结束后光标位置
   */
  insertElement(
    el: Et.Element, insertAt: Et.EtCaret | Et.ValidTargetCaret | null, destCaretRange?: Et.CaretRange,
  ) {
    return this._ctx.selection.checkInsertAt(insertAt, (tc) => {
      if (!tc.isCaret()) {
        return false
      }
      return this.handleWith(insertElementAtCaret(this._ctx, el, tc, destCaretRange), destCaretRange)
    })
  }

  /**
   * 插入一个临时节点, 不改变文档数据, 但后续必须同步调用 `ctx.commandManager.discord()` 来恢复,
   * 否则文档结构将收到损坏
   * * 该方法内部会结束并开启新的命令事务
   * @param el 要插入的元素, 仅允许<br>和效应元素
   * @param insertAt 插入位置 可以是一个光标位置(EtCaret) 或目标光标(TargetCaret);
   *                 若为 null, 则使用当前选区位置, 当前选区非 collapsed, 返回 false
   * @param destCaretRange 命令结束后光标位置, 若未提供, 则使用插入元素末尾
   * @returns 插入成功返回 true, 否则返回 false
   */
  insertElementTemporarily(
    el: Element, insertAt: Et.EtCaret | Et.TargetSelection | null, destCaretRange?: Et.CaretRange | null,
  ) {
    return this._ctx.selection.checkInsertAt(insertAt, (tc) => {
      if (!tc.isCaret()) {
        return false
      }
      return this.handleWith(insertElementAtCaretTemporarily(this._ctx, el, tc, destCaretRange), destCaretRange)
    })
  }

  /**
   * 用一个普通段落替换指定"段落"
   * @param original 被替换的段落 (必须有父节点)
   * @param checkEtCode 是否检查效应规则; 当为 true 时, 如果 original 的父节点不接受普通段落, 则插入取消插入
   */
  replaceParagraphWithPlain(original: Et.Paragraph, checkEtCode: boolean) {
    if (!original.parentNode) {
      return
    }
    if (checkEtCode && etcode.check(original.parentNode)
      && !etcode.checkIn(original.parentNode, this._ctx.schema.paragraph.etType)
    ) {
      return
    }
    const plain = this._ctx.createPlainParagraph()
    this.commander.commitNextHandle(true)
    return this.commander.handleReplaceNode(original, plain, cr.caretInAuto(plain))
  }

  /**
   * 删除节点, 连带删除空祖先, 并合并前后可合并内容
   * @param node 待删除节点
   * @param destCaretRange 命令执行后光标位置; 若为 true, 则使用节点被移除位置;
   *    若为 false, 命令执行后不更新选区和上下文;
   */
  removeNodeAndMerge(node: Et.Node, destCaretRange: Et.CaretRange | boolean) {
    if (!removeNodesAndChildlessAncestorAndMergeSiblings(this._ctx, node, node, null)) {
      return false
    }
    if (destCaretRange) {
      return this.commander.handleAndUpdate(destCaretRange === true ? void 0 : destCaretRange)
    }
    return this.commander.handle()
  }

  /**
   * 移除当前选区内容, 移除失败返回 false, 若当前选区collapsed, 则直接返回true
   * @param destCaretRange 最终光标位置
   */
  removeRangingContents(destCaretRange?: Et.CaretRange) {
    if (this._ctx.selection.rawEl) {
      return this._ctx.commonEtElement && this._ctx.getEtHandler(this._ctx.commonEtElement)
        .DeleteInRawEl(this._ctx, {
          rawEl: this._ctx.selection.rawEl,
          isBackward: true,
          focus: true,
        })
    }
    const tr = this._ctx.selection.getTargetRange()
    if (!this._ctx.isUpdated() || !tr) {
      return false
    }
    if (tr.collapsed) {
      return true
    }
    if (!removeByTargetRange(this._ctx, tr)) {
      return false
    }
    this.commander.handleAndUpdate(destCaretRange)
    // 删除当前选区后必须更新选区和上下文
    if (!destCaretRange) {
      this._ctx.forceUpdate()
    }
    return true
  }

  /**
   * 判断一个目标选区是否合法且是个范围, 若是合法范围, 则先删除范围内容, 获取删除结果的光标位置,
   * 然后执行回调函数, 若是一个合法光标, 则直接执行回调
   * * 该方法与 `handlerUtils.checkRemoveTargetRange` 方法不同在于,
   *   使用了 `commandManager.withTransactionFn` 封装
   * @param targetRange 目标选区
   * @param fn 回调函数
   */
  checkRemoveTargetRange(
    targetRange: Et.TargetSelection, fn: (ctx: Et.EditorContext, caret: Et.ValidTargetCaret) => boolean,
  ) {
    if (!targetRange.isValid()) {
      return false
    }
    return this.commander.withTransactionFn(() => {
      return checkRemoveTargetRange(this._ctx, targetRange, (caret) => {
        return fn(this._ctx, caret)
      })
    })
  }

  /**
   * 移动光标到文本节点开头, 由于除了在段落开头, 我们无法让光标定位到一个文本节点的 0 位置;
   * 于是我们在开头插入一个零宽字符, 这个零宽字符会在下一次输入文本时自动移除; 此方法就是
   * 在我们需要将光标定位到 textNode 开头时, 判断是否以零宽字符开头, 若不是, 则插入一个,
   * 然后将光标定位到 1 位置.
   */
  caretToTextStartWithZWS(textNode: Et.Text) {
    if (textNode.data[0] === HtmlCharEnum.ZERO_WIDTH_SPACE) {
      this._ctx.selection.collapseTo(textNode, 1)
      return true
    }
    return this.commander.handleUpdateText(textNode, 0, 0, HtmlCharEnum.ZERO_WIDTH_SPACE, true)
  }

  /**
   * 在指定光标位置所在段落后边插入一个段落
   * * 若插入位置不接受将要插入的“段落”（newP），则会向上找最近一个可接受newP 为子节点的祖先段落（直至 et-body），并插入
   * * 该effect成功后默认会发送一个`inputType = insertParagraph` 的input事件
   * @param caretAt 光标位置, 若为 null, 则使用当前光标位置; 若位置无效, 则直接返回false
   * @param newP 要插入的新段落; 若缺省, 则依据光标所在段落创建新段落:
   *             当前段落是普通段落或标题或组件时, 插入一个普通段落;
   *             否则, 插入一个与当前段落相同类的段落 (如et-li)
   * @param topLevel 是否插入为顶层段落; 若为 true, 则在当前顶层节点(topElement)插入一个普通段落(除非指定 newP);
   *                 否则, 在当前段落后边插入新段落; 默认为 false
   * @param destCaretRange 命令执行后光标位置; 若为 true, 则使用新段落内末尾位置;
   *                       若为 false, 命令执行后不更新选区和上下文; 默认为 true
   * @param dispatch 是否发送 `inputType = insertParagraph` 的input事件; 默认为 true
   * @returns 是否成功插入;
   */
  appendParagraph(
    caretAt: Et.EtCaret | Et.TargetSelection | null,
    {
      newP = void 0,
      topLevel = false,
      destCaretRange = true,
      dispatch = true,
    }: {
      newP?: Et.EtParagraph
      topLevel?: boolean
      destCaretRange?: Et.CaretRange | boolean
      dispatch?: boolean
    } = {},
  ): boolean {
    const ctx = this._ctx
    return ctx.selection.checkInsertAt(caretAt, (tc) => {
      if (!tc.anchorParagraph || !tc.anchorTopElement) {
        // 没有段落和顶层节点，说明光标直接在 et-body 下
        tc = tc.toTargetCaret(false)
        if (tc.anchorEtElement === ctx.bodyEl) {
          newP = newP || ctx.createPlainParagraph()
          if (destCaretRange === true) {
            destCaretRange = cr.caretInAuto(newP)
          }
          return this.commander.handleInsertNode(newP, tc.etCaret, destCaretRange)
        }
        return false
      }
      let insertAt
      if (!newP) {
        newP = topLevel ? ctx.createPlainParagraph() : ctx.cloneParagraph(tc.anchorParagraph)
        insertAt = cr.caretOutEnd(topLevel ? tc.anchorTopElement : tc.anchorParagraph)
      }
      else if (topLevel) {
        insertAt = cr.caretOutEnd(tc.anchorTopElement)
      }
      else {
        // 判断当前段落父节点是否允许传入的newP; 若不允许，则找最近一个可允许插入的祖先段落，直至 et-body
        const ps = ctx.body.outerParagraphs(tc.anchorParagraph)
        for (const p of ps) {
          if (etcode.checkIn(p, newP)) {
            insertAt = cr.caretOutEnd(p)
            break
          }
        }
        if (!insertAt) {
          insertAt = cr.caretOutEnd(tc.anchorTopElement)
        }
      }
      let dest: Et.CaretRange | undefined
      if (destCaretRange === true) {
        dest = dom.isText(newP.firstChild)
          ? cr.caretInEnd(newP.firstChild)
          : cr.caretInStart(newP)
      }
      else if (destCaretRange === false) {
        dest = void 0
      }
      else {
        dest = destCaretRange
      }
      if (ctx.commandManager.push(cmd.insertNode({
        node: newP,
        execAt: insertAt,
      })).handleAndUpdate(dest)) {
        if (dispatch) {
          ctx.body.dispatchInputEvent('input', {
            inputType: 'insertParagraph',
          })
        }
        return true
      }
      return false
    })
  }

  /**
   * 在指定光标位置插入一个片段
   * * 该方法会校验片段内容是否符合etcode规则
   * @param df 要插入的片段, 若没有节点, 则直接返回
   * @param insertAt 光标位置, 若为 null, 则使用当前光标位置; 若位置无效, 则直接返回false
   * @param destCaretRange 命令执行后光标位置; 若缺省, 则使用fragment最后子节点的外末尾
   * @returns
   */
  insertContentsAtCaret(
    df: DocumentFragment | Et.Fragment,
    insertAt: Et.EtCaret | Et.TargetSelection | null,
    destCaretRange?: Et.CaretRange,
  ) {
    const ctx = this._ctx
    return ctx.selection.checkInsertAt(insertAt, (tc) => {
      if (!tc || !tc.isCaret()) {
        return false
      }
      insertContentsAtCaret(ctx, df as Et.Fragment, tc)
      if (destCaretRange) {
        return ctx.commandManager.handleAndUpdate(destCaretRange)
      }
      return ctx.commandManager.handle()
    })
  }

  /**
   * 清空一个元素内容(如果有), 并插入新内容(节点或片段)
   * * 该方法不检查效应规则
   * @param el 要清空并插入内容的元素, 该元素不在编辑区内, 直接返回 false
   * @param content 要插入的内容(节点或片段), 若片段为空, 则直接返回 false
   * @param destCaretRange 命令执行后光标位置, 若缺省, 则使用content最后子节点的内末尾; 若为 null, 则命令执行后不更新选区
   * @returns 是否成功清空并插入内容
   */
  emptyElAndInsert(el: HTMLElement, content: Et.Node | Et.Fragment, destCaretRange?: Et.CaretRange | null) {
    if (!this._ctx.body.isNodeInBody(el)) {
      return false
    }
    const cmds: Et.Command[] = []
    if (el.hasChildNodes()) {
      const removeRange = cr.spanRangeAllIn(el)
      if (!removeRange) {
        this._ctx.assists.logger?.logError('create SpanRange failed while an el has child nodes', 'CommonHandler.emptyAndInsert')
        return false
      }
      cmds.push(
        cmd.removeContent({ removeRange }),
      )
    }
    if (!dom.isFragment(content)) {
      cmds.push(cmd.insertNode({ node: content, execAt: cr.caretInStart(el) }))
    }
    else {
      if (!content.hasChildNodes()) {
        return false
      }
      cmds.push(cmd.insertContent({
        content,
        execAt: cr.caretInStart(el),
      }))
    }
    if (destCaretRange === void 0) {
      const lastChild = content.lastChild
      if (lastChild) {
        destCaretRange = cr.caretEndAuto(lastChild)
      }
      else {
        destCaretRange = null
      }
    }
    this.commander.push(...cmds)
    return destCaretRange
      ? this.commander.handleAndUpdate(destCaretRange)
      : this.commander.handle()
  }
}
