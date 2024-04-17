import { runInputSolver } from './beforeinput';
import type { Et } from '../@types';


export class MainAfterInputTypeSolver implements Et.InputTypeSolver {
    [k: string]: Et.InputAction
}


export const getInputListener = (ctx: Et.EditorContext, main: MainAfterInputTypeSolver, sovlers: Et.InputTypeSolver[]) => {
    return (ev: Et.EtInputEvent) => {
        // console.error('after input', ev.inputType)
        runInputSolver(ev, ctx, main, sovlers)
    }
}
