import type * as Et from "@/effitor/@types";
import { createCommand } from "@/effitor/handler/cmd";
import { dom } from "@/effitor/utils";

/**
 * 定位Selection到StaticRange位置, 并更新编辑器ctx.range和ctx.node  
 * **!!仅小范围定位光标时使用此方法, 若定位光标可能导致`段落`或`效应元素`的变化, 应使用selectRange() + ctx.forceUpdate()组合**
 */
const selectRangeWithCtx = (ctx: Et.EditorContext, range: StaticRange | Range) => {
    dom.selectRange(ctx.selection, range)
    ctx.range = ctx.selection.getRangeAt(0)
    const focusNode = ctx.selection.focusNode
    ctx.oldNode = ctx.node
    ctx.node = dom.isTextNode(focusNode) ? focusNode : null
    return true
}

const handleInsertText = (cmd: Et.CmdInsertText, ctx: Et.EditorContext) => {
    let offset = cmd.offset
    if (offset < 0) offset = 0
    else if (offset > cmd.text.length) offset = cmd.text.length
    cmd.text.insertData(offset, cmd.data)
    // dom.selectRange会导致2次selectionchange(sel.empty()+sel.addRange()), 因此要跳过2次; 仅chrome, 不同浏览器情况不同
    cmd.setCaret && selectRangeWithCtx(ctx, cmd.targetRanges[1]) // && ctx.forceUpdate()
}
const handleDeleteText = (cmd: Et.CmdDeleteText, ctx: Et.EditorContext) => {
    const removeRange = dom.rangeFromStatic(cmd.deleteRange)
    // 仅删除文本
    removeRange.deleteContents()
    cmd.setCaret && selectRangeWithCtx(ctx, cmd.targetRanges[1]) // && ctx.forceUpdate()
}
const handleReplaceText = (cmd: Et.CmdReplaceText, ctx: Et.EditorContext) => {
    cmd.text.replaceData(cmd.offset, cmd.replacedData.length, cmd.data)
    cmd.setCaret && selectRangeWithCtx(ctx, cmd.targetRanges[1]) // && ctx.forceUpdate()
}
const handleInsertCompositionText = (cmd: Et.CmdInsertCompositionText, ctx: Et.EditorContext) => {
    // console.error('handle insert composition text', cmd)
    // fix.issue. # 解决跨节点Range状态下插入字符, 执行removeContent后cmd.targetRanges[0]还是删除内容前的节点位置的问题, 即命令记录时与真正执行时的初始光标位置不同  
    // 重置输入法会话的第一次输入的targetRange, 保证insertCompositionText命令执行前的准确光标位置
    if (ctx.compositionUpdateCount === 1) {
        // *命令执行时, 依然在beforeinput内, 是无法拿到文本插入后的光标位置的, input事件还未触发
        const sel = ctx.root.getSelection ? ctx.root.getSelection() : getSelection()
        const r = sel?.getRangeAt(0)
        if (!r) return
        cmd.targetRanges[0] = dom.staticFromRange(r)
        const node = r.startContainer
        ctx.oldNode = ctx.node
        ctx.node = dom.isTextNode(node) ? node : null
    }
}
const handleInsertNode = (cmd: Et.CmdInsertNode, ctx: Et.EditorContext, isFresh?: boolean) => {
    const range = dom.rangeFromStatic(cmd.insertAt)
    range.insertNode(cmd.node)
    cmd.setCaret && dom.selectRange(ctx.selection, cmd.targetRanges[1]) && ctx.forceUpdate()
    // 首次执行 && 插入了元素 && 不强制事务 ->> 记录;  当插入文本节点时应当保留，以便命令合并后再commit
    isFresh && !dom.isTextNode(cmd.node) && ctx.commandHandler.commit()
}
const handleRemoveNode = (cmd: Et.CmdRemoveNode, ctx: Et.EditorContext, isFresh?: boolean) => {
    cmd.node.remove()
    /**
     * 如果ctx.node就是cmd.node, 应当将ctx.node置空  
     * fix. issues. # 点击页面内失焦方式结束输入法报错: insertText插入文本不在#text节点上;  
     *  原因在于浏览器发送了一个deleteContentBackward事件将这个#text节点删掉了, 而ctx.node依然非null, 从而导致insertText命令判断为插入文本而非文本节点
     * fix. 通过更新上下文实现
     */
    cmd.setCaret && dom.selectRange(ctx.selection, cmd.targetRanges[1]) && ctx.forceUpdate()
    // 删除了元素, 记录事务
    isFresh && !dom.isTextNode(cmd.node) && ctx.commandHandler.commit()
}
const handleReplaceNode = (cmd: Et.CmdReplaceNode, ctx: Et.EditorContext, isFresh?: boolean) => {
    cmd.node.replaceWith(cmd.newNode)
    cmd.setCaret && dom.selectRange(ctx.selection, cmd.targetRanges[1]) && ctx.forceUpdate()
    isFresh && ctx.commandHandler.commit()
}
const handleInsertContent = (cmd: Et.CmdInsertContent, ctx: Et.EditorContext, isFresh?: boolean) => {
    const range = dom.rangeFromStatic(cmd.insertAt)
    // 计算光标位置, 若设置了collapseTo
    let anchor: Et.NullableNode = null
    let offset: -1 | 0 | 1 = 1
    if (cmd.collapseTo !== undefined) {
        let i = 0
        dom.traverseNode(cmd.fragment, (node) => {
            if (i === cmd.collapseTo) {
                anchor = node
                offset = 1
                return true
            }
            i++
        })
        if (!anchor) anchor = cmd.fragment.lastChild!
    }

    const start = cmd.fragment.firstChild!
    const end = cmd.fragment.lastChild!
    // 插入片段
    range.insertNode(cmd.fragment)
    // 为逆命令设置范围
    const fragmentRange = document.createRange()
    fragmentRange.setStartBefore(start)
    fragmentRange.setEndAfter(end)
    // cmd.fragmentRange = fragmentRange ❌
    //! 必须使用StaticRange
    cmd.fragmentRange = dom.staticFromRange(fragmentRange)

    // 若设置了collapseTo, 替换targetRanges[1]
    if (anchor !== null) {
        cmd.targetRanges[1] = dom.caretStaticRangeOutNode(anchor, offset)
    }

    cmd.setCaret && dom.selectRange(ctx.selection, cmd.targetRanges[1]) && ctx.forceUpdate()
    // 记录事务
    isFresh && ctx.commandHandler.commit()
}
const handleRemoveContent = (cmd: Et.CmdRemoveContent, ctx: Et.EditorContext, isFresh?: boolean) => {
    const removeRange = dom.rangeFromStatic(cmd.removeRange)
    cmd.removeFragment = removeRange.extractContents()
    cmd.setCaret && dom.selectRange(ctx.selection, cmd.targetRanges[1]) && ctx.forceUpdate()
    // 记录事务
    isFresh && ctx.commandHandler.commit()
}
const handleFunctional = (cmd: Et.CmdFunctional, ctx: Et.EditorContext, isFresh?: boolean) => {
    cmd.setCaret && dom.selectRange(ctx.selection, cmd.targetRanges[1]) && ctx.forceUpdate()
    isFresh && ctx.commandHandler.commit()
}


const cmdHandleMap: { [k in Et.Command['type']]: (cmd: Extract<Et.Command, { type: k }>, ctx: Et.EditorContext, isFresh?: boolean) => void } = {
    Insert_Node: handleInsertNode,
    Remove_Node: handleRemoveNode,
    Replace_Node: handleReplaceNode,
    Insert_Text: handleInsertText,
    Delete_Text: handleDeleteText,
    Replace_Text: handleReplaceText,
    Insert_Composition_Text: handleInsertCompositionText,
    Insert_Content: handleInsertContent,
    Remove_Content: handleRemoveContent,
    Functional: handleFunctional,
}
const runCmd = (cmd: Et.Command, ctx: Et.EditorContext, isFresh: boolean) => {
    try {
        cmdHandleMap[cmd.type](cmd as any, ctx)
    } catch (error) {
        if (import.meta.env.DEV) {
            console.error(error)
            console.error('error cmd: ', cmd)
            console.error('error at range', dom.staticFromRange(ctx.range))
        }
    }
}
const handleCmds = (cmds: Et.Command[], ctx: Et.EditorContext) => {
    if (!cmds.length) return
    for (const cmd of cmds) {
        runCmd(cmd, ctx, false)
    }
}


export const cmdHandler = {
    /**
     * 生成一个命令的逆命令
     */
    deCmd: (cmd: Et.Command): Et.Command | null => {
        let deCmd = null
        switch (cmd.type) {
            case 'Insert_Node': {
                deCmd = createCommand('Remove_Node', {
                    node: cmd.node,
                    removeAt: cmd.insertAt,
                    targetRanges: [cmd.targetRanges[1], cmd.targetRanges[0]],
                })
                break;
            }
            case 'Remove_Node': {
                deCmd = createCommand('Insert_Node', {
                    node: cmd.node,
                    insertAt: cmd.removeAt,
                    targetRanges: [cmd.targetRanges[1], cmd.targetRanges[0]],
                })
                break;
            }
            case 'Replace_Node': {
                deCmd = createCommand('Replace_Node', {
                    node: cmd.newNode,
                    newNode: cmd.node,
                    replaceAt: cmd.replaceAt,
                    targetRanges: [cmd.targetRanges[1], cmd.targetRanges[0]]
                })
                break;
            }
            case 'Insert_Text': {
                const deleteRange = new StaticRange({
                    startContainer: cmd.text,
                    startOffset: cmd.offset,
                    endContainer: cmd.text,
                    endOffset: cmd.offset + cmd.data.length,
                })
                deCmd = createCommand('Delete_Text', {
                    data: cmd.data,
                    isBackward: true,
                    deleteRange,
                    targetRanges: [cmd.targetRanges[1], cmd.targetRanges[0]]
                })
                break;
            }
            case 'Delete_Text': {
                deCmd = createCommand('Insert_Text', {
                    text: cmd.deleteRange.endContainer as Text,
                    offset: cmd.deleteRange.startOffset,
                    data: cmd.data,
                    targetRanges: [cmd.targetRanges[1], cmd.targetRanges[0]]
                })
                break;
            }
            case 'Replace_Text': {
                deCmd = createCommand('Replace_Text', {
                    text: cmd.text,
                    offset: cmd.offset,
                    data: cmd.replacedData,
                    replacedData: cmd.data,
                    targetRanges: [cmd.targetRanges[1], cmd.targetRanges[0]]
                })
                break;
            }
            case 'Insert_Composition_Text': {
                // console.error('构建insert composition text 的逆命令--------------------- 这不应该出现, insert composition text没有逆命令')
                console.error('This is a bug, if you please, contact the developer at ausprain@qq.com with message "COMMAND_COMPOSITION_TEXT_REVERSE"')
                break;
            }
            case 'Insert_Content': {
                if (!cmd.fragmentRange) {
                    throw Error('构建insertContent的逆命令: 未提供fragmentRange!')
                }
                deCmd = createCommand('Remove_Content', {
                    removeRange: cmd.fragmentRange,
                    targetRanges: [cmd.targetRanges[1], cmd.targetRanges[0]]
                })
                break;
            }
            case 'Remove_Content': {
                if (!cmd.removeFragment) {
                    throw Error('构建removeContent的逆命令: 未提供removeFragment!')
                }
                deCmd = createCommand('Insert_Content', {
                    fragment: cmd.removeFragment,
                    // cmd.removeRange与被删除内容不相关, 用于构建逆命令插入位置
                    insertAt: dom.caretStaticRangeInNode(cmd.removeRange.startContainer, cmd.removeRange.startOffset),
                    targetRanges: [cmd.targetRanges[1], cmd.targetRanges[0]]
                })
                break;
            }
            case 'Functional': {
                deCmd = cmd
                break;
            }
            default: {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const exhausted: never = cmd
            }
        }
        if (!deCmd) {
            throw Error('构建逆命令失败!')
        }
        // 逆命令仅在undo时的最后一个命令setCaret
        return deCmd
    },
    /**
     * 首次执行命令
     */
    handle: (cmds: Et.Command[], ctx: Et.EditorContext) => {
        if (!cmds.length) return
        for (const cmd of cmds) {
            // cmdHandleMap[cmd.type](cmd as any, ctx, true)   // 首次执行命令, isFresh为true
            runCmd(cmd, ctx, true)
            cmd.redoCallback?.(ctx)
        }
    },
    /**
     * 构建undo命令执行
     */
    handleUndo(redoCmds: Et.Command[], ctx: Et.EditorContext) {
        const undoCmds: Et.Command[] = []
        for (let i = redoCmds.length - 1; i >= 0; i--) {
            const deCmd = this.deCmd(redoCmds[i])
            if (deCmd) {
                deCmd.setCaret = false
                undoCmds.push(deCmd)
            }
        }
        // undo时最后一个命令设置光标位置
        undoCmds.length && (undoCmds[undoCmds.length - 1].setCaret = true)
        // console.error('handle undo: ', 'redo:', redoCmds, 'undo:', undoCmds)
        handleCmds(undoCmds, ctx)
        return undoCmds
    },
    /**
     * 构建redo命令并执行
     */
    handleRedo(undoCmds: Et.Command[], ctx: Et.EditorContext) {
        const redoCmds: Et.Command[] = []
        for (let i = undoCmds.length - 1; i >= 0; i--) {
            const deCmd = this.deCmd(undoCmds[i])
            if (deCmd) {
                deCmd.setCaret = false
                redoCmds.push(deCmd)
            }
        }
        redoCmds.length && (redoCmds[redoCmds.length - 1].setCaret = true)
        // console.error('handle redo: ', 'undo:', undoCmds, 'redo:', redoCmds)
        handleCmds(redoCmds, ctx)
        return redoCmds
    }
}

