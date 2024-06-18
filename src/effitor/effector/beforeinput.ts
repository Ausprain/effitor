import type * as Et from '../@types'
import { BuiltinConfig } from '../@types/constant';
import { dom } from "../utils";

/**
 * todo 思考: solver -> handler 这一层的意义是什么; 似乎直接在solver中处理就可以了  
 * &2023.12.12 17:54 目前solver就只是做个中转
 * &2023.12.13 08:10 根据Input Event Level2 标准草案, 对dom的改动必须发出beforeinput, input事件  
 *      effectHandler既处理inputType, 也处理由keydown发出的（如光标移动请求: 双击空格跳出当前样式节点）  
 *      缩写符由于修改了dom, 还是走beforeinput
 * &2023.12.13 18:08 引入EffectCommand命令模式, 
 *      beforeinput变成了一个从AnchorElement提取命令, 送去EffectHandler执行的控制者,  
 *      更便于扩展一个UndoEffector插件以实现撤回栈
 * &2023.12.14 07:47 撤回栈只能内置了
 *      removeConent命令删除的dom片段, 撤回时必须插入相同的dom节点, 否则继续撤回时StaticRange会找不到节点
 *      而命令处理又在所有effector之后的EffectHandler.handle中处理
 *      因此撤回栈功能没办法交由前面的effector处理, 只能在handle中一并处理了
 * &2023.12.14 09:42 撤回栈还是独立成一个effector
 *      先执行内置effector的话, 对于historyUndo/Redo, 还需要额外跳过其他effector (因为solver要返回cmds)
 *      干脆在undo effector中直接执行cmds, 然后清空; 这样会导致每一个inputtype都得实现一遍
 *      遂给InputTypeSolver添加一个default, 没有找到对应inputType就返回default
 * &2024.01.05 09:45 将命令控制权交给上下文ctx
 *      createEditor时, 额外提供一个可选参数cmdsHandler, 将挂到ctx上; 每次执行命令时调用ctx.handleEtCommands() 
 *      undoEffector提供额外的cmdsHandler覆盖默认的cmdsHandler
 */
const mainBeforeInputTypeSolver: Et.MainInputTypeSolver = {
    default: (ev, ctx) => {
        ctx.effectInvoker.invoke(BuiltinConfig.BUILTIN_EFFECT_PREFFIX + ev.inputType as Et.InputTypeEffect, ctx, ev)
        ctx.commandHandler.handle() && ev.preventDefault()
    },
    /** 未声明或不合法的inputType, 执行此回调 */
    '': (ev, ctx) => {
        console.error(`handle beforeinput type=="${ev.inputType}"  ======`)
        ctx.commandHandler.handle() && ev.preventDefault()
    }

    // /** 输入法插入字符, 唯一不可prevent的beforeinput事件 */
    // insertCompositionText: () => {
    //     return true
    // },
}

export class MainBeforeInputTypeSolver implements Et.InputTypeSolver {
    [k: string]: Et.InputAction | undefined
}
Object.assign(MainBeforeInputTypeSolver.prototype, mainBeforeInputTypeSolver)

export const runInputSolver = (ev: Et.InputEvent, ctx: Et.EditorContext, main: MainBeforeInputTypeSolver, solvers: Et.InputTypeSolver[]) => {
    if (!ctx.effectElement) {
        console.error('无效应元素')
        return
    }

    for (const mapping of solvers) {
        const fn = mapping[ev.inputType] ?? mapping.default
        if (typeof fn === 'function' && fn(ev, ctx)) {
            // effector处理返回true, 跳过后续effector
            break
        }
    }
    if (ctx.skipDefault) return (ctx.skipDefault = false)

    const fn = main[ev.inputType] ?? main.default
    typeof fn === 'function' && fn(ev, ctx)
}

export const getBeforeinputListener = (ctx: Et.EditorContext, main: MainBeforeInputTypeSolver, solvers: Et.InputTypeSolver[]) => {
    return (ev: Et.InputEvent) => {
        // 输入法会话内 跳过deleteContentBackward 处理
        if (ctx.inCompositionSession && ev.inputType === 'deleteContentBackward') {
            // ev.preventDefault()  // 该deleteContentBackward是不可取消的
            return false
        }
        // console.error('beforeinput', ev.inputType, ctx.effectElement)
        // 移除当前段落状态
        runInputSolver(ev, ctx, main, solvers)

        if (!ev.defaultPrevented && ev.inputType !== 'insertCompositionText') {
            // todo remove
            console.error(`There's unhandled input:`, ev.inputType, ev.getTargetRanges()[0], ev)
            // 阻止所有beforeinput默认行为
            ev.preventDefault()
        }
        else {
            // 默认事件被取消, 手动dispatch input事件
            dom.dispatchInputEvent(ctx.root, 'input', {
                inputType: ev.inputType as Et.InputType,
                data: ev.data,
                // bubbles: false,   //不可冒泡
            })
        }
    }
}
