/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { Et } from '../../@types'
import { cr } from '../../selection'
import type {
  CmdDeleteText,
  CmdFunctional,
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
  tranxFinalCallback?: (ctx: Et.EditorContext) => void
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
  get length() {
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

    // fixed. 应先清空暂存区, 再执行撤销; 避免撤销时意外触发pushTransaction将本该撤销的命令 commit 了
    const cmds = [...this.cmdList]
    this.cmdList.length = 0
    cmdHandler.handleUndo(cmds, ctx)

    return true
  }

  /**
   * 清空撤回栈，final所有命令
   */
  commitAll(ctx: Et.EditorContext) {
    this.transactionStack.forEach(x => x.tranxFinalCallback?.(ctx))
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
      firstX?.tranxFinalCallback?.(ctx)
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
      return false
    }
    const tranx = this.transactionStack[--this._pos] as UndoTransaction
    cmdHandler.handleUndo(tranx.cmds, ctx)
    return true
  }

  redo(ctx: Et.EditorContext) {
    if (this._pos >= this.transactionStack.length) {
      return false
    }
    const tranx = this.transactionStack[this._pos++] as UndoTransaction
    cmdHandler.handleRedo(tranx.cmds, ctx)
    return true
  }

  // /**
  //  * 获取下一个undo操作的光标基准位置, 即上一个事务的光标结束位置destCaretRange,
  //  * 因为执行undo前, srcCaretRange可能不在页面上(获取该位置没有意义) \
  //  * 仅用于虚拟滚动判断撤销操作的内容是否在虚拟片段里
  //  */
  // undoCaretRange() {
  //   if (this._pos <= 0) {
  //     return null
  //   }
  //   return this.transactionStack[this._pos - 1].destCaretRange // 这里应该拿dest, 而非src
  // }

  // /**
  //  * 获取下一个redo操作的光标基准位置, 即下一个事务的光标起始位置srcCaretRange,
  //  * 因为执行redo前, destCaretRange可能不在页面上(获取该位置没有意义) \
  //  * 仅用于虚拟滚动判断撤销操作的内容是否在虚拟片段里
  //  */
  // redoCaretRange() {
  //   if (this._pos >= this.transactionStack.length) {
  //     return null
  //   }
  //   return this.transactionStack[this._pos].srcCaretRange
  // }
}

const buildTransaction = (input: ExecutedCmd[], ctx: Et.EditorContext): UndoTransaction | null => {
  const { cmds, hasFinal } = checkMergeCmds(checkMergeCmdInsertCompositionText(input, ctx))

  // 合并命令长度为0, 只有一种情况, 就是输入法输入时, 用户主动删除了输入法会话内的构造串, 此时返回null
  return cmds.length === 0
    ? null
    : {
        cmds,
        length: cmds.length,
        srcCaretRange: cmds[0]!.srcCaretRange,
        destCaretRange: cmds[cmds.length - 1]!.destCaretRange,
        tranxFinalCallback: hasFinal
          ? (ctx) => {
              for (const cmd of cmds) {
                cmd.finalCallback?.(ctx)
              }
            }
          : undefined,
      }
}

/**
 * 合并连续的 Insert_Text, 或连续的同方向 Delete_Text, 或连续的可合并 Functional 命令
 */
const checkMergeCmds = (cmds: ExecutedCmd[]) => {
  const out: ExecutedCmd[] = []
  let hasFinal = false

  for (let i = 0; i < cmds.length; i++) {
    const _cmd = cmds[i] as ExecutedCmd<CmdInsertText | CmdDeleteText | CmdFunctional>
    if (_cmd.type === CmdType.Insert_Text) { // Insert_Text
      let j = i + 1
      let insertedData = _cmd.data
      let nextOffset = _cmd.offset + _cmd.data.length
      while (j < cmds.length) {
        const nextCmd = cmds[j] as CmdInsertText
        if (nextCmd.type !== CmdType.Insert_Text || nextCmd.text !== _cmd.text
          || nextCmd.offset !== nextOffset
        ) {
          break
        }
        insertedData += nextCmd.data
        nextOffset = nextCmd.offset + nextCmd.data.length
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
    else if (_cmd.type === CmdType.Functional && _cmd.merge) { // Functional
      let currCmd = _cmd
      let nextCmd = cmds[i + 1]
      while (nextCmd && nextCmd.type === CmdType.Functional) {
        // @ts-expect-error currCmd.merge 的 this 类型是正确的
        const ret = currCmd.merge(nextCmd)
        if (!ret) {
          break
        }
        if (ret !== true) {
          currCmd = cmd.functional(ret)
        }
        i++
        nextCmd = cmds[i + 1]
      }
      out.push(currCmd)
      if (currCmd.finalCallback) {
        hasFinal = true
      }
      continue
    }
    if (_cmd.finalCallback) {
      hasFinal = true
    }
    out.push(_cmd)
  } // for end

  if (import.meta.env.DEV) {
    if (out.some(c => c.type === CmdType.Insert_Composition_Text)) {
      throw new Error('mergeCmds: 命令合并后存在 Insert_Composition_Text 命令')
    }
  }

  return { cmds: out, hasFinal }
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
    let composedData = _cmd.data
    let lastCmd: ExecutedInsertCompositionText | null = null
    while (j < cmds.length) {
      const nextCmd = cmds[j]!
      if (nextCmd.type !== CmdType.Insert_Composition_Text
        // fixed. 除输入法会话的第一个命令外, 后续输入法命令必定存在text节点
        // 如果下一个连续的输入法命令无test属性, 说明这是下一次输入法会话的第一个命令
        // 但被意外的被 commit 到当前 Transaction 中了; 这里不应纳入本次合并
        || !nextCmd.text
      ) {
        break
      }
      lastCmd = nextCmd as ExecutedInsertCompositionText
      composedData = nextCmd.data // 输入法构造串是每次全部覆盖的, 因此无需累加, 最新的命令的data 就是输入法最终插入的文本
      j++
    }
    const srcCaret = _cmd.srcCaretRange?.toCaret() // composition命令的起始光标位置必须存在

    if (!srcCaret) {
      if (import.meta.env.DEV) {
        throw Error(`输入法会话首个命令没有赋值 srcCaretRange `)
      }
      return out
    }
    // 多个连续输入法命令
    if (lastCmd) {
      // for 下一个从 j 开始
      i = j - 1
      if (composedData === '') {
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
          data: composedData,
          offset: srcCaret.offset,
          srcCaretRange: srcCaret,
          // 转换后需要设置destCaretRange, 否则重做时无法定位光标位置
          destCaretRange: cr.caret(text, srcCaret.offset + composedData.length),
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
          data: composedData,
          offset: srcCaret.offset,
          srcCaretRange: srcCaret,
          destCaretRange: cr.caret(text, srcCaret.offset + composedData.length),
        }))
      }
      else {
        // 输入法启动时不在text节点上, 需新插入一个text节点, 该节点需更新光标获得
        // 需配合undoEffector, 在输入法会话结束后此时立即commit命令, 以立即调用pushTransaction(将执行此处代码)
        // 才能获取当前的正确的光标位置
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
