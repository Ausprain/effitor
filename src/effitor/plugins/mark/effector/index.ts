import type * as Et from "@/effitor/@types";
import { keydownSolver } from "./keydown";
import { inputSolver } from './input';
import { selChange } from "./selchange";




export const markEffector: Et.Effector = {
    keydownSolver,
    afterInputSolver: inputSolver,
    selChangeCallback: selChange,

}

