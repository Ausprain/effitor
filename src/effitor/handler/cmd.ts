import { type Et } from "../@types";


export const createCommand = <T extends keyof Et.CommandMap>(type: T, init: Et.CommandInit[T]): Et.CommandMap[T] => {
    return { type, ...init } as Et.CommandMap[T];
}

export const initCommandHandler = (ctx: Et.EditorContext, cmdUndoHandler: Et.CommandUndoHandler): Et.CommandHandler => {
    let _inTransaction = false;
    return {
        cmds: [],
        get inTransaction() {
            return _inTransaction
        },
        push<T extends keyof Et.CommandMap>(cmdOrType: Et.Command | T, init?: Et.CommandInit[T]) {
            if (typeof cmdOrType === 'object') this.cmds.push(cmdOrType)
            else this.cmds.push(createCommand(cmdOrType, init!))
        },
        handle(cmds?) {
            return cmdUndoHandler.handle.call(this, ctx, cmds)
        },
        commit() {
            if (_inTransaction) return false
            return cmdUndoHandler.commit.call(this, ctx)
        },
        discard() {
            _inTransaction = false
            return cmdUndoHandler.discard.call(this, ctx)
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
            cmdUndoHandler.commitAll.call(this, ctx)
        },
    }
}
