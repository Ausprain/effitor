import type { EditorContext, UpdatedContext } from '../context'
import type { EffectElement } from '../element'
import type { EffectHandle, EffectHandler, EffectHandleThis } from './config'

// 增强效应元素构造器类型
type EtElementCtorProps = Record<string, undefined | null | string | number | object | EffectHandle>

/**
 * 效应激活器
 */
export const effectInvoker = {
  /** 获取效应元素或效应元素构造器的原型对象 */
  getEtProto<T extends EffectElement | typeof EffectElement>(el: T) {
    return (el.__proto__ ?? Object.getPrototypeOf(el)) as T
  },
  /** 获取效应元素实例的类对象（构造器） */
  getEtElCtor<T extends typeof EffectElement>(el: InstanceType<T>) {
    // 使用 __proto__ 获取 DOM 对象的原型, jsperf实测性能更优 +60%
    return this.getEtProto(el).constructor as T & EtElementCtorProps & EffectHandleThis
  },
  /**
   * 激发一个效应元素上的效应, 传递相应参数并执行对应效应 handle 函数 (可通过 EffectHandleDeclaration 定义)
   * @param el 要激发效应的效应元素, 通常为 ctx.commonEtElement; 对应的 handler 也从该元素的类对象(构造函数)上取
   * @param effect 要激发的效应名
   * @param ctx 更新后的上下文对象, 即 effector 回调里的 ctx
   * @param payload 效应负载, InputType 效应的负载为对应的 beforeinput 事件的 InputEvent 对象
   */
  invoke<E extends keyof EffectHandler,
    Args extends (Required<EffectHandler>[E] extends (...args: infer P) => unknown ? P : never),
    Ret extends (Required<EffectHandler>[E] extends (...args: infer _) => infer R ? R : never),
  >(
    /** 使用元组定义参数, 以获取准确的 payload 类型, 参考 {@link Generator["next"]} */
    ...[el, effect, ctx, payload]: Args[1] extends undefined
      ? [EffectElement, E,
          // 不应提取该参数到泛型参数列表中, 否则会导致循环引用
          Args[0] extends UpdatedContext ? UpdatedContext : EditorContext,
        ]
      : [EffectElement, E,
          Args[0] extends UpdatedContext ? UpdatedContext : EditorContext,
          E extends 'E' ? unknown : Args[1],
        ]
  ): Ret | false {
    const Cls = this.getEtElCtor(el)
    if (Cls.effectBlocker && Cls.effectBlocker(effect, ctx, el)) {
      // 阻止该效应
      return false
    }
    // Reflect.get() 性能不好
    // const handle = Reflect.get(Cls, effect)
    const handle = Cls[effect as keyof typeof Cls] as EffectHandle
    if (typeof handle === 'function') {
      return handle.call(Cls, ctx, payload) as Ret
    }
    return false
  },
}

export type EffectInvoker = typeof effectInvoker
