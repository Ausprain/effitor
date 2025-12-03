import type { EditorSchema, Effitor } from '../editor'
import type { EditorLogger } from './EditorLogger'

/**
 * 编辑器助手插件
 * @augmentable
 */
export interface EditorAssists {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any
  logger?: EditorLogger
}

/**
 * 编辑器动作, 挂载到ctx上, 由插件扩展其功能; 类似EditorAssists
 * @augmentable
 */
export interface EditorActions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any
}
/**
 * 编辑器插件上下文
 * @augmentable
 */
export interface EditorPluginContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any
}
/**
 * 编辑器上下文元数据, 在编辑器 mount 前, 暴露给插件, 以增强编辑器上下文
 */
export interface EditorContextMeta {
  /** 该上下文所属编辑器 */
  readonly editor: Readonly<Effitor>
  /** 编辑器文档规范 */
  readonly schema: EditorSchema
  /** 编辑器助手插件 */
  readonly assists: EditorAssists
  /** 编辑器动作 */
  readonly actions: EditorActions
  /**
   * 插件上下文, 可扩展 EditorPluginContext 接口来获取类型提示
   */
  readonly pctx: EditorPluginContext
  /**
   * 保持 keydown 事件默认行为的按键组合; 默认放行 "复制/剪切/粘贴",
   * `ctrl + x/c/v` in Windows, or `cmd + x/c/v` in MacOS
   */
  readonly keepDefaultModkeyMap: Record<string, true>
}
