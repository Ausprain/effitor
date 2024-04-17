import { runKeyboardSolver } from './keydown';
import type { Et } from '../@types';

export class MainKeyupSolver implements Et.KeyboardSolver {
    [k: string]: Et.KeyboardAction | undefined
}

let doubleKeyTimer: number | undefined = undefined
export const getKeyupListener = (ctx: Et.EditorContext, main: MainKeyupSolver, solvers: Et.KeyboardSolver[]) => {
    return (ev: KeyboardEvent) => {
        runKeyboardSolver(ev, ctx, main, solvers)

        // 用于判定双击按键, range时禁用
        ctx.prevUpKey = ctx.prevUpKey === null ? undefined : ev.key
        doubleKeyTimer && clearTimeout(doubleKeyTimer)
        doubleKeyTimer = setTimeout(() => {
            ctx.prevUpKey = undefined
        }, 111);
    }
}