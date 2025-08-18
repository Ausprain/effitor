import type { Et } from '~/core/@types'

import { cmd, cmdHandler, CmdType, type Command } from './cmds'
import { UndoStack } from './undo'

/**
 * 命令管理器
 */
export class CommandManager {
  private _cmds: Command[] = []
  private _inTransaction = false
  private _undoStack: UndoStack
  private _commitNext = false

  constructor(private _ctx: Et.EditorContext) {
    this._undoStack = new UndoStack(_ctx.editor.config.UNDO_LENGTH)
  }

  /** 是否在一个命令组事务内;  */
  get inTransaction() {
    return this._inTransaction
  }

  /** 当前撤回栈长度 */
  get stackLength() {
    return this._undoStack.stackLength
  }

  /** 重置撤回栈 */
  reset(): void {
    this._cmds.length = 0
    this._undoStack = new UndoStack(this._ctx.editor.config.UNDO_LENGTH)
  }

  /**
   * 配置一个命令并添加到队列中
   * @param typeName 命令类型名称
   * @param init 命令初始化参数
   */
  push<T extends keyof typeof CmdType, Meta>(
    typeName: T, init: Parameters<typeof cmd<typeof CmdType[T], Meta>>[1]): this
  /**
   * 添加一个或一组由cmd工厂构造的命令到队列中
   * @param cmd 由命令工厂函数cmd创建的命令或命令数组
   */
  push(cmd: Command | Command[]): this
  push(
    cmdOrType: keyof typeof CmdType | Command | Command[],
    init?: Parameters<typeof cmd>[1],
  ) {
    if (typeof cmdOrType === 'object') {
      if (Array.isArray(cmdOrType)) {
        this._cmds.push(...cmdOrType)
      }
      else {
        this._cmds.push(cmdOrType)
      }
      return this
    }
    const type = CmdType[cmdOrType]

    if (type && init) {
      this._cmds.push(cmd(type, init) as Command)
    }
    return this
  }

  /**
   * 则先按顺序先执行之前push的命令
   * @param destCaretRange 所有命令执行后最终的光标位置; 此参数优先级更高,
   * 即会覆盖最后一个命令中的destCaretRange属性
   * @returns 是否执行了至少一个命令
   */
  handle(destCaretRange?: Et.CaretRange): boolean {
    if (!this._cmds.length) {
      return false
    }
    this._undoStack.record(cmdHandler.handle(this._cmds, this._ctx, destCaretRange))
    this._cmds.length = 0
    if (this._commitNext) {
      this._commitNext = false
      this.commit()
    }
    return true
  }

  /**
   * 撤回当前命令队列内所有命令（已执行）并丢弃
   * @returns 是否撤销了至少一个命令
   */
  discard(): boolean {
    this._inTransaction = false
    return this._undoStack.discard(this._ctx)
  }

  /**
   * 若不在事务内, 将当前记录栈内命令合并成撤回栈事务添加到撤回栈
   * @returns 是否成功commit了命令
   */
  commit(): boolean {
    // 输入法会话中禁止记录事务;
    // 防止输入法中按下Backspace等时, 将单个insertCompositionText记录入事务
    if (this._inTransaction || this._ctx.inCompositionSession) return false
    return this._undoStack.pushTransaction(this._ctx)
  }

  /**
   * 标记下一个handle结束后自动commit
   * @param commit 是否立即执行一次commit, 默认false
   */
  commitNextHandle(commit = false) {
    if (commit) {
      this.commit()
    }
    this._commitNext = true
  }

  /**
   * 确认所有事务，执行命令的final回调，清空撤回栈;
   */
  commitAll(): void {
    this.commit()
    this._undoStack.commitAll(this._ctx)
  }

  /**
   * 开启事务（开启前自动 commit 先前命令, 若当前已在事务内, 则会先结束事务）
   * 在事务内执行的命令将禁止自动 commit，并在调用 `closeTransaction` 时
   * 统一 commit 为一个撤回栈事务\
   * 这可以阻止【插入/删除/替换节点，插入/删除片段】命令的自动 commit 行为，
   * 防止进行撤销/重做时出现光标跳跃/迷失等异常
   */
  startTransaction(): void {
    // FIXME 若已在事务内, 是应当保留事务状态, 还是重新开启一个事务?
    if (this._inTransaction) {
      this.closeTransaction()
    }
    else {
      this.commit()
    }
    this._inTransaction = true
  }

  /**
   * 关闭事务, 并自动commit命令
   * 调用该方法会将先前的操作合并并压入撤回栈
   */
  closeTransaction() {
    this._inTransaction = false
    return this.commit()
  }

  /**
   * 在一个事务内执行命令; 会自动先handle并commit先前push的命令,
   * 再开始事务执行传入的cmds, 然后关闭事务
   * @param destCaretRange 所有命令执行后最终的光标位置
   */
  withTransaction(cmds: Command[], destCaretRange?: Et.CaretRange) {
    if (this._cmds.length) this.handle()
    this.startTransaction()
    this.push(cmds).handle(destCaretRange)
    return this.closeTransaction()
  }

  /**
   * 撤回事务
   */
  undoTransaction(): void {
    this._undoStack.undo(this._ctx)
  }

  /**
   * 重做事务
   */
  redoTransaction(): void {
    this._undoStack.redo(this._ctx)
  }
}
