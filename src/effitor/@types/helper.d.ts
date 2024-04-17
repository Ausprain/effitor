
type UnionToInterFunction<U> = (
    U extends any ? (k: () => U) => void : never
) extends (k: infer I) => void ? I : never;

type UnionLast<U> = UnionToInterFunction<U> extends {(): infer R} ? R : never;


type Prettify<T> = {
    [k in keyof T]: T[k]
} & {};

type ValueOf<T> = T[keyof T];

/**
 * 从联合对象中, 根据对象属性提取出对应对象类型  
 * `ps.`可直接用`Extract`工具类代替  
 * fixme 存在bug, 外层再使用Prettify时, 结果与预期相悖
 */
type ExtractUnionObjectByProp<U extends Object, P extends keyof U, V extends U[P]> = 
    U extends any
        ? U[P] extends V
            ? U
            : never
        : never;


/**
 * 去掉元组头
 */
// type TupleTail<T extends any[]> = ((...args: T) => void) extends (head: any, ...args: infer R) => void ? R : never;
type TupleTail<T extends any[]> = T extends [any, ...infer R] ? R : never;

/**
 * 可写化类型
 */
type Writable<T> = {
    -readonly [P in keyof T]: T[P]
}

type PowHelper<N extends number, A extends any[] = [any], C extends any[] = []> = C['length'] extends N
    ? C[number]
    : PowHelper<N, [...A, ...A], [...C, A['length']]>