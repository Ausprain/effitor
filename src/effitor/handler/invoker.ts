import type * as Et from '../@types'
import { EffectElement, type EffectElementCtor } from '../element';


/**
 * 效应调度器
 */
export const initEffectInvoker = (ctx: Et.EditorContext): Et.EffectInvoker => {
    return {
        getEffectElCtor(el: EffectElement) {
            return (<Et.Prototype<EffectElementCtor>>Object.getPrototypeOf(el)).constructor
        },
        invoke(e: string, ...args: any[]) {
            if (ctx.effectElement.effectBlocker && ctx.effectElement.effectBlocker(e)) {
                // 阻止该效应
                return false
            }
            const Cls = this.getEffectElCtor(ctx.effectElement)
            // const handle = Cls[e as Et.Effect]
            const handle = Reflect.get(Cls, e)
            // console.log('invoke', e, !!handle)
            if (typeof handle === 'function') {
                return handle.apply(Cls, args)
            }
        },
    }
}

// declare module '../../effitor' {
//     module Et {
//         interface EffectHandlerDeclaration {
//             aaaa: (a: string)=>any
//         }
//     }
// }
// const effectInvoker: Et.EffectInvoker = {}

// effectInvoker.invoke('aaaa', )