export { MainKeydownSolver } from './keydown';
export { MainKeyupSolver } from './keyup'
export { MainBeforeInputSolver } from './beforeinput'
export { MainAfterInputSolver } from './input';


import type { Et } from '../@types';
import { MainKeydownSolver } from '.';
import { MainBeforeInputSolver } from '.';
import { MainAfterInputSolver } from '.';
import { MainKeyupSolver } from '.';

/**
 * 获取一个主效应器
 */
export const getMainEffector = (options?: Partial<Et.MainEffector>): Et.MainEffector => {
    const defaultEffector = {
        keydownSolver: options?.keydownSolver ?? new MainKeydownSolver(),
        keyupSolver: options?.keyupSolver ?? new MainKeyupSolver(),
        beforeInputSolver: options?.beforeInputSolver ?? new MainBeforeInputSolver(),
        afterInputSolver: options?.afterInputSolver ?? new MainAfterInputSolver(),
    }
    return defaultEffector
}