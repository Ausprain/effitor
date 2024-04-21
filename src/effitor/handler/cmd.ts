import type { Effitor } from '../@types'
import { commandUndoHandler } from './undo';

export const createCommand = <T extends keyof Effitor.Handler.CommandMap>(type: T, init: Effitor.Handler.CommandInit[T]): Effitor.Handler.CommandMap[T] => {
    return { type, ...init } as Effitor.Handler.CommandMap[T];
}

export const initCommandHandler = (ctx: Effitor.Editor.Context): Effitor.Handler.CommandHandler => {
    let _inTransaction = false;
    const _cmds: Effitor.Handler.Command[] = []
    return {
        // cmds: [],
        get inTransaction() {
            return _inTransaction
        },
        push<T extends keyof Effitor.Handler.CommandMap>(cmdOrType: Effitor.Handler.Command | T, init?: Effitor.Handler.CommandInit[T]) {
            if (typeof cmdOrType === 'object') _cmds.push(cmdOrType)
            else _cmds.push(createCommand(cmdOrType, init!))
        },
        handle(cmds?) {
            cmds = cmds || _cmds
            if (!cmds.length) return false
            return commandUndoHandler.handle(ctx, cmds)
        },
        commit() {
            if (_inTransaction) return false
            return commandUndoHandler.commit(ctx)
        },
        discard() {
            _inTransaction = false
            return commandUndoHandler.discard(ctx)
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
            commandUndoHandler.commitAll(ctx)
        },
    }
}
