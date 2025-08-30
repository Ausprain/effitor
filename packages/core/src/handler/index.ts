import { EffectElement } from '../element'
import { extentEtElement } from '../element/register'
import { buintinHandler } from './builtin'

export * from './command'
export type { CommonHandlers } from './common'
export * from './config'
// 注意 handlerUtils 的所有方法均只添加命令, 不执行
export * as handlerUtils from './handles'
export type { EffectInvoker } from './invoker'
export {
  createEffectHandle,
  createInputEffectHandle,
  fragmentUtils,
} from './utils'
export type { MergeHtmlNode } from './utils/fragment'

// 将内置效应处理挂载到效应元素基类构造器上
extentEtElement(EffectElement, buintinHandler, [])
