import type { Effitor } from "../@types";
import { dom } from "../utils";

/**
 * 判断用户Backspace期望删除的内容是否为uneditable的内容; 是则需手动构造targetRange发送 beforeinput事件（ inputType="deleteContentBackward" ）,    
 *  因为chromium会直接找上一个可编辑节点, 然后删除中间所有内容, 而不是只删除上一个  
 */
const checkBackspaceInUneditable = (ev: KeyboardEvent, ctx: Effitor.Editor.Context) => {
    if (!ctx.range.collapsed) return
    const offset = ctx.range.startOffset
    let delTargetRange: StaticRange
    let prevNode: Node | null
    if (ctx.node) {
        // 大部分情况不是#text节点开头, 让chromium默认行为构建targetRange发送beforeinput
        if (offset !== 0) return
        // 文档树的上一节点
        prevNode = dom.treePrevNode(ctx.node)
    }
    else {
        // 获取光标前一个节点
        prevNode = ctx.range.startContainer.childNodes[offset - 1]
        if (!prevNode) return
        if (!dom.isEditableNode(prevNode)) {
            // 不可编辑节点整体删除
            delTargetRange = dom.caretStaticRangeOutNode(prevNode, 0)
            dom.dispatchInputEvent(ctx.root, 'beforeinput', {
                inputType: 'deleteContentBackward',
                targetRanges: [delTargetRange,]
            })
            ev.preventDefault()
            return
        }
        // 获取前一个节点的最内层lastChild, 即文档树上一节点
        prevNode = dom.innermostEndingNode(prevNode)
    }
    if (!prevNode) return
    // 文档树上一节点可编辑, 删除内部
    // 这么做是因为, 当遇到交叉嵌套contenteditable时, 光标无法自动跳到内层的contenteditable中, 需要手动设置删除的targetRange  
    if (dom.isEditableNode(prevNode)) {
        if (dom.isTextNode(prevNode) && prevNode.length > 0) {
            delTargetRange = new StaticRange({
                startContainer: prevNode,
                startOffset: prevNode.length - 1,
                endContainer: prevNode,
                endOffset: prevNode.length,
            })
        }
        else {
            delTargetRange = dom.caretStaticRangeOutNode(prevNode, 0)
        }
    }
    // 文档树上一节点不可编辑, 找最外层不可编辑节点, 整体删除
    else {
        prevNode = dom.outermostUneditableAncestor(prevNode)
        delTargetRange = dom.caretStaticRangeOutNode(prevNode, 0)
    }
    if (!delTargetRange) return

    dom.dispatchInputEvent(ctx.root, 'beforeinput', {
        inputType: 'deleteWordBackward',
        targetRanges: [delTargetRange,]
    })
    ev.preventDefault()
}
/**
 * 判断用户Delete期望删除的内容是否为uneditable内容, 是则需手动构造targetRange 发送beforeinput事件（ inputType="deleteContentForward" ）  
 */
const checkDeleteInUneditable = (ev: KeyboardEvent, ctx: Effitor.Editor.Context) => {
    if (!ctx.range.collapsed) return
    let nextNode: Node | null
    let delTargetRange: StaticRange
    const offset = ctx.range.endOffset
    if (ctx.node) {
        // 不是末尾, 跳过
        if (offset !== ctx.node.length) return
        const pLast = dom.innermostEndingNode(ctx.paragraphEl)
        // 段落末尾
        if (ctx.node === pLast || dom.isBrElement(pLast) && ctx.node === pLast.previousSibling) {
            const nextP = ctx.paragraphEl.nextElementSibling
            if (!nextP) return
            delTargetRange = new StaticRange({
                startContainer: ctx.paragraphEl,
                startOffset: ctx.paragraphEl.childNodes.length,
                endContainer: nextP,
                endOffset: 0
            })
            dom.dispatchInputEvent(ctx.root, 'beforeinput', {
                inputType: 'deleteContentForward',
                targetRanges: [delTargetRange,]
            })
            ev.preventDefault()
            return
        }
        else {
            nextNode = dom.treeNextNode(ctx.node)
        }
    }
    else {
        nextNode = ctx.range.startContainer.childNodes[offset]
    }
    if (!nextNode) return
    if (dom.isEditableNode(nextNode)) {
        if (dom.isTextNode(nextNode) && nextNode.length > 0) {
            delTargetRange = new StaticRange({
                startContainer: nextNode,
                startOffset: 0,
                endContainer: nextNode,
                endOffset: 1
            })
        }
        else {
            delTargetRange = dom.caretStaticRangeOutNode(nextNode, 0)
        }
    }
    else {
        nextNode = dom.outermostUneditableAncestor(nextNode)
        delTargetRange = dom.caretStaticRangeOutNode(nextNode, 0)
    }
    if (!delTargetRange) return

    dom.dispatchInputEvent(ctx.root, 'beforeinput', {
        inputType: 'deleteContentForward',
        targetRanges: [delTargetRange,]
    })
    ev.preventDefault()
}


const keydownKeySolver: Effitor.Effector.KeyboardKeySolver = {
    ' ': (ev, ctx) => {
        if (ctx.prevUpKey === ev.key) {
            ctx.effectInvoker.invoke('dblSpace', ctx) && ctx.commandHandler.handle() && ev.preventDefault()
        }
        else if (ctx.range.collapsed && ctx.range.endOffset === 1 && ctx.paragraphEl.textContent === '#') {
            // console.error('atx #')
            ctx.effectInvoker.invoke('atxHeading', ctx) && ctx.commandHandler.handle() && ev.preventDefault()
        }
    },
    // 编辑器内禁用ctrl+r,ctrl+p等浏览器快捷键
    R: (ev) => { ev.ctrlKey && (ev.preventDefault(), ev.stopPropagation()) },
    P: (ev) => { ev.ctrlKey && (ev.preventDefault(), ev.stopPropagation()) },
    T: (ev) => { ev.ctrlKey && (ev.preventDefault(), ev.stopPropagation()) },
    N: (ev) => { ev.ctrlKey && (ev.preventDefault(), ev.stopPropagation()) },
    // F: (ev) => { ev.ctrlKey && (ev.preventDefault(), ev.stopPropagation()) },
    // G: (ev) => { ev.ctrlKey && (ev.preventDefault(), ev.stopPropagation()) },

    Z: (ev, ctx) => {
        if (ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
            dom.dispatchInputEvent(ctx.root, 'beforeinput', {
                inputType: 'historyUndo'
            })
            ev.preventDefault()
            ev.stopPropagation()
            return true
        }
    },
    Y: (ev, ctx) => {
        if (ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
            dom.dispatchInputEvent(ctx.root, 'beforeinput', {
                inputType: 'historyRedo'
            })
            ev.preventDefault()
            ev.stopPropagation()
            return true
        }
    },

    Tab: (ev, ctx) => {
        if (ev.ctrlKey || ev.altKey) return
        // 非选区状态下, 效应元素不是段落, 退出
        if (ctx.range.collapsed && ctx.effectElement !== ctx.paragraphEl) return
        dom.dispatchInputEvent(ctx.root, 'beforeinput', {
            inputType: ev.shiftKey ? 'formatOutdent' : 'formatIndent',
            bubbles: false,
        })
        ev.preventDefault()
    },

    Enter: (ev, ctx) => {
        if (ev.isComposing) return
        ev.preventDefault()
        if (ev.shiftKey && !ev.ctrlKey) {
            // 插入软换行
            // console.log('Shift + enter')
            // 插入<br>
            dom.dispatchInputEvent(ctx.root, 'beforeinput', {
                inputType: 'insertLineBreak',
            })
        }
        else if (ev.ctrlKey) {
            // 编辑器末尾插入段落
            // console.log('Ctrl + enter')
            // dom.dispatchInputEvent(ctx.root, 'beforeinput', {
            //     // fixme 自定义inputType无效, 会被替换成 ""
            //     inputType: 'appendParagraph'
            // })
        }
        else {
            // 空段落 enter减缩进
            if (ctx.range.collapsed && ctx.paragraphEl.indent && ctx.paragraphEl.textContent === '') {
                dom.dispatchInputEvent(ctx.root, 'beforeinput', {
                    inputType: 'formatOutdent',
                    bubbles: false,
                })
            }
            // 插入段落
            // console.log('enter', ctx.root)
            else {
                dom.dispatchInputEvent(ctx.root, 'beforeinput', {
                    inputType: 'insertParagraph'
                })
            }
        }
    },
    Backspace: (ev, ctx) => {
        checkBackspaceInUneditable(ev, ctx)
    },
    Delete: (ev, ctx) => {
        checkDeleteInUneditable(ev, ctx)
    },
}

export class MainKeydownSolver implements Effitor.Effector.KeyboardSolver {
    [k: string]: Effitor.Effector.KeyboardAction | undefined
}
Object.assign(MainKeydownSolver.prototype, keydownKeySolver)

export const runKeyboardSolver = (ev: KeyboardEvent, ctx: Effitor.Editor.Context, main: Effitor.Effector.KeyboardSolver, solvers: Effitor.Effector.KeyboardKeySolver[]) => {
    const key = ev.key.length === 1 ? ev.key.toUpperCase() : ev.key

    for (const mapping of solvers) {
        const fn = mapping[key] ?? mapping.default
        // 其中一个效应器返回true, 跳过后续
        if (typeof fn === 'function' && fn(ev, ctx)) {
            break
        }
    }
    // ctx标记skipDefault跳过默认effector
    if (ctx.skipDefault) return (ctx.skipDefault = false)

    // mainKeydownSolver需要在其他效应器后执行, 因为会dispatch beforeinput事件；如果先执行, 就会先执行beforeinput再执行其他keydownSolver
    const fn = main[key] || main['default']
    typeof fn === 'function' && fn(ev, ctx)
}

export const getKeydownListener = (ctx: Effitor.Editor.Context, main: MainKeydownSolver, solvers: Effitor.Effector.KeyboardSolver[]) => {
    return (ev: KeyboardEvent) => {
        // console.log('keydown:', ev.key, ev.code, ctx.currDownKey)

        // 没有effectElement 阻止后续输入
        if (!ctx.effectElement) {
            ev.preventDefault()
            ev.stopPropagation()
            return
        }
        runKeyboardSolver(ev, ctx, main, solvers)

        ctx.currDownKey = ev.key
        // 若光标为Range, 设为null, 并在keyup中跳过
        ctx.prevUpKey = ctx.range.collapsed ? undefined : null
    }
}
