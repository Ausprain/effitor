import type * as Et from "@/effitor/@types";
export * as dom from './dom'



export const camel2kebab = (str: string) => str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
/**
 * 根据cssStyle对象相应的构造css字符串
 * @param selector 对应的css选择器;  
 *  若有, 则返回用于<style>标签的css字符串
 *  若没有, 则返回用于style属性的css字符串
 */
export const cssStyle2cssText = (cssStyle: Partial<Et.ElStyle>, selector?: string) => {
    const entries = Object.entries(cssStyle)
    if (!entries.length) return ''

    const append = selector === undefined ? (k: string, v: string) => `${k}:${v}; ` : (k: string, v: string) => `  ${k}: ${v};\n`
    let cssText = ''
    for (const [k, v] of entries) {
        if (v == undefined || v === '') continue
        cssText += append(camel2kebab(k), v)
    }
    return selector ? `${selector} {\n${cssText}}` : cssText
}


export const debounce = <F extends (...args: any[]) => void>(fn: F, timeout: number) => {
    let timer: number | undefined
    return function (this: ThisParameterType<F>, ...args: Parameters<F>) {
        if (timer !== undefined) clearTimeout(timer)
        timer = window.setTimeout(() => {
            fn.apply(this, args)
        }, timeout)
    }
}

export const throttle = <F extends (...args: any[]) => void>(fn: F, timeout: number, { immediate = true } = {}) => {
    let timer: number | undefined
    return immediate
        ? function (this: ThisParameterType<F>, ...args: Parameters<F>) {
            if (timer !== undefined) return
            fn.apply(this, args)
            timer = window.setTimeout(() => {
                timer = undefined
            }, timeout);

        }
        : function (this: ThisParameterType<F>, ...args: Parameters<F>) {
            if (timer !== undefined) return
            timer = window.setTimeout(() => {
                fn.apply(this, args)
                timer = undefined
            }, timeout);
        }
}
