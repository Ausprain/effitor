import { Hotstring } from './judge'

export type { Manager } from './manager'

/** 热字符串对象构造器
 * @param hotstring 热字符串
 * @param action 热字符串触发后的行为
 */
export const create = (...args: ConstructorParameters<typeof Hotstring>) => new Hotstring(...args)
