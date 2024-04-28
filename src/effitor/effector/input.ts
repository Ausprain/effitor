import type * as Et from '../@types';
import { runInputSolver } from './beforeinput';


export class MainAfterInputTypeSolver implements Et.InputTypeSolver {
    [k: string]: Et.InputAction
}


export const getInputListener = (ctx: Et.EditorContext, main: MainAfterInputTypeSolver, sovlers: Et.InputTypeSolver[]) => {
    return (ev: Et.InputEvent) => {
        // console.error('after input', ev.inputType)
        runInputSolver(ev, ctx, main, sovlers)
    }
}
