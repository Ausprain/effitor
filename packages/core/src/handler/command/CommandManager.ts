import type { Et } from '~/core/@types'

import { cmd, cmdHandler, CmdType, type Command } from './cmds'
import { UndoStack } from './UndoStack'

/**
 * 命令管理器
 */
export class CommandManager {
  private readonly _cmds: Command[] = []
  private _inTransaction = false
  private _undoStack: UndoStack
  private _commitNext = false

  constructor(
    private readonly _ctx: Et.EditorContext,
  ) {
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

  /** 有排队未处理的命令 */
  get hasCmds() {
    return this._cmds.length > 0
  }

  private clearQueue() {
    this._cmds.length = 0
  }

  /** 重置撤回栈 */
  reset(): void {
    this.clearQueue()
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
    if (!this.hasCmds) {
      return false
    }
    this._undoStack.record(cmdHandler.handle(this._cmds, this._ctx, destCaretRange))
    this.clearQueue()
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
    this.closeTransaction()
    this._undoStack.commitAll(this._ctx)
  }

  /**
   * 开启事务 (若已经在事务内, 则保持)
   * 在事务内执行的命令将禁止 commit，并在调用 `closeTransaction` 时
   * 统一 commit 为一个撤回栈事务\
   * 这可以阻止【插入/删除/替换节点，插入/删除片段】命令的自动 commit 行为，
   * 防止进行撤销/重做时出现光标跳跃/迷失等异常
   */
  startTransaction(): void {
    // 此处不应关闭事务重新开启, 否则会破坏上一个开启的事务
    this._inTransaction = true
  }

  /**
   * 关闭事务, 并自动commit命令; 调用该方法会将先前的操作合并并压入撤回栈;
   * 若有未处理的命令, 则会先handle再commit;
   */
  closeTransaction() {
    if (this.hasCmds) this.handle()
    this._inTransaction = false
    return this.commit()
  }

  /**
   * 在一个事务内执行命令; 会自动先handle并commit先前push的命令, 并关闭之前打开了的事务;
   * 再开始事务执行传入的cmds, 然后关闭事务
   * * 若在一个明确需要的事务内, 不要使用此方法
   * @param destCaretRange 所有命令执行后最终的光标位置
   */
  withTransaction(cmds: Command[], destCaretRange?: Et.CaretRange) {
    this.closeTransaction()
    this.startTransaction()
    this.push(cmds).handle(destCaretRange)
    return this.closeTransaction()
  }

  /**
   * 执行一个事务函数, 若函数返回true, 则提交事务, 否则回滚事务
   * @param fn 事务函数, 有一个参数, 即命令管理器自身
   * @returns 事务是否成功
   */
  withTransactionFn(fn: (cm: this) => boolean) {
    this.closeTransaction()
    this.startTransaction()
    if (fn(this) && (this.hasCmds ? this.handle() : true)) {
      this.closeTransaction()
      return true
    }
    else {
      this.discard()
      return false
    }
  }

  withTransactionSequential(
    startTarget: Et.SelectionTarget | null | undefined,
    handles: SequentialHandle[],
  ) {
    this.closeTransaction()
    if (!startTarget) {
      startTarget = this._ctx.selection.getTargetRange()
    }
    if (!startTarget || !startTarget.isValid()) {
      return false
    }
    this.startTransaction()
    for (const handle of handles) {
      startTarget = startTarget.isCaret()
        ? handle(this._ctx, startTarget)
        : handle(this._ctx, startTarget)
      if (startTarget === void 0) {
        break
      }
      if (!startTarget) {
        try {
          this.handle()
        }
        catch (_e) {
          this.discard()
          return false
        }
        startTarget = this._ctx.selection.getTargetRange()
        if (!startTarget || !startTarget.isValid()) {
          this.discard()
          return false
        }
      }
      if (!startTarget.isValid()) {
        this.discard()
        return false
      }
    }
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

interface SequentialHandle {
  /**
   * 顺序处理函数
   * @param ctx 编辑器上下文
   * @param target 目标范围
   * @returns 新的目标光标或范围,
   *  若返回null, 则调用 handle 函数执行命令并从 ctx.selection 上获取最新光标位置作为下一个目标范围
   *  若返回undefined, 则提前直接结束事务并回滚
   *  若其中发生异常, 则会回滚事务
   *  若返回值为空, 则不会调用 handle 函数, 即不会主动执行命令
   */
  (
    ctx: Et.EditorContext,
    target: Et.ValidTargetCaret | Et.ValidTargetRange
  ): Et.SelectionTarget | null | undefined
}
