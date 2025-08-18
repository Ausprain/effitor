import type { Et } from '~/core/@types'

import { EffectElementCtor } from './EffectElement'

/**
 * 注册一个EtElement为CustomElement
 */
export const registerEtElement = (
  ctor: EffectElementCtor,
) => {
  if (!customElements.get(ctor.elName)) {
    customElements.define(ctor.elName, ctor as unknown as typeof HTMLElement)
  }
}
/**
 * 扩展一个内置效应元素, 为其添加或重写handler
 * @param ctor 被扩展的元素
 * @param extension 扩展执行器handler对象
 * @param extensionElements 扩展哪些新元素到该被扩展元素上（将来哪些元素允许成为该被扩展元素的后代）;若仅扩展handler功能，则传入空数组
 */
export const extentEtElement = (
  ctor: EffectElementCtor,
  extension: Et.EffectHandleMap,
  extensionElements: EffectElementCtor[],
) => {
  // 将新的EffectHandle绑到构造函数上
  Object.assign(ctor, extension)
  extensionElements?.forEach((ext) => {
    // 扩充允许列表
    ctor.inEtType |= ext.etType
    // 从禁止列表中剔除
    ctor.notInEtType -= ctor.notInEtType & ext.etType
  })
}
export type ExtentEtElement = typeof extentEtElement
