/* eslint-disable @stylistic/max-len */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { InputType } from '../@types'
import type { UpdatedContext } from '../context'
import type { EffectElement, EtParagraphElement } from '../element'
import { BuiltinConfig } from '../enums'

export type EffectHandleReturnType = boolean | number | object | string
/**
 * Effect处理器
 * @returns 是否成功处理该效应
 */
export interface EffectHandle {
  /**
   * 效应处理函数
   * @param _this 当前invoke的效应元素类对象(构造器)
   * @param ctx 更新后的上下文
   * @param payload 效应负载
   * @returns 是否成功处理该效应
   */
  // 由于函数逆变特性, 后续声明的 handler 的参数必须是此处参数的父类, 因此 payload 只能是 any
  (_this: EffectHandleThis, ctx: UpdatedContext, payload?: any): EffectHandleReturnType
}
/**
 * InputEvent.inputType效应处理器
 */
export interface InputEffectHandle {
  /**
   * 处理指定InputEvent.inputType效应
   * @param _this 当前invoke的效应元素类对象(构造器)
   * @param ctx 更新后的上下文
   * @param ev 输入事件
   * @returns 是否成功处理该效应
   */
  (_this: EffectHandleThis, ctx: UpdatedContext, ev: InputEvent): boolean
}

/**
 * InputType效应
 */
export type InputTypeEffect = `${BuiltinConfig.BUILTIN_EFFECT_PREFFIX}${InputType}`
export type InputTypeEffectHandleMap = Record<InputTypeEffect, InputEffectHandle>
export type DefaultEffectHandleMap = InputTypeEffectHandleMap & {
  /** 处理成功, 返回 true; 未处理, 返回topElement 的前兄弟, 处理失败, 返回false */
  BackspaceAtParagraphStart: (_this: EffectHandleThis, ctx: UpdatedContext) => EtParagraphElement | boolean
  DeleteAtParagraphEnd: (_this: EffectHandleThis, ctx: UpdatedContext) => EtParagraphElement | boolean
}
/**
* 绑在类名上的效应处理器声明
* InputType的Effect使用 `E+inputType`命名
* 自定义Effect小写字母开头
* @extendable
*/
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface EffectHandleDeclaration extends Record<string, EffectHandle> {
}
/**
 * 用于创建 handler 时提供类型提示
 */
export type EffectHandleMap = Partial<
  // 去掉索引签名, 用于在 invoke 方法中获得参数提示
  OmitStringIndexSignature<EffectHandleDeclaration> & DefaultEffectHandleMap
>

export type EffectHandleThis = typeof EffectElement & EffectHandleMap
/**
 * 创建普通效应处理函数
 * @param fn 效应处理器函数, 非箭头函数的 this 指向该 handler 最终被挂载到的效应元素类对象(构造函数)
 * @returns 传入的fn
 *
 * @bundle-perf 此方法直接返回参数函数, 用于协助开发, 打包构建生产产物时, 解包此方法
 */
export const createEffectHandle = <E extends keyof EffectHandleMap>(
  effect: E,
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
