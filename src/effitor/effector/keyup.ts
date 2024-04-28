import type * as Et from '../@types';
import { runKeyboardSolver } from './keydown';

export class MainKeyupKeySolver implements Et.KeyboardKeySolver {
    [k: string]: Et.KeyboardAction | undefined
}

let doubleKeyTimer: number | undefined = undefined
export const getKeyupListener = (ctx: Et.EditorContext, main: MainKeyupKeySolver, solvers: Et.KeyboardKeySolver[]) => {
    return (ev: Et.KeyboardEvent) => {
        // console.error('keyup', ev.key)
        runKeyboardSolver(ev, ctx, main, solvers)

        // 用于判定双击按键, range时禁用
        ctx.prevUpKey = ctx.prevUpKey === null ? undefined : ev.key
        doubleKeyTimer && clearTimeout(doubleKeyTimer)
        doubleKeyTimer = window.setTimeout(() => {
            ctx.prevUpKey = undefined
        }, 111);
    }
}