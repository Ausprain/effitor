import type { Et } from '../@types'
import type { EffectElement, EffectElementCtor } from './EffectElement'

/**
 * 注册一个EtElement为CustomElement
 */
export const registerEtElement = (
  ctor: EffectElementCtor,
) => {
  if (!customElements.get(ctor.elName)) {
    customElements.define(ctor.elName, ctor as unknown as typeof HTMLElement)
    Object.defineProperty(ctor, 'thisHandler', {
      value: ctor,
      configurable: false,
      enumerable: false,
      writable: false,
    })
    Object.defineProperty(ctor, 'superHandler', {
      value: ctor.__proto__ ?? Object.getPrototypeOf(ctor),
      configurable: false,
      enumerable: false,
      writable: false,
    })
  }
  else if (import.meta.env.DEV) {
    console.error(`Element ${ctor.elName} has been registered`)
  }
}
/**
 * 挂载一个效应处理器到指定效应元素构造器上
 * @param ctor 被挂载的效应元素类对象
 * @param handler 挂载的效应处理器对象
 * @param subEtElements 子效应元素类对象列表, 用于扩展 ctor 的效应码（即将来哪些元素允许成为 ctor 对应效应元素的子节点）;
 *                      若仅挂载handler功能，则传入空数组
 */
export const mountEtHandler = <
  E extends EffectElement,
  P extends Et.EtParagraph | null,
  T extends Et.EtParagraph | null,
>(
  ctor: EffectElementCtor,
  handler: Et.EffectHandler | Et.EffectHandlerWith<E, P, T>,
  subEtElements: EffectElementCtor[],
) => {
  // 将新的EffectHandle绑到构造函数上
  Object.assign(ctor, handler)
  subEtElements?.forEach((ext) => {
    // 扩充允许列表
    ctor.inEtType |= ext.etType
    // 从禁止列表中剔除
    ctor.notInEtType -= ctor.notInEtType & ext.etType
  })
}
export type MountEtHandler = typeof mountEtHandler
