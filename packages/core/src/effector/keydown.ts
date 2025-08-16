import type { Et } from '..'
import { platform } from '../config'
import { etcode } from '../element'
import { EtTypeEnum } from '../enums'
import { modKey } from '../hotkey/manager'

/**
 * 判断用户Backspace期望删除的内容是否为`uneditable`的内容; 是则需手动构造targetRange发送 beforeinput事件（`inputType="deleteContentBackward"`）,
 *  因为chromium会直接找上一个可编辑节点, 然后删除中间所有内容, 而不是只删除上一个
 * * **调用前提`ctx.selection.isCollapsed === true`**
 */

// TODO 该逻辑应放到 handler 里
// const checkBackspaceInUneditable = (ev: KeyboardEvent, ctx: Et.UpdatedContext) => {
//   if (ctx.node && ctx.selection.anchorOffset) return
//   let delTargetRange: StaticRange
//   let prevNode: Et.NullableNode = ctx.selection.prevNode
//   if (!prevNode) return
//   // 文档树上一节点可编辑, 删除内部
//   // 这么做是因为, 当遇到交叉嵌套contenteditable时, 光标无法自动跳到内层的contenteditable中, 需要手动设置删除的targetRange
//   if (dom.isEditableNode(prevNode)) {
//     if (dom.isText(prevNode) && prevNode.length > 0) {
//       delTargetRange = new StaticRange({
//         startContainer: prevNode,
//         startOffset: prevNode.length - 1,
//         endContainer: prevNode,
//         endOffset: prevNode.length,
//       })
//     }
//     else {
//       delTargetRange = dom.caretStaticRangeOutNode(prevNode, 0)
//     }
//   }
//   // 文档树上一节点不可编辑, 找最外层不可编辑节点, 整体删除
//   else {
//     prevNode = dom.outermostUneditableAncestor(prevNode)
//     delTargetRange = dom.caretStaticRangeOutNode(prevNode, 0)
//   }

//   ctx.dispatchInputEvent('beforeinput', {
//     inputType: 'deleteWordBackward',
//     targetRanges: [delTargetRange],
//   })
//   ev.preventDefault()
// }
/**
 * 判断用户Delete期望删除的内容是否为uneditable内容, 是则需手动构造targetRange 发送beforeinput事件（ inputType="deleteContentForward" ）
 * * **调用前提`ctx.selection.isCollapsed === true`**
 */
// const checkDeleteInUneditable = (ev: KeyboardEvent, ctx: Et.UpdatedContext) => {
//   // 不是文本节点末尾, 跳过
//   if (!ctx.node || ctx.selection.anchorOffset !== ctx.node.length) return
//   let nextNode: Node | null = ctx.selection.nextNode
//   let delTargetRange: StaticRange

//   if (!nextNode) return
//   if (dom.isEditableNode(nextNode)) {
//     if (dom.isText(nextNode) && nextNode.length > 0) {
//       delTargetRange = new StaticRange({
//         startContainer: nextNode,
//         startOffset: 0,
//         endContainer: nextNode,
//         endOffset: 1,
//       })
//     }
//     else {
//       delTargetRange = dom.caretStaticRangeOutNode(nextNode, 0)
//     }
//   }
//   else {
//     nextNode = dom.outermostUneditableAncestor(nextNode)
//     delTargetRange = dom.caretStaticRangeOutNode(nextNode, 0)
//   }

//   ctx.dispatchInputEvent('beforeinput', {
//     inputType: 'deleteContentForward',
//     targetRanges: [delTargetRange],
//   })
//   ev.preventDefault()
// }

// main solver 的 action 不同于插件, 是不需要返回值的, 这里写一个工具类允许不返回值
export type MainKeyboardSolver = {
  [K in keyof Et.KeyboardKeySolver]: (ev: KeyboardEvent, ctx: Et.UpdatedContext) => void
}

const keydownKeySolver: MainKeyboardSolver = {
  'default': (ev) => {
    // 编辑器内禁用ctrl+r,ctrl+p等浏览器快捷键
    // 凡事伴随按下ctrl或meta的按键，若非额外定义，则过滤;
    if (ev.ctrlKey || ev.metaKey) {
      ev.preventDefault()
      ev.stopPropagation()
    }
  },
  ' ': (ev, ctx) => {
    if (ctx.prevUpKey === ' ' && (
    // 双击空格跳出组件or富文本节点
      etcode.check(ctx.effectElement, EtTypeEnum.CaretOut)
    )) {
      if (ctx.commonHandlers.dblSpace(ctx)) {
        ev.preventDefault()
      }
    }
  },
  // 'A': (ev, ctx) => { /** 放行默认全选 */
  //   if ((!ev.metaKey && !ev.ctrlKey) || ev.shiftKey || ev.altKey) {
  //     return
  //   }

  //   // FIXME Mac中, 连续的第二下 cmd+a 会被系统接管, 此处监听不到

  //   const rangeLevel = ctx.selection.rangeLevel
  //   if (rangeLevel === 0) {
  //     if (ctx.currDownKey === 'a') {
  //       // 上一个按键是全选
  //       ctx.selection.selectNodeContents(ctx.body, true)
  //     }
  //     else {
  //       ctx.selection.selectNodeContents(ctx.paragraphEl, true)
  //     }
  //     return ctx.preventAndSkipDefault(ev)
  //   }
  // },
  'C': () => { /** 放行默认复制 */ },
  'V': () => { /** 放行默认粘贴 */ },
  'X': () => { /** 放行默认剪切 */ },
  'ArrowDown': () => { /** 放行方向键 */ },
  'ArrowLeft': () => { /** 放行方向键 */ },
  'ArrowRight': () => { /** 放行方向键 */ },
  'ArrowUp': () => { /** 放行方向键 */ },

  'Tab': (ev) => {
    // tab效应移动到keyup中
    ev.preventDefault()
  },

  'Enter': (ev, ctx) => {
    if (ev.isComposing) return
    ev.preventDefault()

    if (ev.shiftKey) {
      if (etcode.check(ctx.paragraphEl, EtTypeEnum.Heading)) {
        // 标题内禁用软换行
        return
      }
      // 插入软换行 (其实是硬换行<br>, 只是inputType叫软换行)
      ctx.dispatchInputEvent('beforeinput', {
        inputType: 'insertLineBreak',
      })
    }
    else if (platform.isMac ? ev.metaKey : ev.ctrlKey) {
      // 当前段落后边插入新段落
      ctx.commonHandlers.appendParagraph(ctx)
    }
    else {
      ctx.dispatchInputEvent('beforeinput', {
        inputType: 'insertParagraph',
      })
    }
  },
  'Backspace': () => {
    // TODO 放 handler 中处理
  //   if (!ctx.selection.isCollapsed || !ctx.selection.anchorText) return
  //   // 毗邻零宽字符, 移动光标
  //   // fixme 这项操作是为了提高编辑体验的; 当光标位于样式节点内末尾, 继续输入文本时会产生「样式连带」现象
  //   // 虽然effitor可以通过按下tab键跳出样式节点; 但此行为不符合用户心理预期,
  //   // 如文档末尾是一个样式节点, 然后鼠标点击文档末尾, 光标聚焦到文档末尾;
  //   // 此时用户希望在文档末尾输入无样式文本, 可是由于光标聚焦在样式节点内末尾, 输入的内容会连带该样式
  //   // 当用户发现时, 又需要删除刚刚输入的内容然后按tab跳出该样式节点; 总而言之, 这不是好的编辑体验
  //   if (dom.checkAbutZeroWidthSpace(ctx.selection.anchorText, ctx.selection.anchorOffset, true)) {
  //     // import.meta.env.DEV && console.warn('backspace move caret')
  //     ctx.selection.modify(['move', 'backward', 'character'])
  //   }
  //   checkBackspaceInUneditable(ev, ctx)
  // },
  // 'Delete': (ev, ctx) => {
  //   if (!ctx.selection.isCollapsed || !ctx.selection.anchorText) return
  //   if (dom.checkAbutZeroWidthSpace(ctx.selection.anchorText, ctx.selection.anchorOffset, false)) {
  //     // import.meta.env.DEV && console.warn('delete move caret')
  //     ctx.selection.modify(['move', 'forward', 'character'])
  //   }
  //   checkDeleteInUneditable(ev, ctx)
  },
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class MainKeydownKeySolver implements Et.KeyboardKeySolver {
  [k: string]: Et.KeyboardAction | undefined
}
Object.assign(MainKeydownKeySolver.prototype, keydownKeySolver)

export const runKeyboardSolver = (
  ev: Et.KeyboardEvent, ctx: Et.UpdatedContext,
  main: Et.KeyboardKeySolver, solver?: Et.KeyboardKeySolver,
) => {
  const key = ev.key.length === 1 ? ev.key.toUpperCase() : ev.key

  let fn
  if (solver) {
    fn = solver[key as keyof typeof solver] ?? solver.default
    if (typeof fn === 'function') {
      fn(ev, ctx)
    }
  }
  // ctx标记skipDefault跳过默认effector
  if (ctx.skipDefault) return (ctx.skipDefault = false)

  // mainKeydownSolver需要在其他效应器后执行, 因为会dispatch beforeinput事件；如果先执行, 就会先执行beforeinput再执行其他keydownSolver
  fn = main[key as keyof typeof main] || main['default']
  if (typeof fn === 'function') {
    fn(ev, ctx)
  }
}

export const getKeydownListener = (
  ctx: Et.UpdatedContext, main: MainKeydownKeySolver, solver?: Et.KeyboardKeySolver,
) => {
  return (ev: Et.KeyboardEvent) => {
    // 没有effectElement 或没有选区 阻止后续输入
    if (!ctx.effectElement || !ctx.selection.range) {
      if (import.meta.env.DEV) {
        console.error('keydown error: no effectelement', ctx)
      }
      ev.preventDefault()
      ev.stopPropagation()
      // 强制编辑器失去焦点
      ctx.editor.blur()
      return
    }
    ctx.modkey = modKey(ev)
    // fix. chromium存在输入法会话结束后并未触发compositionend事件的情况,
    // 因此需要在此赋值, 避免ctx.inCompositionSession未能在输入法结束后赋值为false
    if (!ev.repeat && !(ctx.inCompositionSession = ev.isComposing)) {
      // TODO 分级监听 packages/core/src/hotkey/builtin.ts
      // 监听快捷键
      if (ctx.hotkeyManager.listen(ctx.modkey)) {
        return (ev.preventDefault(), ev.stopPropagation())
      }
      // 监听热字符串
      if (!ev.repeat && ev.key === ' ' && ctx.hotstringManager.listen(' ')) {
        return (ev.preventDefault(), ev.stopPropagation())
      }
    }
    runKeyboardSolver(ev, ctx, main, solver)

    ctx.currDownKey = ev.key
    // 若光标为Range, 设为null, 并在keyup中跳过
    ctx.prevUpKey = ctx.selection.isCollapsed ? undefined : null
  }
}
