import { runInputSolver } from './beforeinput';
import type { Et } from '../@types';


export class MainAfterInputSolver implements Et.InputSolver {
    [k: string]: Et.InputAction
}


export const getInputListener = (ctx: Et.EditorContext, main: MainAfterInputSolver, sovlers: Et.InputSolver[]) => {
    return (ev: InputEvent) => {
        // console.error('after input', ev.inputType)
        runInputSolver(ev, ctx, main, sovlers)
    }
}
