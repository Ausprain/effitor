import type { Et } from '@effitor/core'
import { reduceFnMappings } from '@effitor/core'

import type { CreateEffitorAIOptions, MarkdownTextMapping, MarkdownTextMappingFn } from './config'
import { mappingForCode, mappingForList, mappingForMark } from './mapping'
import { builtinMapping } from './mapping/builtin'

export class EffitorAI {
  private _markdownTextMapping: MarkdownTextMapping
  private readonly _beforeCallbacks: Required<MarkdownTextMapping>['beforeStart'][] = []
  private readonly _afterCallbacks: Required<MarkdownTextMapping>['afterEnd'][] = []
  private readonly _maskEl: HTMLDivElement

  constructor(
    private readonly _ctx: Et.EditorContext,
    options: CreateEffitorAIOptions = {},
  ) {
    const mappings = [
      ...(options.markdownTextMappings || []),
      mappingForCode, mappingForMark, mappingForList,
      builtinMapping,
    ].map((map) => {
      const { beforeStart, afterEnd, ...rest } = map
      if (beforeStart) this._beforeCallbacks.push(beforeStart)
      if (afterEnd) this._afterCallbacks.push(afterEnd)
      return rest
    })
    this._markdownTextMapping = reduceFnMappings(
      mappings,
      true,
    )

    const mask = document.createElement('div')
    mask.id = 'ai-typing-mask'
    mask.className = 'caret-blink'
    this._ctx.root.appendChild(mask)
    this._maskEl = mask
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
    const { beforeStart, afterEnd, ...rest } = mapping
    if (beforeStart) this._beforeCallbacks.push(beforeStart)
    if (afterEnd) this._afterCallbacks.push(afterEnd)
    this._markdownTextMapping = reduceFnMappings([this._markdownTextMapping, rest], true)
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
   * * 目前此方法直接触发相关事件，依据当前光标位置插入内容；调用者需保证整个typing过程中，
   *   编辑器内的光标不被意外的干扰，否则可能导致插入内容错误
   * @param mdText Markdown文本
   * @param delay 每个字符之间的延迟时间（毫秒）,最小值为30
   */
  async typingMarkdown(mdText: string, delay = 30) {
    if (delay < 30) {
      delay = 30
    }
    const graphemes = this._ctx.segmenter.segmentGraphemeItor(mdText)
    return new Promise((res) => {
      let nextIdx = 0
      this._startTyping()
      const timer = window.setInterval(() => {
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
          return this.typeText(segment)
        }
        const ret = this._markdownTextMapping[segment]?.(this._ctx, index, mdText)
        if (!ret) {
          return this.typeKey({ key: segment, code: segment })
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
          this.typeKey({ key: value, code: value })
        }
        else {
          this.typeText(value)
        }
      }, delay)
    }).finally(() => {
      this._stopTyping()
    })
  }

  private _startTyping() {
    this._runBeforeCallbacks()
    this._startMask()
  }

  private _stopTyping() {
    this._runAfterCallbacks()
    this._stopMask()
  }

  private _runBeforeCallbacks() {
    this._beforeCallbacks.forEach(cb => cb(this._ctx))
  }

  private _runAfterCallbacks() {
    this._afterCallbacks.forEach(cb => cb(this._ctx))
  }

  private _startMask() {
    this._ctx.bodyEl.style.caretColor = 'transparent'
  }

  private _stopMask() {
    this._ctx.bodyEl.style.caretColor = ''
    this._maskEl.style.display = 'none'
  }

  private _updateMask() {
    if (this._ctx.selection.rawEl) {
      this._maskEl.style.display = 'none'
      return
    }
    this._maskEl.style.display = 'block'
    const rect = this._ctx.selection.range?.getClientRects()[0]
    if (rect) {
      this._maskEl.style.height = `${rect.height}px`
      this._maskEl.style.translate = `${rect.left + 5}px ${rect.top}px`
    }
  }

  typeKey(init: KeyboardEventInit) {
    this._ctx.bodyEl.dispatchEvent(new KeyboardEvent('keydown', init))
    this._ctx.bodyEl.dispatchEvent(new KeyboardEvent('keyup', init))
    this._updateMask()
  }

  typeText(data: string) {
    this._ctx.body.dispatchInputEvent('beforeinput', {
      data,
      inputType: 'insertText',
    })
    this._updateMask()
  }
}
