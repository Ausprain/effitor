import './augment'

// fixed. Et 命名空间存在循环引用, core 包内只能用相对路径导入, 不可用 ts 路径映射, 否则 tsup 打包失败
export type { Et } from './@types'
export type * from './@types/declare'
export { platform } from './config'
export * from './index.export'
