export { MainKeydownSolver } from './keydown';
export { MainKeyupSolver } from './keyup'
export { MainBeforeInputTypeSolver } from './beforeinput'
export { MainAfterInputTypeSolver } from './input';


import type { Effitor } from '../@types';
import { MainKeydownSolver } from '.';
import { MainBeforeInputTypeSolver } from '.';
import { MainAfterInputTypeSolver } from '.';
import { MainKeyupSolver } from '.';

/**
 * 获取一个主效应器
 */
export const getMainEffector = (options?: Partial<Effitor.Effector.MainEffector>): Effitor.Effector.MainEffector => {
    const defaultEffector = {
        keydownSolver: options?.keydownSolver ?? new MainKeydownSolver(),
        keyupSolver: options?.keyupSolver ?? new MainKeyupSolver(),
        beforeInputSolver: options?.beforeInputSolver ?? new MainBeforeInputTypeSolver(),
        afterInputSolver: options?.afterInputSolver ?? new MainAfterInputTypeSolver(),
    }
    return defaultEffector
}