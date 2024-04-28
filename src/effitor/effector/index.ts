export { MainKeydownKeySolver } from './keydown';
export { MainKeyupKeySolver } from './keyup'
export { MainBeforeInputTypeSolver } from './beforeinput'
export { MainAfterInputTypeSolver } from './input';


import type * as Et from '../@types';
import { MainKeydownKeySolver } from './keydown';
import { MainKeyupKeySolver } from './keyup';
import { MainBeforeInputTypeSolver } from './beforeinput';
import { MainAfterInputTypeSolver } from './input';

/**
 * 获取一个主效应器
 */
export const getMainEffector = (options?: Partial<Et.MainEffector>): Et.MainEffector => {
    const defaultEffector = {
        keydownSolver: options?.keydownSolver ?? new MainKeydownKeySolver(),
        keyupSolver: options?.keyupSolver ?? new MainKeyupKeySolver(),
        beforeInputSolver: options?.beforeInputSolver ?? new MainBeforeInputTypeSolver(),
        afterInputSolver: options?.afterInputSolver ?? new MainAfterInputTypeSolver(),
    }
    return defaultEffector
}