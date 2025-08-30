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
import type { Et } from '~/core/@types'

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
    // 执行undo前先判断是否有未入栈命令
    ctx.commandManager.commit()
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
  // 编辑器keydown监听器中使用了异步, 这里就不能用 keydownSolver 了,
  // 需要额外添加一个 keydown 事件来处理分割撤回栈事务
  keydown: (ev, ctx) => {
    if (!ev.repeat && ev.key !== ctx.currDownKey && [
      ' ',
      'Enter',
      'Tab',
      'Backspace',
      'Delete',
    ].includes(ev.key)) {
      ctx.commandManager.commit()
    }
  },
  /** 输入法会话开始时, 将先前命令commit */
  compositionstart: (_ev, ctx) => {
    ctx.commandManager.commit()
  },
  focusout: (_ev, ctx) => {
    // fix. 编辑器blur后触发focusout事件, 并执行相应监听器, 到此处, 整个事件都是同步执行的;
    // 这也意味着先开启事务, 后插入 `<div>aaaI</div>` I代表光标位置, 然后执行 discard,
    // 丢弃该插入, 即删除该`<div>aaa</div>` 则会导致编辑器blur, 然后执行此处的commit,
    // 而discard是需要丢弃该命令的, 就产生了冲突, 即本该丢弃的命令, 却因编辑器失去焦点而先将该命令commit了,
    // 这也是出现 [一些discard了的插入节点命令却在撤销重做时再次插入了这些节点] 的原因\
    // 因此此处应异步执行
    Promise.resolve().then(() => {
      // console.log('focusout ---------------------------- 记录事务')
      ctx.commandManager.commit()
    })
  },
  mousedown: (_ev, ctx) => {
    // console.log('mouse down ---------------------------- 记录事务')
    // 鼠标点击其他地方导致selectionchange时, 应当将先前命令commit;
    // 由于selectionchange比mousedown频繁很多, 因此在此处处理该需求
    ctx.commandManager.commit()
  },
}

export const useUndoEffector = (): Et.EffectorSupportInline => {
  return {
    inline: true,
    enforce: 'pre',
    keyupSolver,
    beforeInputSolver,
    afterInputSolver,
    htmlEventSolver,
    onMounted: (_ctx, signal) => {
      // 防止编辑器外ctrl+z时对编辑器内容撤销
      document.addEventListener('beforeinput', (ev) => {
        if (ev.inputType === 'historyUndo' || ev.inputType === 'historyRedo') {
          // console.warn('document historyUndo or historyRedo', ev.getTargetRanges())
          // 阻止没有targetRange的undo/redo, 编辑器在shadowRoot内, 外边无法获取到, 即targetRanges为空数组
          if (ev.getTargetRanges().length === 0) {
            ev.preventDefault()
          }
          // fixme Mac下document的撤销无法preventDefault, 但并未见异常
        }
      }, { signal: signal })
    },
    /**
     * 卸载时移除对应撤回栈并 确认所有事务
     */
    onBeforeUnmount(ctx) {
      ctx.commandManager.commitAll()
    },
  }
}
