/* eslint-disable @typescript-eslint/no-explicit-any */

/* -------------------------------------------------------------------------- */
/*                                util helpers                                */
/* -------------------------------------------------------------------------- */

type Prettify<T> = {
  [k in keyof T]: T[k]
} & {}

type PickUndefined<T> = {
  [k in keyof T]: T[k] extends infer U ? undefined extends U ? undefined : U : never
}
/** 长度为N的元组 */
type TupleOfLength<T, N extends number, R extends T[] = []> = R['length'] extends N ? R : TupleOfLength<T, N, [...R, T]>

/** 获取构造函数的.prototype属性类型 */
interface Prototype<C extends { new(): any }> { constructor: C }
/** Object.getPrototypeOf 的各厂商非标实现 __proto__, 拥有性能优势 */
interface ProtoSlotted<T extends { new(): any }> {
  __proto__: Prototype<T>
}
/**
 * 去掉字符串索引签名
 * @example
 * type T = {
 *   a: number
 *   b: string
 *   [key: string]: any
 * }
 * type U = OmitStringIndexSignature<T> // { a: number, b: string }
 */
type OmitStringIndexSignature<T> = {
  [K in keyof T as string extends K ? never : K]: T[K]
}

/* -------------------------------------------------------------------------- */
/*                                 DOM Helpers                                */
/* -------------------------------------------------------------------------- */

type NodeHasParent<T extends Node> = Omit<T, 'parentNode' | 'parentElement'> & {
  parentNode: Exclude<T['parentNode'], null>
  parentElement: Exclude<T['parentElement'], null>
}
