import { MainBeforeInputTypeSolver } from './beforeinput'
import type { MainEffector } from './config'
import { solveEffectors } from './ectx'
import { MainAfterInputTypeSolver } from './input'
import { MainKeydownKeySolver } from './keydown'
import { MainKeyupKeySolver } from './keyup'

export {
  MainAfterInputTypeSolver,
  MainBeforeInputTypeSolver,
  MainKeydownKeySolver,
  MainKeyupKeySolver,
  solveEffectors,
}

export { getBeforeinputListener } from './beforeinput'
export { getCopyListener, getCutListener, getPasteListener } from './clipboard'
export { getCompositionEnd, getCompositionStart, getCompositionUpdate } from './composition'
export { getInputListener } from './input'
export { getKeydownListener } from './keydown'
export { getKeyupListener } from './keyup'
// export { getClickListener, getDblClickListener, getDragEndListener, getDragEnterListener, getDragLeaveListener, getDragListener, getDragOverListener, getDragStartListener, getDropListener, getMouseDownListener, getMouseUpListener } from './mouse'
export { getSelectionChangeListener } from './selchange'

/**
 * 获取一个主效应器
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

export type * from './config'
