import type { Et } from '~/core/@types'
import { cr } from '~/core/selection'

import type {
  CmdDeleteText,
  CmdInsertText,
  ExecutedCmd,
  ExecutedInsertCompositionText,
} from './cmds'
import { cmd, cmdHandler, CmdType } from './cmds'

/**
 * 撤回栈事务
 */
interface UndoTransaction {
  /** 命令长度 */
  length: number
  cmds: ExecutedCmd[]
  srcCaretRange: Et.CaretRange | null | undefined
  destCaretRange: Et.CaretRange | null | undefined
  /** 命令事务最终最终回调, 在事务被挤出撤回栈 或 编辑器unmount时执行; 会依次执行其中所有命令的 finalCallback */
  tranxFinalCallback: (ctx: Et.EditorContext) => void
}
/**
 * 命令撤回栈, 会根据情况自动合并命令, 并记录在一个撤回栈事务中; 以命令事务为单位进行撤回/重做
 */
export class UndoStack {
  /** 命令暂存区 */
  private readonly cmdList: ExecutedCmd[]
  /** 命令事务栈 */
  private readonly transactionStack: UndoTransaction[]
  /** 撤回栈最大长度 */
  readonly size: number
  /** 当前撤回栈指针位置 */
  private _pos: number

  constructor(size: number) {
    this.size = size
    this._pos = 0
    this.cmdList = []
    this.transactionStack = []
  }

  /** 当前撤回栈长度 */
  get stackLength() {
    return this.transactionStack.length
  }

  /** 当前记录的未commit的命令是否为空 */
  get isEmptyRecord() {
    return this.cmdList.length === 0
  }

  /**
   * 记录一组命令到暂存区, 这些命令是已经执行了的
   */
  record(cmds: readonly ExecutedCmd[]) {
    if (cmds.length) {
      this.cmdList.push(...cmds)
    }
  }

  /**
   * 丢弃暂存区的所有命令, 并逆序依次撤回
   */
  discard(ctx: Et.EditorContext) {
    if (!this.cmdList.length) {
      return false
    }
    let hasInsertCompositionText = false
    for (const cmd of this.cmdList) {
      if (cmd.type === CmdType.Insert_Composition_Text) {
        hasInsertCompositionText = true
        break
      }
    }
    if (hasInsertCompositionText) {
      // 有输入法命令, 先合并成事务 再撤销; 否则输入法插入内容无法discard

      this.pushTransaction(ctx)
      this.undo(ctx)
      return true
    }

    cmdHandler.handleUndo(this.cmdList, ctx)
    this.cmdList.length = 0

    return true
  }

  /**
   * 清空撤回栈，final所有命令
   */
  commitAll(ctx: Et.EditorContext) {
    this.transactionStack.forEach(x => x.tranxFinalCallback(ctx))
    this.transactionStack.length = 0
    this._pos = 0
  }

  /**
   * 合并暂存命令为一个撤回栈事务, 并压入撤回栈
   */
  pushTransaction(ctx: Et.EditorContext) {
    if (this.isEmptyRecord) {
      return false
    }
    const tranx = buildTransaction(this.cmdList, ctx)
    if (!tranx || !tranx.length) {
      return false
    }
    this.transactionStack[this._pos] = tranx
    if (this._pos + 1 > this.size) {
      const firstX = this.transactionStack.shift()
      firstX?.tranxFinalCallback(ctx)
    }
    else {
      this._pos++
    }
    this.transactionStack.length = this._pos
    this.cmdList.length = 0

    return true
  }

  undo(ctx: Et.EditorContext) {
    if (this._pos <= 0) {
      // this.pos = 0
      return
    }
    const tranx = this.transactionStack[--this._pos]
    cmdHandler.handleUndo(tranx.cmds, ctx)
  }

  redo(ctx: Et.EditorContext) {
    if (this._pos >= this.transactionStack.length) {
      // this.pos = this.transactionStack.length
      return
    }
    const tranx = this.transactionStack[this._pos++]
    cmdHandler.handleRedo(tranx.cmds, ctx)
  }

  /**
     * 获取下一个undo操作的光标基准位置, 即上一个事务的光标结束位置destCaretRange,
     * 因为执行undo前, srcCaretRange可能不在页面上(获取该位置没有意义) \
     * 仅用于虚拟滚动判断撤销操作的内容是否在虚拟片段里
     */
  undoCaretRange() {
    if (this._pos <= 0) {
      return null
    }
    return this.transactionStack[this._pos - 1].destCaretRange // 这里应该拿dest, 而非src
  }

  /**
   * 获取下一个redo操作的光标基准位置, 即下一个事务的光标起始位置srcCaretRange,
   * 因为执行redo前, destCaretRange可能不在页面上(获取该位置没有意义) \
   * 仅用于虚拟滚动判断撤销操作的内容是否在虚拟片段里
   */
  redoCaretRange() {
    if (this._pos >= this.transactionStack.length) {
      return null
    }
    return this.transactionStack[this._pos].srcCaretRange
  }
}

const buildTransaction = (cmds: ExecutedCmd[], ctx: Et.EditorContext): UndoTransaction | null => {
  cmds = checkMergeCmdInsertTextOrDeleteText(checkMergeCmdInsertCompositionText(cmds, ctx))

  // 合并命令长度为0, 只有一种情况, 就是输入法输入时, 用户主动删除了输入法会话内的构造串, 此时返回null
  return cmds.length === 0
    ? null
    : {
        cmds,
        length: cmds.length,
        srcCaretRange: cmds[0].srcCaretRange,
        destCaretRange: cmds[cmds.length - 1].destCaretRange,
        tranxFinalCallback(ctx) {
          for (const cmd of cmds) {
            cmd.finalCallback?.(ctx)
          }
        },
      }
}

/**
 * 合并连续的Insert_Text或Delete_Text命令
 */
const checkMergeCmdInsertTextOrDeleteText = (cmds: ExecutedCmd[]) => {
  const out: ExecutedCmd[] = []

  for (let i = 0; i < cmds.length; i++) {
    const _cmd = cmds[i] as CmdInsertText | CmdDeleteText
    if (_cmd.type === CmdType.Insert_Text) { // Insert_Text
      let j = i + 1
      let insertedData = _cmd.data
      while (j < cmds.length) {
        const nextCmd = cmds[j] as CmdInsertText
        if (nextCmd.type !== CmdType.Insert_Text || nextCmd.text !== _cmd.text) {
          break
        }
        insertedData += nextCmd.data
        _cmd.destCaretRange = nextCmd.destCaretRange
        j++
      }
      // 需要合并InsertText
      if (j !== i + 1) {
        // @ts-expect-error no error; force amend, to reuse first cmd
        _cmd.data = insertedData
        out.push(_cmd)
        i = j - 1
        continue
      }
      // 否则直接添加 (放到最后)
    }
    else if (_cmd.type === CmdType.Delete_Text) { // Delete_Text
      let j = i + 1
      let delelteDataBuffer = _cmd.data
      let lastCmd: CmdDeleteText | null = null, nextCmd
      while (j < cmds.length) {
        nextCmd = cmds[j] as CmdDeleteText
        // 1. 不同的删除方向应当另起一个合并, 因为commandManager开启事务时, 不同删除方向可能出现在同一个命令事务内
        //    如文本`0aa bbb dde`开启事务, 先back删除`aa`, 然后光标移动到dd,
        //    删除`dd`, 最终变为`0 bbb e`, 此时关闭事务, 撤销删除, 就会变成: `0 bbb aadde`
        //    因为同一事务内相邻的deleteText命令合并了, 因此有必要分开合并不同方向的deleteText命令
        if (nextCmd.type !== CmdType.Delete_Text
          || nextCmd.text !== _cmd.text
          || nextCmd.isBackward !== _cmd.isBackward
        ) {
          break
        }
        // 2. 依据删除方向合并删除的文本
        //    Backspace删除: 后删除的文本靠近文本节点开头
        //    Delete删除: 后删除的文本靠近文本节点末尾
        delelteDataBuffer = nextCmd.isBackward
          ? nextCmd.data + delelteDataBuffer
          : delelteDataBuffer + nextCmd.data
        j++
        lastCmd = nextCmd
      }
      // 需要合并Delete_Text
      if (lastCmd /** j !== i + 1 */) {
        // Backspace删除时, 总的删除起点为最后一个命令的offset; Delete时相反
        // 由 undoEffector 控制, 不同的按键触发 commit,
        // 不允许出现通过 Backspace 和 Delete 删除的命令处在同一个事务内
        if (_cmd.isBackward) {
          // @ts-expect-error no error; force amend, to reuse cmd
          _cmd.offset = lastCmd.offset
        }
        // @ts-expect-error no error; force amend, to reuse cmd
        _cmd.data = delelteDataBuffer
        _cmd.destCaretRange = lastCmd.destCaretRange
        out.push(_cmd)
        i = j - 1
        continue
      }
      // 否则直接添加
    }
    out.push(_cmd)
  } // for end

  return out
}
/**
 * 合并连续的Insert_Composition_Text命令, 并转为Insert_Node 或 Insert_Text命令
 */
const checkMergeCmdInsertCompositionText = (cmds: ExecutedCmd[], ctx: Et.EditorContext) => {
  const out: ExecutedCmd[] = []

  for (let i = 0; i < cmds.length; i++) {
    const _cmd = cmds[i] as ExecutedInsertCompositionText

    if (_cmd.type !== CmdType.Insert_Composition_Text) { // type !== Insert_Composition_Text
      out.push(_cmd)
      continue
    }
    let j = i + 1
    let composeData = _cmd.data
    let lastCmd: ExecutedInsertCompositionText | null = null
    while (j < cmds.length) {
      const nextCmd = cmds[j]
      if (nextCmd.type !== CmdType.Insert_Composition_Text) {
        break
      }
      lastCmd = nextCmd as ExecutedInsertCompositionText
      composeData = nextCmd.data // 输入法构造串是每次全部覆盖的, 因此无需累加, 最新的命令的data 就是输入法最终插入的文本
      j++
    }
    const srcCaret = _cmd.srcCaretRange?.toCaret() // composition命令的起始光标位置必须存在

    if (!srcCaret) {
      if (import.meta.env.DEV) {
        throw Error(`输入法会话首个命令没有赋值 srcCaretRange `)
      }
      return out
    }
    if (lastCmd) {
      // for 下一个从 j 开始
      i = j - 1
      if (composeData === '') {
        // backspace取消输入法构造串, 直接丢弃输入法命令
        continue
      }
      // 有多个composition命令, lastCmd必定有text节点
      const text = lastCmd.text
      // 输入法会话第一个命令记录以上text是否是由浏览器新插入的

      if (_cmd.newInserted) {
        // 转为插入文本节点命令
        out.push(cmd.insertNode({
          node: text,
          execAt: srcCaret, // 第一个命令必定存在此属性
          srcCaretRange: srcCaret,
          // 转换后需要设置destCaretRange, 否则重做时无法定位光标位置
          destCaretRange: cr.caret(text, text.length),
        }))
      }
      else {
        // 转为插入文本命令
        out.push(cmd.insertText({
          text,
          data: composeData,
          offset: srcCaret.offset,
          srcCaretRange: srcCaret,
          // 转换后需要设置destCaretRange, 否则重做时无法定位光标位置
          destCaretRange: cr.caret(text, srcCaret.offset + composeData.length),
        }))
      }
    }
    // 整个输入法会话只有一个composition命令
    else {
      let text = srcCaret.anchor
      if (text.nodeType === 3) {
        // 有 text 节点, 转为 Insert_Text
        out.push(cmd.insertText({
          text: text as Et.Text,
          data: composeData,
          offset: srcCaret.offset,
          srcCaretRange: srcCaret,
          destCaretRange: cr.caret(text, srcCaret.offset + composeData.length),
        }))
      }
      else {
        // 无text节点, 需新插入一个text节点, 该节点需更新光标获得
        // 需配合undoEffector, 在输入法会话结束后此时立即commit命令, 以立即调用pushTransaction
        // 才能获取正确的光标位置
        ctx.selection.update()
        text = ctx.selection.anchorText as Et.Text
        if (!text || text.nodeType !== 3) {
          if (import.meta.env.DEV) {
            throw Error('Insert_Composition_Text 命令单独出现, 且无#text节点.')
          }
          continue
        }
        out.push(cmd.insertNode({
          node: text,
          execAt: srcCaret,
          srcCaretRange: srcCaret,
          destCaretRange: cr.caret(text, text.length),
        }))
      }
    }
  } // for end

  return out
}
