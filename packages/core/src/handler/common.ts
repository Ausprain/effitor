// /**
//  * 通用效应处理器, 这是对十个命令的封装, 自带效应元素校验, 以保证文档结构的规范性
//  * todo
//  * - [ ] insertNodeAtCaret 添加一个etCode参数, 若node是效应元素则为node.etCode, 否则为其下最外层效应元素的etCode的或; 无效应元素则为0
//  * - [ ] duplicateParagraph 克隆一份当前光标所在段落(的空节点), 并插入当前段落前/后; 不局限于纯段落, 只要etcode验证为段落
//  *
//  */

// import type { Et } from '~/core/@types'
// import { etcode } from '../element'
// import { EtTypeEnum, HtmlCharEnum } from '../enums'
// import { cr } from '../selection'
// import { dom } from '../utils'
// import { cmd } from './command'
// import {
//   insertContentAtCaret,
//   insertNodeAtCaret,
//   removeNodeAndMerge,
//   removeRangingContents,
//   replaceNodeAndMerge,
// } from './utils/fragment'

// const caretToNextTextStart = (ctx: Et.UpdatedContext, effectEl: Et.EtElement): boolean => {
//   let next: Et.NullableNode = effectEl.nextSibling
//   if (!next || next.localName === 'br') {
//     // 没有下一节点`or`下一节点是<br>, 插入零宽字符;
//     // 以解决mark节点定位到 节点外结尾无效的问题（会自动定位到内结尾）
//     let node: Et.HTMLNode, destCaretRange: Et.EtCaret, execAt: Et.EtCaret
//     if (etcode.check(effectEl, EtTypeEnum.Block)) {
//       // 要跳出块元素, 插入一个段落
//       node = ctx.cloneParagraph()
//       destCaretRange = cr.caretInStart(node)
//       execAt = cr.caretOutEnd(ctx.paragraphEl)
//     }
//     else {
//       // 跳出内联元素, 插入零宽字符
//       node = dom.zwsText()
//       destCaretRange = cr.caret(node, 1)
//       execAt = cr.caretOutEnd(effectEl)
//     }
//     ctx.commandManager.push('Insert_Node', {
//       node,
//       execAt,
//       destCaretRange,
//     })
//     return true
//   }
//   next = dom.innermostEditableStartingNode(next)
//   if (!dom.isText(next)) {
//     // 不是文本节点, 定位至外开头
//     ctx.selection.caretTo(next, -1)
//   }
//   else if (next.data[0] === HtmlCharEnum.ZERO_WIDTH_SPACE) {
//     // 零宽字符开头
//     ctx.selection.caretTo(next, 1)
//   }
//   else {
//     // 插入零宽字符
//     ctx.commandManager.push('Insert_Text', {
//       data: HtmlCharEnum.ZERO_WIDTH_SPACE,
//       text: next,
//       offset: 0,
//       destCaretRange: cr.caret(next, 1),
//     })
//   }
//   return true
// }
// const caretToOuterRichNode = (ctx: Et.UpdatedContext) => {
//   // 上游未判断是否满足 双空格移动光标 的条件
//   // 最外层样式节点
//   let receiver: Et.EtElement | null = null
//   let el = ctx.effectElement as Et.HTMLElement | null

//   while (el && etcode.check(el, EtTypeEnum.CaretOut)) {
//     receiver = el
//     el = el.parentNode
//   }
//   // 不满足条件, 退出
//   if (!receiver) return false
//   // 有文本节点且上一个字符为空格, 移除上一个空格
//   const text = ctx.selection.anchorText, offset = ctx.selection.anchorOffset
//   if (text && text.data[offset - 1] === '\x20') {
//     ctx.commandManager.push('Delete_Text', {
//       text,
//       data: '\x20',
//       offset: offset - 1,
//       isBackward: true,
//     })
//   }
//   // 寻找下一文本节点
//   return caretToNextTextStart(ctx, receiver)
// }

// /**
//  * 通用效应处理器, 不依赖效应元素激活效应(跳过effectInvoker), 直接处理指定效应
//  */
// export const commonHandlers = {
//   /**
//   * 按下tab将光标跳至当前效应元素（richtext或component）外结尾（即下一节点文本开头,
//   * 若光标无法定位到下一节点文本开头, 则会插入一个零宽字符
//   * @returns 该效应是否触发并handle
//   */
//   tabout: (ctx: Et.UpdatedContext) => {
//     // 上游已判定效应元素为richtext或component
//     caretToNextTextStart(ctx, ctx.effectElement)
//     return ctx.commandManager.handle()
//   },
//   /**
//    * 双击空格跳出最外层样式节点(richtext, component), 在keydown内触发;
//    * 类似的, Tab只跳出当前样式节点
//    * @returns 该效应是否触发并handle
//    */
//   dblSpace: (ctx: Et.UpdatedContext) => {
//     caretToOuterRichNode(ctx)
//     return ctx.commandManager.handle()
//   },

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

//     ctx.dispatchInputEvent('input', {
//       inputType: 'insertParagraph',
//     })
//     return true
//   },

//   /** 在当前光标位置插入文本 */
//   insertTextAtCaret(ctx: Et.UpdatedContext, data: string, destCaretRange?: Et.CaretRange) {
//     insertTextAtCaret(data, ctx)
//     return ctx.commandManager.handle(destCaretRange)
//   },
//   /**
//      * 在当前光标位置插入一个节点, 若当前光标为range, 则会先collapse到末尾; 若希望删除选区内容, 可先调用 removeRangingContents
//      */
//   insertNodeAtCaret(ctx: Et.UpdatedContext, node: Et.HTMLNode, destCaretRange?: Et.CaretRange) {
//     insertNodeAtCaret(ctx, node)
//     return ctx.commandManager.handle(destCaretRange)
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
//   /**
//    * 删除指定节点, 并合并前后可合并内容
//    * @param node 待删除节点
//    * @param [setCaret=true] 是否设置光标位置
//    */
//   removeNodeAndMerge(
//     ctx: Et.UpdatedContext, node: Et.HTMLNode, setCaret = true, destCaretRange?: Et.CaretRange,
//   ) {
//     removeNodeAndMerge(ctx, node, setCaret)
//     return ctx.commandManager.handle(destCaretRange)
//   },
//   /**
//    * 移除当前选区内容, 若collapsed, 则直接返回
//    * @param isBackward 是否向后删除, 一半不用处理该参数
//    * @param destCaretRange 最终光标位置
//    */
//   removeRangingContents(ctx: Et.UpdatedContext, isBackward = true, destCaretRange?: Et.CaretRange) {
//     removeRangingContents(ctx, isBackward)
//     const res = ctx.commandManager.handle(destCaretRange)
//     // 删除选区后必须强制更新光标位置
//     ctx.setSelection()
//     return res
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

export const commonHandlers = {}
export type CommonHandlers = typeof commonHandlers
