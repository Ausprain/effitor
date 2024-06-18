import type * as Et from "@/effitor/@types";
import { CmdTypeEnum } from "@/effitor/@types/constant";
import { cmdHandler } from "./handler";
import { dom } from "@/effitor/utils";
import { createCommand } from "@/effitor/handler/cmd";

interface UndoTransaction extends Required<Et.CmdCallbackInit> {
    undoCmds: Et.Command[],
    redoCmds: Et.Command[],
    /** 命令长度 */
    length: number
}
type CmdMergeReturns = {
    cmds: Et.Command[],
    redoCallbacks: Et.CmdCallback[],
    undoCallbacks: Et.CmdCallback[],
    finalCallbacks: Et.CmdCallback[]
}

/**
 * 合并连续的insertCompositionText为insertText或insertNode
 */
const checkMergeCmdInsertCompositionText = (cmds: Et.Command[], ctx: Et.EditorContext): CmdMergeReturns => {
    const out: Et.Command[] = []
    const res: CmdMergeReturns = {
        cmds: out,
        redoCallbacks: [],
        undoCallbacks: [],
        finalCallbacks: []
    }
    // 合并连续的insertCompositionText为insertText
    for (let i = 0; i < cmds.length; i++) {
        const cmd = cmds[i];
        cmd.redoCallback && res.redoCallbacks.push(cmd.redoCallback)
        cmd.undoCallback && res.undoCallbacks.push(cmd.undoCallback)
        cmd.finalCallback && res.finalCallbacks.push(cmd.finalCallback)
        if (cmd.type === CmdTypeEnum.Insert_Composition_Text) {
            let j = i + 1
            let data = cmd.data
            let lastCmd: Et.CmdInsertCompositionText | null = null
            // 浏览器是否插入了一个新的#text节点; 当输入法输入位置不是#text节点时, 浏览器会插入一个#text
            const newTextInserted = !dom.isTextNode(cmd.targetRanges[0].startContainer)
            while (j < cmds.length) {
                const nextCmd = cmds[j]
                if (nextCmd.type === CmdTypeEnum.Insert_Composition_Text) {
                    data = nextCmd.data   // 输入法每次输入都是整体更新, 而不是叠加
                    // node = nextCmd.targetRanges[0].startContainer as Text   // 同一个事务内, 后续的光标位置必是文本节点
                    lastCmd = nextCmd
                    j++
                    continue
                }
                break
            }
            // 在handleInsertCompositionText执行命令时, 重置cmd的targetRanges[0], 防止跨节点Range插入时还是removeContent前的位置
            // const srcCaretRange = dom.caretStaticRangeInNode(cmd.targetRanges[0].startContainer, cmd.targetRanges[0].startOffset)
            const srcCaretRange = cmd.targetRanges[0]
            if (lastCmd) {
                if (data === '') {
                    // backspace取消输入法构造串, 直接丢弃输入法命令
                    i = j - 1
                    continue
                }
                const node = lastCmd.targetRanges[0].startContainer as Text   // 非第一项输入法插入, 光标位置必是文本节点
                const destCaretRange = newTextInserted
                    ? dom.caretStaticRangeInNode(node, node.length)
                    : dom.caretStaticRangeInNode(node, srcCaretRange.startOffset + data.length)
                // 插入新#text
                if (newTextInserted) {
                    out.push(createCommand(CmdTypeEnum.Insert_Node, {
                        node,
                        insertAt: srcCaretRange,
                        targetRanges: [srcCaretRange, destCaretRange],
                    }))
                }
                // 插入文本
                else {
                    out.push(createCommand(CmdTypeEnum.Insert_Text, {
                        text: node,
                        offset: srcCaretRange.startOffset,
                        data: data,
                        targetRanges: [srcCaretRange, destCaretRange],
                    }))
                }
                i = j - 1
                continue
            }
            else {
                // 只有一个composition命令, 一般情况下这不会发生
                // prob.|2023.12.25/10:23 输入法会话太长时会发生
                // sol. 输入法会话中（ctx.inCompositionSession）禁止记录事务
                // prob.|2023.12.25/19:44 只输入一个字母, 然后用页面内失焦方式结束输入法时也会发生
                // sol. 丢弃这个命令
                // cmds.splice(i, 1)
                // fixme 这样会导致该操作无法撤销（页面内失焦方式让输入法插入一个字母, 若光标还不在#text上, 该字母将永远停留在页面上）
                // sol. 使用ctx重新获取光标位置
                // console.log('single insertCompositionText: ', ctx.root.getSelection?.(), ctx)
                let node: Node | undefined | null = cmd.targetRanges[0].startContainer
                // 插入文本
                if (dom.isTextNode(node)) {
                    out.push(createCommand(CmdTypeEnum.Insert_Text, {
                        text: node,
                        offset: cmd.targetRanges[0].startOffset,
                        data: data,
                        targetRanges: [srcCaretRange, dom.caretStaticRangeInNode(node, srcCaretRange.startOffset + data.length)],
                    }))
                }
                // 插入节点
                else {
                    // 记录事务时, 命令已经执行完毕（input事件已触发） 可以拿到插入文本后的光标位置
                    const sel = ctx.root.getSelection ? ctx.root.getSelection() : getSelection()
                    node = sel?.anchorNode
                    if (!node || !dom.isTextNode(node)) {
                        throw Error('insertCompositionText单独出现, 且无#text')
                    }
                    out.push(createCommand(CmdTypeEnum.Insert_Node, {
                        node,
                        insertAt: srcCaretRange,
                        targetRanges: [
                            cmd.targetRanges[0],
                            dom.caretStaticRangeInNode(node, node.length)
                        ]
                    }))
                }
                continue
            }
        }
        out.push(cmd)
    }
    return res
}
/**
 * 合并连续的insertText或 deleteText
 */
const checkMergeCmdInsertTextOrDeleteText = (res: CmdMergeReturns): CmdMergeReturns => {
    const cmds = res.cmds
    const out: Et.Command[] = []
    for (let i = 0; i < cmds.length; i++) {
        const cmd = cmds[i];
        // 合并连续的insertText
        if (cmd.type === CmdTypeEnum.Insert_Text) {
            const currNode = cmd.text
            let j = i + 1;
            let insertedDataBuffer = ''
            let lastCmd = cmd
            while (j < cmds.length) {
                const nextCmd = cmds[j]
                // // fixme 这里需要判断是否还是对同一个位置编辑, 当用鼠标点击另一个文本时, 也会被叠加; 或者监听selectionchange记录一次transaction
                if (nextCmd.type === CmdTypeEnum.Insert_Text && currNode === nextCmd.targetRanges[0].startContainer) {
                    insertedDataBuffer += nextCmd.data
                    lastCmd = nextCmd
                    j++
                    continue
                }
                break
            }
            if (insertedDataBuffer !== '') {
                out.push(createCommand(CmdTypeEnum.Insert_Text, {
                    text: currNode,
                    offset: cmd.targetRanges[0].startOffset,
                    data: cmd.data + insertedDataBuffer,
                    targetRanges: [cmd.targetRanges[0], lastCmd.targetRanges[1]]
                }))
                i = j - 1
                continue
            }
        }
        // 合并连续的deleteText
        else if (cmd.type === CmdTypeEnum.Delete_Text) {
            const currNode = cmd.deleteRange.startContainer
            let j = i + 1
            let lastCmd = cmd
            let deletedDataBuffer: string = cmd.data
            let startOffset = cmd.deleteRange.startOffset
            let endOffset = cmd.deleteRange.endOffset
            while (j < cmds.length) {
                const nextCmd = cmds[j]
                if (nextCmd.type === CmdTypeEnum.Delete_Text && nextCmd.deleteRange.startContainer === currNode && nextCmd.isBackward === cmd.isBackward) {
                    startOffset = Math.min(startOffset, nextCmd.deleteRange.startOffset)
                    endOffset = Math.max(endOffset, nextCmd.deleteRange.endOffset)
                    lastCmd = nextCmd
                    j++
                    // 只删除文本, 叠加并继续
                    deletedDataBuffer = cmd.isBackward ? nextCmd.data + deletedDataBuffer : deletedDataBuffer + nextCmd.data
                    continue
                }
                break
            }
            if (deletedDataBuffer !== '') {
                // 删除叠加文本
                out.push(createCommand(CmdTypeEnum.Delete_Text, {
                    data: deletedDataBuffer,
                    isBackward: cmd.isBackward,
                    deleteRange: new StaticRange({
                        startContainer: currNode,
                        startOffset,
                        endContainer: currNode,
                        endOffset,
                    }),
                    targetRanges: [cmd.targetRanges[0], lastCmd.targetRanges[1]],
                }))
                i = j - 1
                continue
            }
        }
        out.push(cmd)
    }
    return {
        ...res,
        cmds: out,
    }
}

const buildTransaction = (cmds: Et.Command[], ctx: Et.EditorContext): UndoTransaction => {
    // console.error('构建事务: ', [...cmds])

    // fix. issues. # 由insertCompositionText合并成的insertText与其他insertText挨在一起, 导致撤销/重做时deleteText命令的deleteRange.endOffset位置不对
    // 遍历2次, 第1次合并连续的insertCompositionText为insertText, 第2次合并连续的insertText, deleteText
    const res = checkMergeCmdInsertTextOrDeleteText(checkMergeCmdInsertCompositionText(cmds, ctx))

    // console.log('构建事务完毕: ', redoCmds)
    return {
        length: res.cmds.length,
        redoCmds: res.cmds,
        undoCmds: [],
        redoCallback(ctx) {
            for (const cb of res.redoCallbacks) {
                cb(ctx)
            }
        },
        undoCallback(ctx) {
            // !reverse每次执行都会改变原数组
            // res.undoCallbacks.reverse().forEach(cb => cb(ctx))
            for (let i = res.undoCallbacks.length - 1; i >= 0; i--) {
                res.undoCallbacks[i](ctx)
            }
        },
        finalCallback(ctx) {
            for (const cb of res.finalCallbacks) {
                cb(ctx)
            }
        }
    }
}

export class UndoStack {
    size: number
    pos: number
    /** 命令暂存区 */
    cmdList: Et.Command[]
    /** 命令事务栈 */
    transactionStack: UndoTransaction[]

    constructor(size: number) {
        this.size = size
        this.pos = 0
        this.cmdList = []
        this.transactionStack = []
    }

    /** 记录一个命令到暂存区 */
    record(cmds: Et.Command[]) {
        cmds.length && this.cmdList.push(...cmds)
    }
    /** 丢弃暂存区所有命令并撤回 */
    discard(ctx: Et.EditorContext) {
        if (this.cmdList.length == 0) return false
        // 过滤掉输入法命令
        const cmds = this.cmdList.filter((cmd) => cmd.type !== CmdTypeEnum.Insert_Composition_Text)
        cmdHandler.handleUndo(cmds, ctx)
        // 丢弃命令时命令已执行，需要执行撤回回调
        for (let i = cmds.length - 1; i >= 0; i--) {
            cmds[i].undoCallback?.(ctx)
        }
        this.cmdList.length = 0
        return true
    }
    /**
     * 构建事务 清空命令暂存区
     */
    pushTransaction(ctx: Et.EditorContext) {
        // 上游判断非空
        // if (!this.cmdList.length) {
        //     return false
        // }
        // 构造事务
        const tranx = buildTransaction(this.cmdList, ctx)
        this.cmdList.length = 0
        if (!tranx.length) {
            return false
        }
        // 覆盖当前位置
        this.transactionStack[this.pos++] = tranx
        // 丢弃当前位置以后的
        this.transactionStack.length = this.pos
        // 超出容量丢弃最初的
        if (this.transactionStack.length > this.size) {
            const x = this.transactionStack.shift()
            // 执行命令最终回调
            x!.finalCallback?.(ctx)
            this.pos = this.transactionStack.length
        }
        if (import.meta.env.DEV && import.meta.env.VITE_TRANX_DEBUG) console.error('pushTransaction: ', tranx.redoCmds)
        return true
    }
    /** 重做前一个事务中的所有命令 */
    redo(ctx: Et.EditorContext) {
        if (this.pos >= this.transactionStack.length) {
            return
        }
        const tranx = this.transactionStack[this.pos]
        // 每次重做时都从undoCmds中重新构建命令, 避免insertContent命令的fragment执行后为空的问题; 撤销时同理
        tranx.redoCmds = cmdHandler.handleRedo(tranx.undoCmds, ctx)
        tranx.redoCallback(ctx)
        // console.error(`redoed, length=${this.transactionStack.length}, pos=${this.pos}, cmds=`, tranx.redoCmds)
        this.pos++
    }
    /** 撤回上一个事务中的所有命令 */
    undo(ctx: Et.EditorContext) {
        if (this.pos <= 0) {
            return
        }
        const tranx = this.transactionStack[this.pos - 1]
        tranx.undoCmds = cmdHandler.handleUndo(tranx.redoCmds, ctx)
        tranx.undoCallback(ctx)
        // console.error(`undoed, length=${this.transactionStack.length}, pos=${this.pos - 1}, cmds=`, tranx.undoCmds)
        this.pos--
    }
    /**
     * 清空撤回栈，final所有命令
     */
    commitAll(ctx: Et.EditorContext) {
        this.transactionStack.forEach(x => x.finalCallback?.(ctx))
        this.transactionStack.length = 0
    }
}
