/**
 * 指定哪些行为需要记录一次撤回栈事务, 即哪些行为会产生一个撤回/重做的原子动作
 * 1. 光标移动: selectionchange
 *      此处通过 mousedown, 和方向键 (ArrowUp/Down/Left/Right PageUp/Down  Home End) 的keyup 来实现
 *      以轻量化selectionchange, 提高性能
 * 2. 排版字符
 *      Enter, Space, Tab
 * 3. 删除行为
 *      Backspace, Delete
 */
import { BuiltinConfig } from '@effitor/shared'

import type { Et } from '../@types'

const beforeKeydownSolver: Et.KeyboardKeySolver = {
  ' ': (ev, ctx) => (!ev.repeat && ev.key !== ctx.currDownKey && ctx.commandManager.commit(), false),
  'Enter': (ev, ctx) => (!ev.repeat && ev.key !== ctx.currDownKey && ctx.commandManager.commit(), false),
  'Tab': (ev, ctx) => (!ev.repeat && ev.key !== ctx.currDownKey && ctx.commandManager.commit(), false),
  'Backspace': (ev, ctx) => (!ev.repeat && ev.key !== ctx.currDownKey && ctx.commandManager.commit(), false),
  'Delete': (ev, ctx) => (!ev.repeat && ev.key !== ctx.currDownKey && ctx.commandManager.commit(), false),
}

const keyupSolver: Et.KeyboardKeySolver = {
  ArrowDown: (_ev, ctx) => (ctx.commandManager.commit(), false), // 需要返回false, 确保后续插件能执行
  ArrowLeft: (_ev, ctx) => (ctx.commandManager.commit(), false),
  ArrowRight: (_ev, ctx) => (ctx.commandManager.commit(), false),
  ArrowUp: (_ev, ctx) => (ctx.commandManager.commit(), false),
  Home: (_ev, ctx) => (ctx.commandManager.commit(), false),
  End: (_ev, ctx) => (ctx.commandManager.commit(), false),
  PageUp: (_ev, ctx) => (ctx.commandManager.commit(), false),
  PageDown: (_ev, ctx) => (ctx.commandManager.commit(), false),
}
const afterInputSolver: Et.InputTypeSolver = {
  insertParagraph: (_ev, ctx) => (ctx.commandManager.commit(), false),
  insertLineBreak: (_ev, ctx) => (ctx.commandManager.commit(), false),
  insertFromPaste: (_ev, ctx) => (ctx.commandManager.commit(), false),
  // insertFromDrop: (_ev, ctx) => ctx.commandHandler.commit(),
  deleteWordBackward: (_ev, ctx) => (ctx.commandManager.commit(), false),
  deleteWordForward: (_ev, ctx) => (ctx.commandManager.commit(), false),
}
const beforeInputSolver: Et.InputTypeSolver = {
  historyUndo: (ev, ctx) => {
    ctx.commandManager.undoTransaction()
    ev.preventDefault()
    return true
  },
  historyRedo: (ev, ctx) => {
    ctx.commandManager.redoTransaction()
    ev.preventDefault()
    return true
  },
}

const htmlEventSolver: Et.HTMLEventSolver = {
  /** 输入法会话开始时, 将先前命令commit */
  compositionstart: (_ev, ctx) => {
    ctx.commandManager.commit()
  },
  focusout: (_ev, ctx) => {
    // console.log('focusout ---------------------------- 记录事务')
    ctx.commandManager.commit()
  },
  mousedown: (_ev, ctx) => {
    // console.log('mouse down ---------------------------- 记录事务')
    // 鼠标点击其他地方导致selectionchange时, 应当将先前命令commit;
    // 由于selectionchange比mousedown频繁很多, 因此在此处处理该需求
    ctx.commandManager.commit()
  },
}

const undoEffector: Et.Effector = {
  enforce: 'pre',
  beforeKeydownSolver,
  keyupSolver,
  beforeInputSolver,
  afterInputSolver,
  htmlEventSolver,
  // onMounted: (_ctx, signal) => {
  //   // 防止编辑器外ctrl+z时对编辑器内容撤销
  //   document.addEventListener('beforeinput', (ev) => {
  //     if (ev.inputType === 'historyUndo' || ev.inputType === 'historyRedo') {
  //       // console.warn('document historyUndo or historyRedo', ev.getTargetRanges())
  //       // 阻止没有targetRange的undo/redo, 编辑器在shadowRoot内, 外边无法获取到, 即targetRanges为空数组
  //       if (ev.getTargetRanges().length === 0) {
  //         ev.preventDefault()
  //       }
  //       // fixme Mac下document的撤销无法preventDefault, 但并未见异常
  //     }
  //   }, { signal: signal })
  // },
  /**
   * 卸载确认所有事务并清空撤回栈
   */
  onBeforeUnmount(ctx) {
    ctx.commandManager.commitAll()
  },
}

export const useUndo = (): Et.EditorPlugin => {
  return { name: BuiltinConfig.BUILTIN_UNDO_PLUGIN_NAME, effector: undoEffector }
}
