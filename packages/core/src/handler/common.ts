// /**
//  * 通用效应处理器, 这是对十个命令的封装, 自带效应元素校验, 以保证文档结构的规范性
//  * todo
//  * - [ ] insertNodeAtCaret 添加一个etCode参数, 若node是效应元素则为node.etCode, 否则为其下最外层效应元素的etCode的或; 无效应元素则为0
//  * - [ ] duplicateParagraph 克隆一份当前光标所在段落(的空节点), 并插入当前段落前/后; 不局限于纯段落, 只要etcode验证为段落
//  *
//  */

import type { Et } from '../@types'
import { cmd } from './command'
import { removeNodesAndChildlessAncestorAndMergeSiblings } from './handles'
import { checkRemoveTargetRange, removeByTargetRange } from './handles/delete/deleteAtRange'
import { insertElementAtCaret, insertElementAtCaretTemporarily, insertTextAtCaret, insertTextAtRange } from './handles/insert'

//   /**
//    * 无视当前光标位置, 在当前段落后边插入一个新段落 \
//    * * 该effect成功后会发送一个`inputType = insertParagraph` 的input事件
//    * @param newP 要插入的新段落; 若缺省, 则当前段落是普通段落或标题时, 插入一个普通段落; 否则, 插入一个与当前段落相同类的段落 (如et-li)
//    * @returns 是否成功插入;
//    */
//   appendParagraph(
//     ctx: Et.UpdatedContext, newP?: Et.EtParagraphElement, destCaretRange?: Et.CaretRange,
//   ): boolean {
//     if (!newP) {
//       newP = ctx.cloneParagraph()
//     }
//     if (!destCaretRange) {
//       destCaretRange = cr.caret(newP, 0)
//     }
//     ctx.commandManager.withTransaction([
//       cmd.insertNode({
//         node: newP,
//         execAt: cr.caretOutEnd(ctx.paragraphEl),
//       }),
//     ], destCaretRange)

//     ctx.body.dispatchInputEvent('input', {
//       inputType: 'insertParagraph',
//     })
//     return true
//   },

//   /**
//    * 在当前光标位置插入一个fragment, 若当前光标为range, 则会先collapse到末尾; 若希望删除选区内容, 可先调用 removeRangingContents
//    * * 该方法会校验片段内容是否符合etcode规则
//    * @param df 要插入的片段, 若没有节点, 则直接返回
//    * @param merge 插入片段时, 是否尝试合并前后可合并内容, 默认合并, 但若明确知道不需要合并, 应传入false
//    * @param destCaretRange 命令执行后光标位置; 若缺省, 则使用fragment最后子节点的外末尾
//    * @returns
//    */
//   insertContentAtCaret(
//     ctx: Et.UpdatedContext, df: DocumentFragment, destCaretRange?: Et.CaretRange,
//   ) {
//     insertContentAtCaret(ctx, df, !destCaretRange)
//     return ctx.commandManager.handle(destCaretRange)
//   },
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
 */
export class CommonHandlers {
  private readonly _ctx: Et.EditorContext
  private readonly commander: Et.EditorContext['commandManager']
  /**
   * 创建一个通用效应处理器, 必须在上下文创建CommandManager之后
   */
  constructor(ctx: Et.EditorContext) {
    this._ctx = ctx
    this.commander = ctx.commandManager
  }

  private handleWith(canHandle: boolean, destCaretRange?: Et.CaretRange) {
    if (!canHandle) {
      return false
    }
    if (destCaretRange) {
      return this.commander.handleAndUpdate(destCaretRange)
    }
    return this.commander.handle()
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
   * 在文本节点中插入文本
   * @param destCaretRange 命令执行后光标位置; 若为 true, 则使用插入文本后的位置; 若为 false, 则不设置光标位置也不更新上下文和选区
   */
  insertInTextNode(
    textNode: Text,
    offset: number,
    data: string,
    destCaretRange: Et.CaretRange | boolean = true,
  ) {
    this.commander.push(cmd.insertText({
      text: textNode as Et.Text,
      offset,
      data,
      setCaret: destCaretRange === true,
    }))
    if (destCaretRange) {
      return this.commander.handleAndUpdate(typeof destCaretRange === 'object' ? destCaretRange : undefined)
    }
    return this.commander.handle()
  }

  /**
   * 删除文本节点中的文本, 该方法不会判断删除后文本节点是否为空;
   * * 此方法使用 backward 方向删除
   * @param destCaretRange 命令执行后光标位置; 若为 true, 则使用删除文本后的位置; 若为 false, 则不设置光标位置也不更新上下文和选区
   */
  deleteInTextNode(
    textNode: Text,
    offset: number,
    delDataOrLen: string | number,
    destCaretRange: Et.CaretRange | boolean = true,
  ) {
    if (typeof delDataOrLen === 'number') {
      delDataOrLen = textNode.data.slice(offset, offset + delDataOrLen)
    }
    if (!delDataOrLen) {
      return false
    }
    this.commander.push(cmd.deleteText({
      text: textNode as Et.Text,
      data: delDataOrLen,
      offset,
      isBackward: true,
      setCaret: destCaretRange === true,
    }))
    if (destCaretRange) {
      return this.commander.handleAndUpdate(typeof destCaretRange === 'object' ? destCaretRange : undefined)
    }
    return this.commander.handle()
  }

  /**
   * 在光标位置插入一个元素, 仅允许<br>和效应元素
   * @param el 要插入的元素, 仅允许<br>和效应元素
   * @param insertAt 插入位置 可以是一个光标位置(EtCaret) 或目标光标(TargetCaret);
   *                 若为 null, 则使用当前选区位置, 当前选区非 collapsed, 返回 false
   * @param destCaretRange 命令结束后光标位置, 若未提供, 则使用插入元素末尾
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
    el: Element, insertAt: Et.EtCaret | Et.TargetSelection | null, destCaretRange?: Et.CaretRange,
  ) {
    return this._ctx.selection.checkInsertAt(insertAt, (tc) => {
      if (!tc.isCaret()) {
        return false
      }
      return this.handleWith(insertElementAtCaretTemporarily(this._ctx, el, tc, destCaretRange), destCaretRange)
    })
  }

  /**
   * 删除节点, 节点不在页面上, 返回 false
   * * 该方法只删除目标节点, 不会连带删除空祖先
   * @param destCaretRange 命令执行后光标位置; 若为 true, 则使用节点被移除位置;
   *    若为 false, 命令执行后不更新选区和上下文; 默认为 true
   */
  removeNode(node: Et.Node, destCaretRange: Et.CaretRange | boolean = true) {
    if (!node.isConnected) {
      return false
    }
    this.commander.push(cmd.removeNode({ node, setCaret: destCaretRange === true }))
    if (destCaretRange) {
      return this.commander.handleAndUpdate(destCaretRange === true ? void 0 : destCaretRange)
    }
    return this.commander.handle()
  }

  /**
   * 删除节点, 连带删除空祖先, 并合并前后可合并内容
   * @param node 待删除节点
   * @param destCaretRange 命令执行后光标位置; 若为 true, 则使用节点被移除位置;
   *    若为 false, 命令执行后不更新选区和上下文; 默认为 true
   */
  removeNodeAndMerge(node: Et.Node, destCaretRange: Et.CaretRange | boolean = true) {
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
}
