/* eslint-disable @typescript-eslint/no-explicit-any */
export { dom } from './dom'
export { traversal } from './traversal'

export const trimAndCleanZWS = (data: string) => {
  return data.trim().replaceAll('\u200b', '')
}

export const debounce = <F extends (...args: any[]) => void>(
  fn: F, delay: number, immediate = true,
) => {
  let timer: number | undefined = void 0
  let lastCall = 0
  return immediate
    ? function (this: ThisParameterType<F>, ...args: Parameters<F>) {
      clearTimeout(timer)
      const now = Date.now()
      if (now - lastCall >= delay) {
        lastCall = now
        fn.apply(this, args)
      }
      else {
        timer = window.setTimeout(() => {
          fn.apply(this, args)
          lastCall = Date.now()
        }, delay)
      }
    }
    : function (this: ThisParameterType<F>, ...args: Parameters<F>) {
      clearTimeout(timer)
      timer = window.setTimeout(() => {
        fn.apply(this, args)
      }, delay)
    }
}

export const throttle = <F extends (...args: any[]) => any>(
  fn: F, timeout: number, immediate = true,
) => {
  let lastCall = immediate ? 0 : Date.now()
  return function (this: ThisParameterType<F>, ...args: Parameters<F>) {
    const now = Date.now()
    if (now - lastCall > timeout) {
      lastCall = now
      return fn.apply(this, args)
    }
  }
}

export const camel2kebab = (str: string) => str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
/**
 * 根据cssStyle对象相应的构造css字符串
 * @param selector 对应的css选择器;
 *  若有, 则返回用于<style>标签的css字符串
 *  若没有, 则返回用于style属性的css字符串
 */
export const cssStyle2cssText = (cssStyle: Partial<CSSStyleDeclaration>, selector?: string) => {
  const entries = Object.entries(cssStyle)
  if (!entries.length) return ''

  const append = selector === undefined ? (k: string, v: string) => `${k}:${v}; ` : (k: string, v: string) => `  ${k}: ${v};\n`
  let cssText = ''
  for (const [k, v] of entries) {
    if (v == undefined || v === '') continue
    cssText += append(camel2kebab(k), v.toString())
  }
  return selector ? `${selector} {\n${cssText}}` : cssText
}

export const presetEditorCssVars = (vars: Record<`--${string}`, string>) => {
  return `et-editor,:host{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';')}}`
}
export const presetEditorCssVarsForDark = (vars: Record<`--${string}`, string>) => {
  return `et-editor.dark,:host(.dark){${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';')}}`
}
