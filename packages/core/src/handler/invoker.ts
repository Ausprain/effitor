import type { UpdatedContext } from '../context'
import type { EffectElement } from '../element'
import type { EffectHandle, EffectHandleMap } from './config'

// 增强效应元素构造器类型
type EtElementCtorProps = Record<string, undefined | null | string | number | object | EffectHandle>

/**
 * 效应激活器
 */
export const effectInvoker = {
  getEtElProto<T extends EffectElement>(el: T) {
    return (el.__proto__ ?? Object.getPrototypeOf(el)) as T
  },
  /** 获取 EffectElement的类对象（构造函数） */
  getEtElCtor<T extends typeof EffectElement>(el: InstanceType<T>) {
    // 使用 __proto__ 获取 DOM 对象的原型, jsperf实测性能更优 +60%
    return this.getEtElProto(el).constructor as T & EtElementCtorProps
  },
  /**
   * 激发一个效应元素上的效应, 传递相应参数并执行对应 handler
   * @param el 要激发效应的效应元素, 通常为 ctx.effectElement; 对应的 handler 也从该元素的类对象(构造函数)上取
   * @param effect 要激发的效应名
   * @param ctx 更新后的上下文对象, 即 effector 回调里的 ctx
   * @param payload 效应负载, InputType 效应的负载为对应的 beforeinput 事件的 InputEvent 对象
   */
  invoke<E extends keyof EffectHandleMap>(
    el: EffectElement,
    effect: E,
    ctx: UpdatedContext,
    payload: Required<EffectHandleMap>[E] extends (...args: infer P) => unknown ? P[2] : never,
  ): boolean {
    const Cls = this.getEtElCtor(el)
    if (Cls.effectBlocker && Cls.effectBlocker(effect)) {
      // 阻止该效应
      return false
    }
    // Reflect.get() 性能不好
    // const handle = Reflect.get(Cls, effect)
    const handle = Cls[effect as keyof typeof Cls] as EffectHandle
    if (typeof handle === 'function') {
      return !!handle.call(Cls, Cls, ctx, payload)
    }
    return false
  },
}

export type EffectInvoker = typeof effectInvoker
