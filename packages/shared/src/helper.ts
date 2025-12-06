/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * `true`或者`false`|`void`|`undefined`, 用于当且仅当返回 `true` 时有side effect的函数
 */
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export type TrueOrVoid = boolean | void | undefined

/* -------------------------------------------------------------------------- */
/*                                util helpers                                */
/* -------------------------------------------------------------------------- */

export type Prettify<T> = {
  [k in keyof T]: T[k]
} & {}

// export type PickUndefined<T> = {
//   [k in keyof T]: T[k] extends infer U ? undefined extends U ? undefined : U : never
// }
/** 长度为N的元组 */
export type TupleOfLength<T, N extends number, R extends T[] = []> = R['length'] extends N ? R : TupleOfLength<T, N, [...R, T]>
/** 去掉元组第一项 */
export type TupleTail<T extends any[]> = T extends [any, ...infer Rest] ? Rest : never
/** 获取元组第一项 */
export type TupleFirst<T extends any[]> = T extends [infer First, ...any[]] ? First : never

// /** 获取构造函数的.prototype属性类型 */
// interface Prototype<C extends { new(): any }> { constructor: C }
// /** Object.getPrototypeOf 的非标实现 __proto__, 拥有性能优势 */
// interface ProtoSlotted<T extends { new(): any }> {
//   __proto__: Prototype<T>
// }
/**
 * 去掉字符串索引签名
 * @example
 * export type T = {
 *   a: number
 *   b: string
 *   [key: string]: any
 * }
 * export type U = OmitStringIndexSignature<T> // { a: number, b: string }
 */
export type OmitStringIndexSignature<T> = {
  [K in keyof T as string extends K ? never : K]: T[K]
}

export type OmitNumberIndexSignature<T> = {
  [K in keyof T as number extends K ? never : K]: T[K]
}

export type OmitIndexSignature<T> = {
  [K in keyof T as number extends K
    ? never
    : string extends K
      ? never
      : symbol extends K
        ? never
        : K]: T[K]
}

// export type Mutable<T> = {
//   -readonly [k in keyof T]: T[k]
// }

/* -------------------------------------------------------------------------- */
/*                                 DOM Helpers                                */
/* -------------------------------------------------------------------------- */

export type NodeHasParent<T extends Node> = Omit<T, 'parentNode' | 'parentElement'> & {
  parentNode: Exclude<T['parentNode'], null>
  parentElement: Exclude<T['parentElement'], null>
}
