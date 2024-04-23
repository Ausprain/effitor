import type { Effitor } from "@/effitor/@types";
import { UndoStack } from "./undoStack";
import { cmdHandler } from "./handler";


/**
 * 根据上下文对象, 为当前编辑器记录事务
 */
const recordTransaction = (ctx: Effitor.Editor.Context) => {
    // 输入法会话中禁止记录事务; 防止selchange将单个insertCompositionText记录入事务
    if (ctx.inCompositionSession) return false
    return undoStackMap.get(ctx.el)?.pushTransaction(ctx) || false
}
const recordTransactionOnKeydown = (ev: KeyboardEvent, ctx: Effitor.Editor.Context) => {
    // console.error('keydown  --------------------- 记录事务')
    if (!ev.repeat && ev.key !== ctx.currDownKey) {
        recordTransaction(ctx)
    }
    return false
}
// const markTransactionNeeded = (ev: KeyboardEvent, ctx: Effitor.Editor.Context) => {
//     ctx[TRANSACTION_NEEDED] = true
//     return false
// }

const keydownSolver: Effitor.Effector.KeyboardKeySolver = {
    // 空格按下, 记录一次撤回事务
    ' ': recordTransactionOnKeydown,
    Enter: recordTransactionOnKeydown,
    Tab: recordTransactionOnKeydown,
    Backspace: recordTransactionOnKeydown,
    Delete: recordTransactionOnKeydown,
}
const keyupSolver: Effitor.Effector.KeyboardKeySolver = {
    // 空格抬起, 记录一次撤回事务
    // Space: markTransactionNeeded,
    // Enter: markTransactionNeeded,
    // Tab: markTransactionNeeded,
    // Backspace: markTransactionNeeded,
    // Delete: markTransactionNeeded,

    ArrowDown: (ev, ctx) => recordTransaction(ctx),
    ArrowLeft: (ev, ctx) => recordTransaction(ctx),
    ArrowRight: (ev, ctx) => recordTransaction(ctx),
    ArrowUp: (ev, ctx) => recordTransaction(ctx),
    Home: (ev, ctx) => recordTransaction(ctx),
    End: (ev, ctx) => recordTransaction(ctx),
    PageUp: (ev, ctx) => recordTransaction(ctx),
    PageDown: (ev, ctx) => recordTransaction(ctx),

}
const afterInputSolver: Effitor.Effector.InputTypeSolver = {
    insertParagraph: (ev, ctx) => recordTransaction(ctx),
    insertLineBreak: (ev, ctx) => recordTransaction(ctx),
    insertFromPaste: (ev, ctx) => recordTransaction(ctx),
    // insertFromDrop: (ev, ctx) => recordTransaction(ctx),
    deleteWordBackward: (ev, ctx) => recordTransaction(ctx),
    deleteWordForward: (ev, ctx) => recordTransaction(ctx),
}
const beforeInputSolver: Effitor.Effector.InputTypeSolver = {
    // default: (ev, ctx) => {
    //     // 输入法输入不可取消, 且会在所有监听器执行前执行; 要跳过, 否则会让insertCompositionText命令在事务中单独出现
    //     // if (ev.inputType !== 'inputCompositionText' && ctx[TRANSACTION_NEEDED]) {
    //     //     console.log('transaction needed')
    //     //     recordTransaction(ctx)
    //     //     ctx[TRANSACTION_NEEDED] = false
    //     // }
    //     // 接管所有命令
    //     return true
    // },
    historyUndo: (ev, ctx) => {
        // 执行undo前先判断是否有未入栈命令
        const undoStack = undoStackMap.get(ctx.el)
        undoStack?.pushTransaction(ctx)
        undoStack?.undo(ctx)
        ev.preventDefault()
        return true
    },
    historyRedo: (ev, ctx) => {
        undoStackMap.get(ctx.el)?.redo(ctx)
        ev.preventDefault()
        return true
    }
}
// const selChangeCallback = debounce((e: Event, ctx: Effitor.Editor.Context) => {
//     console.error('sel change  --------------------- 记录事务')
//     recordTransaction(ctx)
// }, 1000)
const htmlEventSolver: Effitor.Effector.HTMLEventSolver = {
    compositionend: (ev, ctx) => {
        // console.error('compsoiton end----------------------------- 记录事务')
        undoStackMap.get(ctx.el)?.pushTransaction(ctx)
    },
    focusout: (ev, ctx) => {
        // console.log('编辑器失去焦点, 记录事务')
        recordTransaction(ctx)
    },
    mousedown: (ev, ctx) => {
        // console.log('mouse down ---------------------------- 记录事务, 更新ctx')
        recordTransaction(ctx)
    },
}

const undoStackMap = new WeakMap<HTMLDivElement, UndoStack>()

export const commandUndoHandler: Effitor.Handler.CommandUndoHandler = {
    handle(ctx, cmds) {
        undoStackMap.get(ctx.el)?.record(cmds)
        cmdHandler.handle(cmds, ctx)
        cmds.length = 0
        return true
    },
    commit(ctx) {
        return recordTransaction(ctx)
    },
    discard(ctx) {
        return undoStackMap.get(ctx.el)?.discard(ctx) || false
    },
    commitAll(ctx) {
        undoStackMap.get(ctx.el)?.commitAll(ctx)
    },
}

export const useUndoEffector = (undoLength: number): Effitor.Effector => {
    return {
        keydownSolver,
        keyupSolver,
        beforeInputSolver,
        afterInputSolver,
        htmlEventSolver,
        // selChangeCallback,
        mounted(el: HTMLDivElement) {
            undoStackMap.set(el, new UndoStack(undoLength))
        },
        /**
         * 卸载时移除对应撤回栈并 确认所有事务
         */
        beforeUnmount(el, ctx) {
            undoStackMap.get(el)?.commitAll(ctx)
            undoStackMap.delete(el)
        },
    }
}

// 防止编辑器外ctrl+z时对编辑器内容撤销
document.addEventListener('beforeinput', (ev) => {
    if (ev.inputType === 'historyUndo' || ev.inputType === 'historyRedo') {
        // 阻止没有targetRange的undo/redo, 编辑器在shadowRoot内, 这里无法获取到, 即targetRanges为空数组
        ev.getTargetRanges().length === 0 && ev.preventDefault()
    }
})