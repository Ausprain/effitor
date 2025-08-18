import { EffectElement } from '../element'
import { extentEtElement } from '../element/register'
import { buintinHandler } from './handles'

export * from './command'
export type { CommonHandlers } from './common'
export * from './config'
export type { EffectInvoker } from './invoker'
export { fragmentUtils, handlerUtils } from './utils'
export type { MergeHtmlNode } from './utils/fragment'

// 将内置效应处理挂载到效应元素基类构造器上
extentEtElement(EffectElement, buintinHandler, [])
