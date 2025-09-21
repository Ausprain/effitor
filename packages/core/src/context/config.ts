import type { EditorSchema, EditorSettings, Effitor } from '../editor'
import type { EditorLogger } from './EditorLogger'

/**
 * 编辑器助手插件
 */
export interface EditorAssists {
  logger?: EditorLogger
}
/**
 * 编辑器插件上下文
 * @extendable
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface EditorPluginContext extends Record<symbol, unknown> {}
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
  /**
   * 插件上下文, 可扩展 EditorPluginContext 接口来获取类型提示
   * * 不同于效应器上下文(ectx), 插件上下文是局部的(每个编辑器实例的上下文 ctx 独有)
   */
  readonly pctx: EditorPluginContext
  /**
   * 编辑器设置, 类似EditorCallbacks, 但编辑器核心不会主动调用; 一般由扩展/插件添加, 用于定义编辑器的状态 \
   * 其最大的意义是, 在编辑器创建之后, 在不重启编辑器的情况下更改编辑器及其插件的配置
   */
  readonly settings: EditorSettings
  /**
   * 保持 keydown 事件默认行为的按键组合; 默认放行 "复制/剪切/粘贴",
   * `ctrl + x/c/v` in Windows, or `cmd + x/c/v` in MacOS
   */
  readonly keepDefaultModkeyMap: Record<string, true>
}
