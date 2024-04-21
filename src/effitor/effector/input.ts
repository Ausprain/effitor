import type { DOM, Effitor } from '../@types';
import { runInputSolver } from './beforeinput';


export class MainAfterInputTypeSolver implements Effitor.Effector.InputTypeSolver {
    [k: string]: Effitor.Effector.InputAction
}


export const getInputListener = (ctx: Effitor.Editor.Context, main: MainAfterInputTypeSolver, sovlers: Effitor.Effector.InputTypeSolver[]) => {
    return (ev: DOM.InputEvent) => {
        // console.error('after input', ev.inputType)
        runInputSolver(ev, ctx, main, sovlers)
    }
}
