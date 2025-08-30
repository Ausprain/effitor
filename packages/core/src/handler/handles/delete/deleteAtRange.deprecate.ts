/**
 * all in noe
 */
// export const removeInDifferentParagraph = (
//   ctx: Et.UpdatedContext,
//   targetRange: Et.StaticRange,
//   startP: Et.Paragraph,
//   endP: Et.Paragraph,
// ) => {
//   const crange = ConnectedRange.create(targetRange, ctx.bodyEl)
//   if (!crange) {
//     return false
//   }
//   const {
//     startContainer, endContainer,
//     startAncestor: startOuterNode, endAncestor: endOuterNode,
//   } = crange
//   let startPartial, endPartial
//   if (startContainer === startP) {
//     startPartial = startOuterNode
//   }
//   else {
//     startPartial = ConnectedRange.outerNodeUnder(startContainer, startP)
//   }
//   if (endContainer === endP) {
//     endPartial = endOuterNode
//   }
//   else {
//     endPartial = ConnectedRange.outerNodeUnder(endContainer, endP)
//   }
//   const startPrev = startPartial.previousSibling
//   let startNext = startPartial.nextSibling
//   let endNext = endPartial.nextSibling
//   let endPrev = endPartial.previousSibling
//   let execAtInStartP = startPrev ? cr.caretOutEnd(startPrev) : cr.caretInStart(startP)
//   let destCaretRange

//   const cmds: Et.Command[] = []
//   const removeRanges: (Et.SpanRange | null)[] = []
//   // 移除 startOutNode ~ endOuterNode 之间所有节点 (被 range 完全包含)
//   if (startOuterNode.nextSibling && startOuterNode.nextSibling !== endOuterNode) {
//     removeRanges.push(cr.spanRange(startOuterNode.nextSibling, endOuterNode.previousSibling))
//   }

//   // 克隆 startPartial, endPartial 中未被选区包含的内容
//   const [startUnselected, endUnselected] = cloneRangeUnselectedContents(
//     targetRange, startPartial, endPartial, true, true,
//   )

//   // 移除 startOutNode 中被选区包含的后代
//   if (startNext) {
//     removeRanges.push(cr.spanRange(startPartial, startP.lastChild))
//   }
//   else {
//     cmds.push(cmd.removeNode({ node: startPartial }))
//   }
//   if (startOuterNode !== startP) {
//     startPartial = startP.parentNode
//     startNext = startP.nextSibling
//     while (startPartial) {
//       if (startNext) {
//         removeRanges.push(cr.spanRange(startNext, startPartial.lastChild))
//       }
//       if (startPartial === startOuterNode) {
//         startPartial = startNext ? startNext.previousSibling : startPartial.lastChild
//         break
//       }
//       startNext = startPartial.nextSibling
//       startPartial = startPartial.parentNode
//     }
//   }

//   // 移除 endOutNode 中被选区包含的后代
//   // 需先判断移除 endPartial 之后, endP 是否为空, 是否需要连带删除祖先
//   if (!endUnselected.hasChildNodes()) {
//     // 插回内容为空
//     let isEndOuterRemoved = false
//     while (endPartial && !(endNext = endPartial.nextSibling)) {
//       if (endPartial === endOuterNode) {
//         isEndOuterRemoved = true
//         break
//       }
//       endPartial = endPartial.parentNode as Et.HTMLElement
//     }
//     // endOuter被移除, 直接插回前段落内容
//     if (isEndOuterRemoved) {
//       for (const rm of removeRanges) {
//         if (rm) {
//           cmds.push(cmd.removeContent({ removeRange: rm }))
//         }
//       }
//       cmds.push(cmd.removeNode({ node: endPartial as Et.Node }))
//       if (startUnselected.hasChildNodes()) {
//         destCaretRange = cr.caretInEnd(startUnselected.lastChild as Et.Node)
//         cmds.push(cmd.insertContent({
//           content: startUnselected,
//           execAt: execAtInStartP,
//         }))
//       }
//       else {
//         destCaretRange = execAtInStartP
//       }
//       cmds[cmds.length - 1].destCaretRange = destCaretRange
//       ctx.commandManager.push(cmds)
//       return true
//     }
//   }

//   // 移除 endPartial 及之前节点
//   const endPartialFirstSibling = endPartial.parentNode?.firstChild
//   removeRanges.push(cr.spanRange(endPartialFirstSibling, endPartial))

//   endPartial = endPartial.parentNode as Et.HTMLElement
//   if (endPartial !== endOuterNode) {
//     endPrev = endPartial.previousSibling
//     endPartial = endPartial.parentNode
//     while (endPartial) {
//       if (endPrev) {
//         removeRanges.push(cr.spanRange(endPartial.firstChild, endPrev))
//       }
//       if (endPartial === endOuterNode) {
//         endPartial = endPrev ? endPrev.nextSibling : endPartial.firstChild
//         break
//       }
//       endPrev = endPartial.previousSibling
//       endPartial = endPartial.parentNode
//     }
//   }

//   for (const rm of removeRanges) {
//     if (rm) {
//       cmds.push(cmd.removeContent({ removeRange: rm }))
//     }
//   }

//   const isOuterNodeEqual = dom.isEqualNode(startOuterNode, endOuterNode)

//   if (!isOuterNodeEqual || (
//     startOuterNode !== startP && endOuterNode !== endP // 避免重复调用 dom.isEqual, start/endP都不是 outer 时, 才继续判断
//     && !dom.isEqualElement(startP, endP)
//   )) {
//     if (endUnselected.hasChildNodes()) {
//       cmds.push(cmd.insertContent({
//         content: endUnselected,
//         execAt: cr.caretInStart(endP), // 移除命令在先, 此处一定插入 endP 的 0 位置
//       }))
//     }
//     if (startUnselected.hasChildNodes()) {
//       destCaretRange = cr.caretInEnd(startUnselected.lastChild as Et.Node)
//       cmds.push(cmd.insertContent({
//         content: startUnselected,
//         execAt: execAtInStartP,
//       }))
//     }
//     else {
//       destCaretRange = cr.caretInStart(startP)
//     }
//   }
//   // outer相同, 段落相同, 考虑合并, 移除 endP
//   else {
//     cmds.push(cmd.removeNode({ node: endP }))
//     const unselectedMerged = fragmentUtils.getMergedFragmentAndCaret(
//       startUnselected, endUnselected, false, false,
//     )
//     if (unselectedMerged) {
//       cmds.push(cmd.insertContent({
//         content: unselectedMerged[0],
//         execAt: execAtInStartP,
//       }))
//       if (unselectedMerged[0].lastChild) {
//         execAtInStartP = cr.caretOutEnd(unselectedMerged[0].lastChild)
//       }
//       destCaretRange = unselectedMerged[1]
//     }
//     // 插回内容为空, 须判断 startPrev 和 endNext 是否可合并
//     else if (startPrev && endNext && dom.isEqualNode(startPrev, endNext)) {
//       cmds.push(
//         cmd.removeNode({ node: startPrev }),
//         cmd.removeNode({ node: endNext }),
//       )
//       const nodeMerged = fragmentUtils.cloneAndMergeNodesToFragmentAndCaret(
//         startPrev, endNext, true,
//       )
//       execAtInStartP = cr.caretOutStart(startPrev)
//       if (nodeMerged) {
//         cmds.push(cmd.insertContent({
//           content: nodeMerged[0],
//           execAt: execAtInStartP,
//         }))
//         if (nodeMerged[0].lastChild) {
//           execAtInStartP = cr.caretOutEnd(nodeMerged[0].lastChild)
//         }
//         destCaretRange = nodeMerged[1]
//       }
//       else {
//         destCaretRange = execAtInStartP
//       }
//       endNext = endNext.nextSibling
//     }
//     // 将 endP 剩余节点移动到 startP 末尾
//     if (endNext) {
//       const moveRange = cr.spanRange(endNext, endP.lastChild)
//       if (moveRange) {
//         cmds.push(cmd.moveNodes(moveRange, execAtInStartP))
//       }
//     }
//   }

//   if (!isOuterNodeEqual) {
//     cmds[cmds.length - 1].destCaretRange = destCaretRange
//     ctx.commandManager.push(cmds)
//     return true
//   }

//   if (startOuterNode !== startP && endOuterNode !== endP) {
//     if (endPartial === endP) {
//       endPartial = endP.nextSibling
//     }
//     const moveRange = cr.spanRange(endPartial, endOuterNode.lastChild)
//     if (moveRange && startPartial) {
//       cmds.push(cmd.moveNodes(moveRange, cr.caretOutEnd(startPartial)))
//     }
//     cmds.push(cmd.removeNode({ node: endOuterNode }))
//   }
//   ctx.commandManager.push(cmds)
//   return true
// }

/**
 * split
 */
// /** 同父节点下的跨不同段落删除 */
// export const removeInDifferentParagraphWithSameParent = (
//   ctx: Et.UpdatedContext,
//   targetRange: Et.StaticRange,
//   startP: Et.Paragraph, endP: Et.Paragraph,
// ) => {
//   // 两个都是普通段落, 或是相同的效应元素;
//   // 删除前段落内容, 移除后段落及之前的所有段落
//   // 将前段落未选择内容与后段落未选择内容合并, 插入前段落
//   if (startP.isEqualTo(endP)) {
//     const [df1, df2] = cloneRangeUnselectedContents(
//       targetRange, startP, endP, false, true,
//     )
//     const out = fragmentUtils.getMergedFragmentAndCaret(df1, df2, false, false) // 上面已经 clean, 此处不 clean

//     const cmds = []
//     const removeRange1 = cr.spanRangeAllIn(startP)
//     const removeRange2 = cr.spanRange(startP.nextSibling, endP)
//     // removeRange 不存在只有一种情况, 即 段落为空, 且 css 设置了高度, 让光标能落在其中
//     // 此时不用做删除处理
//     if (removeRange1) {
//       cmds.push(cmd.removeContent({
//         removeRange: removeRange1,
//       }))
//     }
//     if (removeRange2) {
//       cmds.push(cmd.removeContent({
//         removeRange: removeRange2,
//       }))
//     }

//     // 若无合并插回内容, 则仅删除
//     if (!out) {
//       cmds[cmds.length - 1].destCaretRange = cr.caretInStart(startP)
//       ctx.commandManager.push(cmds)
//       return true
//     }

//     cmds.push(cmd.insertContent({
//       content: out[0],
//       execAt: cr.caretInStart(startP),
//       destCaretRange: out[1],
//     }))
//     ctx.commandManager.push(cmds)
//   }
//   // 俩段落不同, 移除中间段落
//   // 删除俩段落内容, 并各自插回未选择内容
//   else {
//     const [df1, df2] = cloneRangeUnselectedContents(
//       targetRange, startP, endP, false, true,
//     )

//     const removeInStart = cr.spanRangeAllIn(startP)
//     const removeOfEnd = df2.hasChildNodes()
//       ? cr.spanRangeAllIn(endP)
//       : cr.spanRangeAllOut(endP) // df2没有内容, 即没有剩余内容插入 endP, 将endP 删除
//     const removeBetween = startP.nextSibling === endP
//       ? null
//       : cr.spanRange(startP.nextSibling, endP.previousSibling)

//     addRemoveAndInsertContentCmdsForTwoParagraph(ctx,
//       [removeInStart, removeBetween, removeOfEnd], startP, endP, df1, df2)
//   }
//   return true
// }
// /** 根据删除范围 为两个段落添加删除命令, 并将片段分别插入两个段落, 光标优先置于前片段末尾, 其次后片段开头 */
// const addRemoveAndInsertContentCmdsForTwoParagraph = (
//   ctx: Et.UpdatedContext,
//   removeRanges: (Et.SpanRange | null)[],
//   startP: Et.Paragraph, endP: Et.Paragraph,
//   startContent: Et.Fragment, endContent: Et.Fragment,
// ) => {
//   const cmds = []
//   for (const rm of removeRanges) {
//     if (!rm) continue
//     cmds.push(cmd.removeContent({
//       removeRange: rm,
//     }))
//   }

//   let caretSetted = false
//   if (startContent.hasChildNodes()) {
//     cmds.push(cmd.insertContent({
//       content: startContent,
//       execAt: cr.caretInStart(startP),
//       destCaretRange: cr.caretOutEnd(startContent.lastChild as Et.Node),
//     }))
//     caretSetted = true
//   }
//   if (endContent.hasChildNodes()) {
//     cmds.push(cmd.insertContent({
//       content: endContent,
//       execAt: cr.caretInStart(endP),
//       destCaretRange: caretSetted ? void 0 : cr.caretInStart(endP),
//     }))
//   }
//   ctx.commandManager.push(cmds)
// }
// /**
//  * 同顶层节点, 段落父节点不同, 跨段落删除
//  * @example
//  * <list>  // top, commonAncestor
//  *    <list>
//  *      <listItem></listItem>  // startP
//  *    </list>
//  *    <listItem></listItem>  // endP
//  * <list>
//  *
//  * <list>  // top, commonAncestor
//  *    <listItem></listItem>  // startP
//  *    <list>
//  *      <listItem></listItem>  // endP
//  *    </list>
//  * <list>
//  *
//  * <list>  // top, commonAncestor
//  *    <list>
//  *      <listItem></listItem>  // startP
//  *    </list>
//  *    <list>
//  *      <listItem></listItem>  // endP
//  *    </list>
//  * <list>
//  *
//  * <blockquote>  // top
//  *   <list>  // commonAncestor
//  *      <list>
//  *        <listItem></listItem>  // startP
//  *      </list>
//  *      <listItem></listItem>  // endP
//  *   <list>
//  * </blockquote>
//  *
//  */
// export const removeInDifferentParagraphWithSameTopElement = (
//   ctx: Et.UpdatedContext,
//   targetRange: Et.StaticRange,
//   startP: Et.Paragraph, endP: Et.Paragraph,
//   _topEl: Et.Paragraph,
// ) => {
//   const crange = ConnectedRange.create<Et.HTMLElement>(targetRange, ctx.bodyEl)
//   if (!crange) {
//     return false
//   }
//   // 正常情况下, 在浏览器界面, 用户选择内容时不会出现以下情况, 但脚本选择时会发生,
//   // 比如一个命令在设置命令结束光标位置(destCaretRange)时设置不当; 出现这种情况, 应当禁止删除
//   // <!-- ^ 代表选区起点, | 代表选区终点 -->
//   // <list>  // top, commonAncestor, startP
//   //    ^<listItem></listItem>
//   //    <list>
//   //      <listItem>|</listItem>  // endP
//   //    </list>
//   // <list>
//   if (crange.commonAncestor === startP || crange.commonAncestor === endP) {
//     return false
//   }
//   if (startP.parentNode === endP.parentNode) {
//     return removeInDifferentParagraphWithSameParent(ctx, targetRange, startP, endP)
//   }
//   // FIXME 未处理(移除) startP 和 endP 被 range 包含的兄弟
//   // `ref.`[extractContents](https://dom.spec.whatwg.org/#concept-range-extract)
//   // 1. 获取 partial_contained 节点
//   // 2. 移除 start_partial ~ end_partial 之间的 contained 节点
//   // 3. 克隆 startP, endP 未被选择内容
//   // 4. 移除 startP, endP 内容, 若移除后变为空节点, 在连带删除以其为唯一后代的祖先
//   // 5. 将3.克隆的内容插回各自节点
//   // 6. 光标置于 startP末尾(插回内容非空) 或开头(插回内容为空)
//   const startPartial = traversal.outermostAncestorUnderTheNode(startP, crange.commonAncestor)
//   const endPartial = traversal.outermostAncestorUnderTheNode(endP, crange.commonAncestor)
//   const [df1, df2] = cloneRangeUnselectedContents(
//     targetRange, startP, endP, false, true,
//   )

//   const removeInStart = cr.spanRangeAllIn(startP)
//   const removeOfEnd = df2.hasChildNodes()
//     ? cr.spanRangeAllIn(endP)
//     : cr.spanRangeAllOut(
//         traversal.outermostAncestorWithSelfAsOnlyChildButUnder(endP, crange.commonAncestor),
//       )
//   const removeBetween = startPartial.nextSibling === endPartial
//     ? null
//     : cr.spanRange(startPartial.nextSibling, endPartial.previousSibling)

//   addRemoveAndInsertContentCmdsForTwoParagraph(ctx,
//     [removeInStart, removeBetween, removeOfEnd], startP, endP, df1, df2,
//   )
//   return true
// }
// /**
//  * 跨不同顶层节点删除
//  * @example
//  * <et-body>  // commonAncestor
//  *    <blockquote>  // startTop
//  *       <p></p>  // startP
//  *    </blockquote>
//  *    <blockquote>  // endTop
//  *       <p></p>  // endP
//  *    </blockquote>
//  * </et-body>
//  *
//  * <et-body>  // commonAncestor
//  *    <blockquote>  // startTop
//  *       <p></p>  // startP
//  *    </blockquote>
//  *    <other-top></other-top>  // endTop, endP
//  * </et-body>
//  *
//  */
// export const removeInDifferentTopElement = (
//   ctx: Et.UpdatedContext,
//   targetRange: Et.StaticRange,
//   _startP: Et.Paragraph, _endP: Et.Paragraph,
//   startTop: Et.Paragraph, endTop: Et.Paragraph,
// ) => {
//   // 顶层节点相同, 删除选择, 合并剩余内容
//   if (startTop.isEqualTo(endTop)) {
//     // 类似 removeInDifferentParagraphWithSameParent
//     // 但此处需要将顶层节点也包含进克隆范围, 即顶层节点也要删除重插
//     // 避免插入空顶层节点, 或插回顶层节点不合法的问题
//     // FIXME 其实重插也存在这样的问题, 而且顶层节点不是很应该被删除重插
//     const [df1, df2] = cloneRangeUnselectedContents(
//       targetRange, startTop, endTop, true, true,
//     )
//     const out = fragmentUtils.getMergedFragmentAndCaret(df1, df2, false, false)
//     const removeRange = cr.spanRange(startTop, endTop)
//     if (!out || !removeRange) {
//       return false
//     }

//     const cmds: Et.Command[] = [
//       cmd.removeContent({
//         removeRange,
//       }),
//     ]

//     if (out[0].hasChildNodes()) {
//       cmds.push(cmd.insertContent({
//         content: out[0],
//         execAt: cr.caretOutStart(startTop),
//         destCaretRange: out[1],
//       }))
//     }
//     else {
//       // 合并内容为空, 若编辑区删除 startTop 和 endTop 后无内容,
//       // 则需要补充一个段落 (编辑区必须至少有一个段落)
//       let nextTop = startTop.previousSibling
//       if (nextTop) {
//         ctx.setCaretToAParagraph(nextTop, false)
//       }
//       else {
//         nextTop = endTop.nextSibling
//         if (nextTop) {
//           ctx.setCaretToAParagraph(nextTop, true)
//         }
//         else {
//           nextTop = ctx.createParagraph()
//           cmds.push(cmd.insertNode({
//             node: nextTop,
//             execAt: cr.caretOutStart(startTop),
//             destCaretRange: cr.caretInStart(nextTop),
//           }))
//         }
//       }
//     }
//     ctx.commandManager.push(cmds)
//   }
//   // 顶层节点不同, 删除选择部分, 插回剩余内容
//   else {
//     const [df1, df2] = cloneRangeUnselectedContents(
//       targetRange, startTop, endTop, true, false,
//     )
//     // 克隆出来的片段, 必定有且只有一个子元素 (即顶层节点的克隆)
//     if (df1.childElementCount !== 1 || df2.childElementCount !== 1) {
//       return false
//     }
//     // 使用构造器校验剩余内容是否规范
//     const startTopCtor = ctx.effectInvoker.getEtElCtor(startTop)
//     const endTopCtor = ctx.effectInvoker.getEtElCtor(endTop)
//     const normalStartTop = startTopCtor.getNormalized(df1.firstElementChild as Et.Paragraph)
//     const normalEndTop = endTopCtor.getNormalized(df2.firstElementChild as Et.Paragraph)

//     const cmds: Et.Command[] = []

//     let removeRange, removeStart, removeEnd, destCaretRange = null, bothRemoved = false
//     // startTop 的未选择部分是规范的, 不用删除 startTop, 只需删除其内容, 然后插回规范内容即可
//     if (normalStartTop) {
//       removeRange = cr.spanRangeAllIn(startTop)
//       if (removeRange) {
//         cmds.push(cmd.removeContent({ removeRange }))
//       }
//       const content = dom.extractElementContents(normalStartTop)
//       cmds.push(cmd.insertContent({
//         content,
//         execAt: cr.caretInStart(startTop),
//       }))
//       destCaretRange = content.lastChild
//         ? cr.caretInEnd(content.lastChild)
//         : cr.caretInStart(startTop)
//       removeStart = startTop.nextSibling === endTop ? null : startTop.nextSibling
//     }
//     // 不规范, 整个删除, 不需要插回
//     else {
//       bothRemoved = true
//       removeStart = startTop
//     }
//     if (normalEndTop) {
//       removeRange = cr.spanRangeAllIn(endTop)
//       if (removeRange) {
//         cmds.push(cmd.removeContent({ removeRange }))
//       }
//       const content = dom.extractElementContents(normalEndTop)
//       cmds.push(cmd.insertContent({
//         content,
//         execAt: cr.caretInStart(endTop),
//       }))
//       // 只有 startTop 被移除了, 才会把命令结束光标位置设置在 endTop 内
//       if (bothRemoved) {
//         destCaretRange = content.firstChild
//           ? cr.caretInStart(content.firstChild)
//           : cr.caretInStart(endTop)
//       }
//       bothRemoved = false
//       removeEnd = endTop.previousSibling === startTop ? null : endTop.previousSibling
//     }
//     else {
//       removeEnd = endTop
//     }

//     if (removeStart && removeEnd) {
//       removeRange = cr.spanRange(removeStart, removeEnd)
//     }
//     else if (removeStart) {
//       removeRange = cr.spanRangeAllOut(removeStart)
//     }
//     else if (removeEnd) {
//       removeRange = cr.spanRangeAllOut(removeEnd)
//     }

//     if (removeRange) {
//       cmds.push(cmd.removeContent({ removeRange }))
//     }

//     // 若两个都被删除了, 要判断编辑区是否为空
//     if (bothRemoved) {
//       let nextTop = startTop.previousSibling
//       if (nextTop) {
//         ctx.setCaretToAParagraph(nextTop, false)
//         nextTop = null
//       }
//       else {
//         nextTop = endTop.nextSibling
//       }
//       if (nextTop) {
//         ctx.setCaretToAParagraph(nextTop, true)
//       }
//       else {
//         nextTop = ctx.createParagraph()
//         destCaretRange = cr.caretInStart(nextTop)
//         cmds.push(cmd.insertNode({
//           node: nextTop,
//           execAt: cr.caretInStart(ctx.bodyEl),
//         }))
//       }
//     }
//     cmds[cmds.length - 1].destCaretRange = destCaretRange ?? void 0
//     ctx.commandManager.push(cmds)
//   }
//   return true
// }
