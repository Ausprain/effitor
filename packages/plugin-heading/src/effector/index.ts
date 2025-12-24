import type { Et } from '@effitor/core'

import { initHeadingDropdown, replaceCurrentParagraphWithHeading } from './assist'
import { beforeKeydownSolver, keydownSolver } from './solver'

export const headingActions = {
  replaceCurrentParagraphWithHeading,
}
export type HeadingActionMap = typeof headingActions

export const headingEffector: Et.Effector = {
  beforeKeydownSolver,
  keydownSolver,
  onMounted(ctx) {
    // 注册 dropdown
    initHeadingDropdown(ctx)
  },
}
