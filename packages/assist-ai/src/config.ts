import type { Et } from '@effitor/core'

export type MarkdownTextMapping = Record<string, MarkdownTextMappingFn>
export interface MarkdownTextMappingFn {
  /**
   * 处理markdown特殊字符; 如连续的**, 要转为加粗, 而不是插入两个*
   * @param index 当前字符在文本中的索引
   * @param text 完整文本
   * @returns 映射结果
   */
  (ctx: Et.EditorContext, index: number, text: string): MarkdownTextMappingFnResult
}
/**
 * 返回null, 无特殊处理\
 * 返回{ key, data, nextIndex }, 表示将char替换为按下key或输入data, 并将索引设置到nextIndex;
 * 返回(ctx: Et.EditorContext) => number, 表示自行处理, 返回下一个索引
 */
export type MarkdownTextMappingFnResult = null | ((ctx: Et.EditorContext) => number) | {
  /** keydown的key值 或 beforeinput输入的data文本 */
  value: string
  /** 映射类型, 表示value是keydown的key值 还是 beforeinput输入的data文本 */
  type: 'key' | 'data'
  /**
   * 下一个输入的起始索引, 若该索引不是某个字素的首个字符索引, 则索引所在的整个字素会被跳过;
   * 正常来讲, 要跳过`n`个字符(包括当前char) 就返回 `index + n` 即可
   */
  nextIndex: number
}

export interface CreateEffitorAIOptions {
  /** 要添加的Markdown特殊字符的映射函数 */
  markdownTextMappings?: MarkdownTextMapping[]
}
