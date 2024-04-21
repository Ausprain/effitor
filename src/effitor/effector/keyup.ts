import type { Effitor } from '../@types';
import { runKeyboardSolver } from './keydown';

export class MainKeyupSolver implements Effitor.Effector.KeyboardSolver {
    [k: string]: Effitor.Effector.KeyboardAction | undefined
}

let doubleKeyTimer: number | undefined = undefined
export const getKeyupListener = (ctx: Effitor.Editor.Context, main: MainKeyupSolver, solvers: Effitor.Effector.KeyboardSolver[]) => {
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