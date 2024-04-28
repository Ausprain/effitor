import { builtinHandler } from './builtin'
import { EffectElement, extentEtElement } from '../element'
import { addonHandler } from './addon'

export * from './invoker'
export { builtinHandler }
export { createCommand } from './cmd'

extentEtElement(EffectElement, builtinHandler)
extentEtElement(EffectElement, addonHandler)