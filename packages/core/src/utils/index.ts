/* eslint-disable @typescript-eslint/no-explicit-any */
export { dom } from './dom'
export { traversal } from './traversal'

// /** 去掉 html 字符串中 `>` 和 `<` 中间的空白符 */
// export const minifiedHtml = (html: string) => {
//   return html.trim().replaceAll(/(?<=>)\s+|\s+(?=<)/g, '')
// }

export const trimAndCleanZWS = (data: string) => {
  return data.trim().replaceAll('\u200b', '')
}

// export const debounce = <F extends (...args: any[]) => void>(
//   fn: F, delay: number, immediate = true,
// ) => {
//   let timer: number | undefined = void 0
//   let lastCall = 0
//   return immediate
//     ? function (this: ThisParameterType<F>, ...args: Parameters<F>) {
//       clearTimeout(timer)
//       const now = Date.now()
//       if (now - lastCall >= delay) {
//         lastCall = now
//         fn.apply(this, args)
//       }
//       else {
//         timer = window.setTimeout(() => {
//           fn.apply(this, args)
//           lastCall = Date.now()
//         }, delay)
//       }
//     }
//     : function (this: ThisParameterType<F>, ...args: Parameters<F>) {
//       clearTimeout(timer)
//       timer = window.setTimeout(() => {
//         fn.apply(this, args)
//       }, delay)
//     }
// }

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

// export const presetEditorCssVars = (vars: Record<`--${string}`, string>) => {
//   return `et-editor,:host{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';')}}`
// }
// export const presetEditorCssVarsForDark = (vars: Record<`--${string}`, string>) => {
//   return `et-editor.dark,:host(.dark){${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';')}}`
// }

/**
 * 合并多个映射对象, 每个映射对象的key为一个字符串, value为一个泛型T
 * @param mappings 多个映射对象数组
 * @param record 可选的初始记录对象, 默认为空对象; 如果存在相同key, 会被覆盖
 * @returns 合并后的记录对象, 每个key对应一个T类型的数组
 */
export const reduceMappings = <T>(
  mappings: Record<string, T>[],
  record: Record<string, T[]> = {},
): Record<string, T[]> => {
  for (const mapping of mappings) {
    for (const key in mapping) {
      if (record[key]) {
        record[key].push(mapping[key] as T)
      }
      else {
        record[key] = [mapping[key] as T]
      }
    }
  }
  return record
}
/**
 * 合并多个映射函数对象, 每个映射函数对象的key为一个字符串, value为一个泛型T类型的函数
 * @param mappings 多个映射函数对象数组
 * @param stopBy 可选的布尔值, 默认为true;
 *        如果为true, 则当某个映射函数返回真值时, 后续映射函数将不会被调用, 并return该真值;
 *        如果为false, 则当某个映射函数返回非真值时, 后续映射函数将不会被调用, 并return该非真值;
 *        如果为undefined, 则不进行判断, 执行所有映射函数, 并返回最后一个函数的返回值
 * @returns 合并后的映射函数对象, 每个key对应一个T类型的函数
 */
export const reduceFnMappings = <P extends any[], R>(
  mappings: Record<string, (...args: P) => R>[],
  stopBy?: boolean,
): Record<string, (...args: P) => R> => {
  const _fns = reduceMappings(mappings)
  const record = {} as any
  for (const key in _fns) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const fs = _fns[key]!
    if (stopBy === true) {
      record[key] = (...a: P) => {
        let r
        for (const fn of fs) {
          if ((r = fn(...a))) {
            return r
          }
        }
      }
    }
    else if (stopBy === false) {
      record[key] = (...a: P) => {
        let r
        for (const fn of fs) {
          if (!(r = fn(...a))) {
            return r
          }
        }
      }
    }
    else {
      record[key] = (...a: P) => {
        for (let i = 0; i < fs.length; i++) {
          if (i === fs.length - 1) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return fs[i]!(...a)
          }
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          fs[i]!(...a)
        }
      }
    }
  }
  return record
}
