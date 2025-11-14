import type { Et } from '../../@types'
import { cmd, cmdHandler, CmdType, type Command, ExecutedCmd } from './cmds'
import { UndoStack } from './UndoStack'

export interface CommandQueue {
  push: (...args: Command[]) => void
}

/**
 * 命令管理器
 */
export class CommandManager implements CommandQueue {
  private readonly _cmds: Command[] = []
  private _inTransaction = false
  private _undoStack: UndoStack
  private _commitNext = false

  private _afterHandleCallbacks: (() => void)[] = []

  private _lastCaretRange: Et.CaretRange | null = null

  /**
   * 最近一次执行命令后设置的光标位置, 若获取前未执行 handle,
   * 则可能返回上一次 handle 的光标位置; 若未设置, 则返回 null
   */
  get lastCaretRange() {
    if (this._lastCaretRange) {
      return this._lastCaretRange.toTextAffinity()
    }
    return null
  }

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
  get hasQueuedCmds() {
    return this._cmds.length > 0
  }

  clearQueue() {
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
  pushByName<T extends keyof typeof CmdType, Meta>(
    typeName: T, init: Prettify<Parameters<typeof cmd<typeof CmdType[T], Meta>>[1]>): this
  pushByName(
    typeName: keyof typeof CmdType, init: Parameters<typeof cmd>[1],
  ) {
    const type = CmdType[typeName]
    if (type && init) {
      this._cmds.push(cmd(type, init) as Command)
    }
    return this
  }

  /**
   * 添加一个或一组由cmd工厂构造的命令到队列中
   * @param cmd 由命令工厂函数cmd创建的命令或命令数组
   */
  push(...cmds: Command[]) {
    this._cmds.push(...cmds)
    return this
  }

  /**
   * 注册一个回调函数, 在下一次调用 `handle` 时(命令执行之后)执行,
   * * 此回调函数的行为不可撤销, 不要在回调函数中修改编辑区内容
   * * 若执行 `handle` 时命令队列没有命令, 则不执行此函数添加的回调函数,
   *   并且会清空回调函数队列; 若依然希望执行回调, 可添加一个空命令 (
   *   可通过 `cmd.null()` 创建)
   * @param callback 命令执行后回调函数
   */
  pushHandleCallback(callback: () => void): void
  /**
   * @param arg 回调函数参数
   */
  pushHandleCallback<T>(callback: (arg: T) => void, arg: T): void
  pushHandleCallback<T>(callback: (arg?: T) => void, arg?: T): void {
    if (!arg) {
      this._afterHandleCallbacks.push(callback)
      return
    }
    this._afterHandleCallbacks.push(() => callback(arg))
  }

  private _runHandleCallbacks() {
    if (this._afterHandleCallbacks.length) {
      // 先清空再执行, 避免在执行回调时添加新的回调 或调用 closeTransaction 方法, 造成死循环
      const cbs = [...this._afterHandleCallbacks]
      this._afterHandleCallbacks.length = 0
      for (const fn of cbs) {
        fn()
      }
    }
  }

  private _clearHandleCallbacks() {
    this._afterHandleCallbacks.length = 0
  }

  private _handle(destCaretRange?: Et.CaretRange) {
    if (!this.hasQueuedCmds) {
      this._lastCaretRange = null
      this._clearHandleCallbacks()
      return false
    }
    const successCmds = [] as ExecutedCmd[]
    this._lastCaretRange = cmdHandler.handle(this._cmds, successCmds, this._ctx, destCaretRange)
    this._undoStack.record(successCmds)
    this.clearQueue()
    return true
  }

  /**
   * 按顺序执行之前push的命令
   * * 该方法不会更新上下文和选区信息, 但会记录lastCaretRange(如果有)
   * @param destCaretRange 所有命令执行后最终的光标位置; 此参数优先级更高,
   *    即会覆盖最后一个命令中的destCaretRange属性
   * @returns 是否执行了至少一个命令
   */
  handle(destCaretRange?: Et.CaretRange): boolean {
    if (this._handle(destCaretRange)) {
      this._runHandleCallbacks()
      this._checkCommitNext()
      return true
    }
    return false
  }

  /**
   * 按顺序执行之前push的命令并当lastCaretRange非空时更新上下文和选区信息
   * @param destCaretRange 所有命令执行后最终的光标位置; 此参数优先级更高,
   *    即会覆盖最后一个命令中的destCaretRange属性
   * @returns 是否执行了至少一个命令
   */
  handleAndUpdate(destCaretRange?: Et.CaretRange): boolean {
    if (this._handle(destCaretRange)) {
      if (this._lastCaretRange) {
        this._ctx.setSelection(this._lastCaretRange.toTextAffinity())
      }
      this._runHandleCallbacks()
      this._checkCommitNext()
      return true
    }
    return false
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
    if (this._inTransaction || this._ctx.composition.inSession) return false
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

  private _checkCommitNext() {
    if (this._commitNext) {
      this._commitNext = false
      this.commit()
    }
  }

  /**
   * 检查当前 keydown是否需要commit, 并自动 commit 已执行命令
   * * 通常不需要调用此方法, 因为 undo 插件已经处理了; 但如果插件在 beforeKeydownSolver
   *   中配置了 效应元素特有效应器处理函数 那么 undo 的处理逻辑会被覆盖, 则需要手动调用此方法
   *   来对某些特定按键进行 commit 处理
   * * 为什么需要? 假设输入 "aabb|", 然后按 Backspace 删除, 最终内容为 "a", 如果没有对
   *   Backspace 按键进行 commit 处理, 则此时撤回, 最终内容为 "|", 因为输入与删除被记录在了一个命令事务内
   * @param ev keydown键盘事件
   * @param ctx 编辑器上下文
   * @returns 该方法始终返回 false
   */
  checkKeydownNeedCommit(ev: KeyboardEvent, ctx: Et.EditorContext) {
    if (![' ', 'Enter', 'Tab', 'Backspace', 'Delete'].includes(ev.key)) {
      return false
    }
    if (!ev.repeat && ev.key !== ctx.currDownKey) {
      this.commit()
    }
    return false
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
    if (this.hasQueuedCmds) this.handleAndUpdate()
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
    try {
      this.push(...cmds).handleAndUpdate(destCaretRange)
    }
    catch (_) {
      this.discard()
      this._ctx.assists.logger?.error('withTransaction error', 'CommandManager')
    }
    finally {
      this.closeTransaction()
    }
  }

  /**
   * 执行一个事务函数, 若函数返回true, 则提交事务, 否则回滚事务
   * @param fn 事务函数, 有一个参数, 即命令管理器自身
   * @returns 事务是否成功
   */
  withTransactionFn(fn: (cm: this) => boolean) {
    this.closeTransaction()
    this.startTransaction()
    try {
      if (fn(this) && (this.hasQueuedCmds ? this.handleAndUpdate() : true)) {
        this.closeTransaction()
        return true
      }
      else {
        this.discard()
        return false
      }
    }
    catch (_) {
      this._ctx.assists.logger?.error('withTransactionFn error', 'CommandManager')
      return false
    }
    finally {
      this.discard()
      this.closeTransaction()
    }
  }

  /**
   * 在回调中执行命令, 第一个命令的初始光标位置会被设置为参数srcCaretRange;
   * 用于手动控制撤回时的光标落点位置;\
   * 若有排队的命令, 则会先执行(不更新上下文和选区); 若回调结束后仍有排队命令,
   * 则执行(并更新上下文和选区)
   * @param srcCaretRange 命令执行前的光标位置, 仅标记, 不会改变当前光标位置
   */
  withSrcCaretRange(srcCaretRange: Et.CaretRange, fn: () => void) {
    if (this.hasQueuedCmds) {
      this.handle()
    }
    const nullCmd = cmd.null()
    nullCmd.srcCaretRange = srcCaretRange
    this._cmds.push(nullCmd)
    fn()
    if (this.hasQueuedCmds) {
      this.handleAndUpdate()
    }
  }

  /**
   * 记录当前滚动位置, 执行回调后, 尝试恢复滚动位置; 避免移动节点导致页面跳动
   * @param ctx 编辑器上下文
   * @param fn 回调函数
   */
  withRememberScrollTop<T>(ctx: Et.EditorContext, fn: () => T): T {
    const scrollTop = ctx.body.scrollContainer.scrollTop
    ctx.commandManager.pushHandleCallback(() => {
      ctx.body.scrollContainer.scrollTop = scrollTop
    })
    const ret = fn()
    this._clearHandleCallbacks()
    return ret
  }

  /**
   * 为撤销重做做准备
   */
  private _prepareUndoRedo() {
    // 清除未执行命令, 防止撤销重做改变文档内容后, 下次 handle 时执行已过时的命令
    this.clearQueue()
    // 执行undo前先判断是否有未入栈命令
    if (!this.commit()) {
      // 若在事务内, commit 会失败, 恢复到事务前的状态
      this.discard()
    }
  }

  /**
   * 撤回事务
   */
  undoTransaction(): void {
    this._prepareUndoRedo()
    this._undoStack.undo(this._ctx)
  }

  /**
   * 重做事务
   */
  redoTransaction(): void {
    this._prepareUndoRedo()
    this._undoStack.redo(this._ctx)
  }
}
