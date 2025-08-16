import { EffectElement, extentEtElement } from '../element'
import { buintinHandler } from './handles'

export * from './command'
export { commonHandlers } from './common'
export * from './config'
export { effectInvoker } from './invoker'
export { fragmentUtils, handlerUtils } from './utils'
export type * from './utils/fragment'

// 将内置效应处理挂载到效应元素基类构造器上
extentEtElement(EffectElement, buintinHandler, [])
