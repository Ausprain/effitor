import type { Effitor } from "@/effitor/@types";
import { keydownSolver } from "./keydown";
import { inputSolver } from './input';
import { selChange } from "./selchange";




export const markEffector: Effitor.Effector = {
    keydownSolver,
    afterInputSolver: inputSolver,
    selChangeCallback: selChange,

}

