import type { EffectHandleMap, InputEffectHandle } from '../config'

export * as fragmentUtils from './fragment'

/**
 * 创建普通效应处理函数
 * @param fn 效应处理器函数, 非箭头函数的 this 指向该 handler 最终被挂载到的效应元素类对象(构造函数)
 * @returns 传入的fn
 *
 * @bundle-perf 此方法直接返回参数函数, 用于协助开发, 打包构建生产产物时, 解包此方法
 */
export const createEffectHandle = <E extends keyof EffectHandleMap>(
  _effect: E,
  fn: Required<EffectHandleMap>[E],
) => {
  return fn
}
/**
 * 创建输入事件效应处理函数
 * @param fn 效应处理器函数, 非箭头函数的 this 指向该 handler 最终被挂载到的效应元素类对象(构造函数)
 * @returns 传入的fn
 *
 * @bundle-perf 此方法直接返回参数函数, 用于协助开发, 打包构建生产产物时, 解包此方法
 */
export const createInputEffectHandle = (fn: InputEffectHandle) => {
  return fn
}
