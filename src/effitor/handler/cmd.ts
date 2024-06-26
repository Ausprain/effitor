import type * as Et from '../@types'
import { cmdHandler, getUndoStack } from './undo';

export const createCommand = <T extends keyof Et.CommandMap>(type: T, init: Et.CommandInit[T]): Et.CommandMap[T] => {
    return { type, ...init } as Et.CommandMap[T];
}

export const initCommandHandler = (ctx: Et.EditorContext): Et.CommandHandler => {
    let _inTransaction = false;
    const _cmds: Et.Command[] = []
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
            getUndoStack(ctx).record(cmds)
            cmdHandler.handle(cmds, ctx)
            cmds.length = 0
            return true
        },
        commit() {
            if (_inTransaction) return false
            return getUndoStack(ctx).pushTransaction(ctx)
        },
        discard() {
            _inTransaction = false
            return getUndoStack(ctx).discard(ctx)
        },
        startTransaction() {
            this.commit()
            _inTransaction = true
        },
        closeTransaction() {
            _inTransaction = false
            this.commit()
        },
        commitAll(ctx) {
            getUndoStack(ctx).commitAll(ctx)
        },
    }
}
