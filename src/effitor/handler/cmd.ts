import type * as Et from '../@types'
import { cmdHandler, UndoStack } from './undo';

export const createCommand = <T extends keyof Et.CommandMap>(type: T, init: Et.CommandInit[T]): Et.CommandMap[T] => {
    return { type, ...init } as Et.CommandMap[T];
}

export const initCommandHandler = (ctx: Et.EditorContext): Et.CommandHandler => {
    let _inTransaction = false;
    const _cmds: Et.Command[] = []
    const _undoStack = new UndoStack(ctx.config.UNDO_LENGTH)
    return {
        get inTransaction() {
            return _inTransaction
        },
        push<T extends keyof Et.CommandMap>(cmdOrType: Et.Command | T, init?: Et.CommandInit[T]) {
            if (typeof cmdOrType === 'object') _cmds.push(cmdOrType)
            else _cmds.push(createCommand(cmdOrType, init!))
        },
        handle(cmds?) {
            cmds = cmds || _cmds
            if (!cmds.length) return false
            _undoStack.record(cmds)
            cmdHandler.handle(cmds, ctx)
            cmds.length = 0
            return true
        },
        commit() {
            // 输入法会话中禁止记录事务; 防止输入法中按下Backspace等时, 将单个insertCompositionText记录入事务
            if (_inTransaction || ctx.inCompositionSession || !_undoStack.cmdList.length) return false
            return _undoStack.pushTransaction(ctx)
        },
        discard() {
            _inTransaction = false
            return _undoStack.discard(ctx)
        },
        startTransaction() {
            this.commit()
            _inTransaction = true
        },
        closeTransaction() {
            _inTransaction = false
            this.commit()
        },
        undoTransaction(ctx) {
            _undoStack.undo(ctx)
        },
        redoTransaction(ctx) {
            _undoStack.redo(ctx)
        },
        commitAll(ctx) {
            _undoStack.commitAll(ctx)
        },
    }
}
