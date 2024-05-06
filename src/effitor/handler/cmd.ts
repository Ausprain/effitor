import type * as Et from '../@types'
import { commandUndoHandler } from './undo';

export const createCommand = <T extends keyof Et.CommandMap>(type: T, init: Et.CommandInit[T]): Et.CommandMap[T] => {
    return { type, ...init } as Et.CommandMap[T];
}

export const initCommandHandler = (ctx: Et.EditorContext): Et.CommandHandler => {
    let _inTransaction = false;
    const _cmds: Et.Command[] = []
    return {
        // cmds: [],
        get inTransaction() {
            return _inTransaction
        },
        push<T extends keyof Et.CommandMap>(cmdOrType: Et.Command | T, init?: Et.CommandInit[T]) {
            if (typeof cmdOrType === 'object') _cmds.push(cmdOrType)
            else _cmds.push(createCommand(cmdOrType, init!))
        },
        handle(cmds?) {
            cmds = cmds || [..._cmds]
            if (!cmds.length) return false
            // handle命令时可能有其他异步事件执行，给_cmds添加命令, 遂要先将命令清空
            _cmds.length = 0
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
