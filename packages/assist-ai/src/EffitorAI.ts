import type { Et } from '@effitor/core'
import { reduceFnMappings } from '@effitor/core'

import type { CreateEffitorAIOptions, MarkdownTextMapping, MarkdownTextMappingFn } from './config'
import { mappingForCode, mappingForList, mappingForMark } from './mapping'
import { builtinMapping } from './mapping/builtin'

export class EffitorAI {
  private _markdownTextMapping: MarkdownTextMapping

  constructor(
    private readonly _ctx: Et.EditorContext,
    options: CreateEffitorAIOptions = {},
  ) {
    this._markdownTextMapping = reduceFnMappings(
      [...(options.markdownTextMappings || []),
        mappingForCode, mappingForMark, mappingForList,
        builtinMapping],
      true,
    )
  }

  /**
   * 添加Markdown特殊字符的映射函数; 当先添加的映射函数返回值非null时, 后续映射函数将不会被调用
   * @param mapping 映射对象
   */
  addMarkdownTextMapping(mapping: MarkdownTextMapping) {
    if (!Object.keys(this._markdownTextMapping).length) {
      Object.assign(this._markdownTextMapping, mapping)
      return
    }
    this._markdownTextMapping = reduceFnMappings([this._markdownTextMapping, mapping], true)
  }

  /**
   * 设置Markdown特殊字符的映射函数; 已存在会被覆盖
   * @param char 特殊字符
   * @param mappingFn 映射函数
   */
  setMarkdownTextMapping(char: string, mappingFn: MarkdownTextMappingFn) {
    this._markdownTextMapping[char] = mappingFn
  }

  /**
   * 将Markdown内容依次输入到编辑器中
   * @param mdText Markdown文本
   * @param delay 每个字符之间的延迟时间（毫秒）,最小值为30
   */
  async typingMarkdown(mdText: string, delay = 30) {
    if (delay < 30) {
      delay = 30
    }
    const graphemes = this._ctx.segmenter.segmentGraphemeItor(mdText)
    let timer: number, nextIdx = 0
    return new Promise((res) => {
      timer = window.setInterval(() => {
        const next = graphemes.next()
        if (next.done) {
          res(true)
          clearInterval(timer)
          return
        }
        const { segment, index } = next.value
        if (!segment || nextIdx > index) {
          return
        }
        if (segment.length > 1 || segment.charCodeAt(0) > 127) {
          return this.#typeText(segment)
        }
        const ret = this._markdownTextMapping[segment]?.(this._ctx, index, mdText)
        if (!ret) {
          return this.#typeKey({ key: segment, code: segment })
        }
        if (typeof ret === 'function') {
          nextIdx = ret(this._ctx)
          return
        }
        const { value, type, nextIndex } = ret
        nextIdx = nextIndex
        if (!value) {
          return
        }
        if (type === 'key') {
          this.#typeKey({ key: value, code: value })
        }
        else {
          this.#typeText(value)
        }
      }, delay)
    })
  }

  #typeKey(init: KeyboardEventInit) {
    this._ctx.bodyEl.dispatchEvent(new KeyboardEvent('keydown', init))
    this._ctx.bodyEl.dispatchEvent(new KeyboardEvent('keyup', init))
  }

  #typeText(data: string) {
    this._ctx.body.dispatchInputEvent('beforeinput', {
      data,
      inputType: 'insertText',
    })
  }
}
