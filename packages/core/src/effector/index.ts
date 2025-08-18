import { MainBeforeInputTypeSolver } from './beforeinput'
import type { MainEffector } from './config'
import { MainAfterInputTypeSolver } from './input'
import { MainKeydownKeySolver } from './keydown'
import { MainKeyupKeySolver } from './keyup'

export type * from './config'
export { useEffectorContext, withEffectorContext } from './ectx'
export {
  MainAfterInputTypeSolver,
  MainBeforeInputTypeSolver,
  MainKeydownKeySolver,
  MainKeyupKeySolver,
}

/**
 * 获取一个主效应器
 * @internal
 */
export const getMainEffector = (options?: Partial<MainEffector>): MainEffector => {
  const defaultEffector = {
    keydownSolver: options?.keydownSolver ?? new MainKeydownKeySolver(),
    keyupSolver: options?.keyupSolver ?? new MainKeyupKeySolver(),
    beforeInputSolver: options?.beforeInputSolver ?? new MainBeforeInputTypeSolver(),
    afterInputSolver: options?.afterInputSolver ?? new MainAfterInputTypeSolver(),
  }
  return defaultEffector
}
