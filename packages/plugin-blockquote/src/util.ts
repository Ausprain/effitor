import type { BlockquoteMeta, BlockquotePluginContext } from './config'

export const blockquoteMetaParser = {
  /**
   * 从引用块首段落文本中解析引用块元数据
   * @param text 引用块首段落文本
   * @param bqCtx 引用块插件上下文
   * @returns 引用块元数据
   */
  fromText: (text: string, bqCtx: BlockquotePluginContext) => {
    let i = text.indexOf(' ')
    if (i < 0) {
      i = text.length
    }
    const marker = text.slice(0, i)
    const title = text.slice(i + 1)
    if (!marker || !marker.startsWith('[!') || !marker.endsWith(']')) {
      return null
    }
    const type = marker.slice(2, -1)
    const meta = bqCtx.metaMap[type]
    if (!meta) {
      return null
    }
    return {
      ...meta,
      title: title || meta.title,
    }
  },
  /**
   * 将引用块元数据转换为引用块首段落文本
   * @param meta 引用块元数据
   * @param withMarker 是否包含引用块标记 `> `
   * @returns 引用块首段落文本
   */
  toText: (meta: BlockquoteMeta, withMarker: boolean) => {
    const title = meta.title === meta.type.toUpperCase() ? '' : meta.title
    return `${withMarker ? '> ' : ''}[!${meta.type.toUpperCase()}] ${title}`.trimEnd()
  },
}
