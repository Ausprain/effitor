
/** 撤回栈
 * @author: Ausprain 
 * @email: ausprain@qq.com 
 * @date: 2023-12-14 07:58:20 
 */

import type { Et } from "@/effitor"


export interface UndoEffector extends Et.Effector {
    undoLength: number
}

export interface UndoTransaction extends Required<Et.CmdCallbackInit> {
    undoCmds: Et.Command[],
    redoCmds: Et.Command[],
    /** 命令长度 */
    length: number
}

export interface IUndoStack {
    readonly size: number
    readonly cmdList: Et.Command[]
    readonly transactionStack: UndoTransaction[]
    pos: number
    readonly record: (cmds: Et.Command[]) => void
    readonly discard: (ctx: Et.EditorContext) => boolean
    readonly pushTransaction: (ctx: Et.EditorContext) => boolean
    readonly undo: (ctx: Et.EditorContext) => void
    readonly redo: (ctx: Et.EditorContext) => void
    /**
     * 清空撤回栈，final所有命令
     */
    readonly commitAll: (ctx: Et.EditorContext) => void
}

