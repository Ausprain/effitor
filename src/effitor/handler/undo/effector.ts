import type * as Et from "@/effitor/@types";

// /**
//  * 根据上下文对象, 为当前编辑器记录事务
//  */
// const recordTransaction = (ctx: Et.EditorContext) => {
//     // 输入法会话中禁止记录事务; 防止输入法中按下Backspace等时, 将单个insertCompositionText记录入事务
//     if (ctx.inCompositionSession) return false
//     return ctx.commandHandler.commit() || false
// }
const recordTransactionOnKeydown = (ev: KeyboardEvent, ctx: Et.EditorContext) => {
    // console.error(`keydown: ${ev.key}  --------------------- 记录事务`)
    if (!ev.repeat && ev.key !== ctx.currDownKey) {
        ctx.commandHandler.commit()
    }
    return false
}
// const markTransactionNeeded = (ev: KeyboardEvent, ctx: Et.EditorContext) => {
//     ctx[TRANSACTION_NEEDED] = true
//     return false
// }

const keydownSolver: Et.KeyboardKeySolver = {
    // 空格按下, 记录一次撤回事务
    ' ': recordTransactionOnKeydown,
    Enter: recordTransactionOnKeydown,
    Tab: recordTransactionOnKeydown,
    Backspace: recordTransactionOnKeydown,
    Delete: recordTransactionOnKeydown,
}
const keyupSolver: Et.KeyboardKeySolver = {
    // 空格抬起, 记录一次撤回事务
    // Space: markTransactionNeeded,
    // Enter: markTransactionNeeded,
    // Tab: markTransactionNeeded,
    // Backspace: markTransactionNeeded,
    // Delete: markTransactionNeeded,

    ArrowDown: (ev, ctx) => ctx.commandHandler.commit(),
    ArrowLeft: (ev, ctx) => ctx.commandHandler.commit(),
    ArrowRight: (ev, ctx) => ctx.commandHandler.commit(),
    ArrowUp: (ev, ctx) => ctx.commandHandler.commit(),
    Home: (ev, ctx) => ctx.commandHandler.commit(),
    End: (ev, ctx) => ctx.commandHandler.commit(),
    PageUp: (ev, ctx) => ctx.commandHandler.commit(),
    PageDown: (ev, ctx) => ctx.commandHandler.commit(),

}
const afterInputSolver: Et.InputTypeSolver = {
    insertParagraph: (ev, ctx) => ctx.commandHandler.commit(),
    insertLineBreak: (ev, ctx) => ctx.commandHandler.commit(),
    insertFromPaste: (ev, ctx) => ctx.commandHandler.commit(),
    // insertFromDrop: (ev, ctx) => ctx.commandHandler.commit(),
    deleteWordBackward: (ev, ctx) => ctx.commandHandler.commit(),
    deleteWordForward: (ev, ctx) => ctx.commandHandler.commit(),
}
const beforeInputSolver: Et.InputTypeSolver = {
    // default: (ev, ctx) => {
    //     // 输入法输入不可取消, 且会在所有监听器执行前执行; 要跳过, 否则会让insertCompositionText命令在事务中单独出现
    //     // if (ev.inputType !== 'inputCompositionText' && ctx[TRANSACTION_NEEDED]) {
    //     //     console.log('transaction needed')
    //     //     ctx.commandHandler.commit()
    //     //     ctx[TRANSACTION_NEEDED] = false
    //     // }
    //     // 接管所有命令
    //     return true
    // },
    historyUndo: (ev, ctx) => {
        // 执行undo前先判断是否有未入栈命令
        ctx.commandHandler.commit()
        ctx.commandHandler.undoTransaction(ctx)
        ev.preventDefault()
        return true
    },
    historyRedo: (ev, ctx) => {
        ctx.commandHandler.redoTransaction(ctx)
        ev.preventDefault()
        return true
    }
}
// const selChangeCallback = debounce((e: Event, ctx: Et.EditorContext) => {
//     console.error('sel change  --------------------- 记录事务')
//     ctx.commandHandler.commit()
// }, 1000)
const htmlEventSolver: Et.HTMLEventSolver = {
    compositionend: (ev, ctx) => {
        // console.error('compsoiton end----------------------------- 记录事务')
        ctx.commandHandler.commit()
    },
    focusout: (ev, ctx) => {
        // console.log('编辑器失去焦点, 记录事务')
        ctx.commandHandler.commit()
    },
    mousedown: (ev, ctx) => {
        // console.log('mouse down ---------------------------- 记录事务, 更新ctx')
        ctx.commandHandler.commit()
    },
}


export const useUndoEffector = (): Et.Effector => {
    return {
        keydownSolver,
        keyupSolver,
        beforeInputSolver,
        afterInputSolver,
        htmlEventSolver,
        // selChangeCallback,
        /**
         * 卸载时移除对应撤回栈并 确认所有事务
         */
        onBeforeUnmount(el, ctx) {
            ctx.commandHandler.commitAll(ctx)
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
