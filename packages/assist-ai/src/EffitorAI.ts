import type { Et } from '@effitor/core'
import { reduceFnMappings } from '@effitor/core'

import type {
  CreateEffitorAIOptions,
  MarkdownTextMapping,
  MarkdownTextMappingFn,
} from './config'
import { AIEnum } from './config'
import { builtinMapping } from './mapping/builtin'

export interface TypingResult {
  /** 输入结果Promise, 完成时fulfilled, 失败时rejected */
  finished: Promise<void>
  /** 暂停输入 */
  pause: () => void
  /** 恢复输入 */
  resume: () => void
  /** 取消后续输入 */
  cancel: () => void
}
export type TypingMarkdownArray = readonly (readonly [number, number, boolean, string])[]

export class EffitorAI {
  private _markdownTextMapping: MarkdownTextMapping
  private _useDeco = false
  private readonly _beforeCallbacks: Required<MarkdownTextMapping>['beforeStart'][] = []
  private readonly _afterCallbacks: Required<MarkdownTextMapping>['afterEnd'][] = []
  private readonly _maskEl: HTMLDivElement

  constructor(
    private readonly _ctx: Et.EditorContext,
    options: CreateEffitorAIOptions = {},
  ) {
    const mappings = [
      ...(options.markdownTextMappings || []),
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
    mask.id = AIEnum.Id_Deco
    if (options.typingCaret) {
      this._useDeco = true
      mask.classList.add(AIEnum.Class_Caret)
    }
    if (options.typingMask) {
      this._useDeco = true
      mask.classList.add(AIEnum.Class_Mask)
    }
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

  setTypingDeco(typingCaret = false, typingMask = false) {
    this._useDeco = typingCaret || typingMask
    this._maskEl.classList.toggle(AIEnum.Class_Caret, typingCaret)
    this._maskEl.classList.toggle(AIEnum.Class_Mask, typingMask)
  }

  /**
   * 将Markdown内容依次输入到编辑器中
   * * 目前此方法直接触发相关事件，依据当前光标位置插入内容；调用者需保证整个typing过程中，
   *   编辑器内的光标不被意外的干扰，否则可能导致插入内容错误
   * @param mdText Markdown文本；
   *               在文本中，可用\x00引导一个按键，如："\x00KeyZ,1000{21}"表示按下 Ctrl+Z 21 次；
   *               修饰键用 4 个二进制位表示，顺序依次为：Ctrl, Shift, Alt, Meta
   * @param byWord 是否按单词输入, 默认为true
   * @param delay 每个字符之间的延迟时间（毫秒）,最小值为30（默认 50ms）
   */
  typingMarkdown(mdText: string, byWord?: boolean, delay?: number): TypingResult
  /**
   * 将Markdown内容依次输入到编辑器中
   * * 目前此方法直接触发相关事件，依据当前光标位置插入内容；调用者需保证整个typing过程中，
   *   编辑器内的光标不被意外的干扰，否则可能导致插入内容错误
   * @param mdArray 输入数组, 每个元素为 [本轮结束后延迟, 每次输入延迟, 是否按单词输入, Markdown文本]
   */
  typingMarkdown(mdArray: TypingMarkdownArray): TypingResult
  typingMarkdown(mdTextOrArray: string | TypingMarkdownArray, byWord = true, delay = 50): TypingResult {
    if (delay && delay < 30) {
      delay = 30
    }
    if (typeof mdTextOrArray === 'string') {
      mdTextOrArray = [[0, delay, byWord, mdTextOrArray]]
    }
    type Fn = (() => void) | undefined
    const state = {
      canceled: Promise.resolve(false),
      timer: 0,
      pause: void 0 as Fn,
      resume: void 0 as Fn,
      doJob: void 0 as Fn,
      rejectJob: void 0 as Fn,
      cancelRun: void 0 as Fn,
    }
    const isReadonly = this._ctx.editor.status.readonly
    const run = async () => {
      // A. 等待一个 fulfilled 的 Promise
      // 让出控制权，让typingMarkdown的调用者能在调用后立即 pause
      if (await state.canceled) return Promise.reject()
      // B. 等待一个 fulfilled 或 rejected 的 Promise
      // 如果此时调用了 pause，则该 light 是新的 promise，此处实现等待
      if (await state.canceled) return Promise.reject()
      if (!isReadonly) {
        this._ctx.editor.setReadonly(true)
      }
      this._startTyping()
      for (const [perDelay, charDelay, byWord, mdText] of mdTextOrArray) {
        delay = charDelay
        const gen = this._genMdText(mdText, byWord)
        // C. 等待一个 fulfilled 或 rejected 的 Promise
        // 判断是否 cancel
        if (await state.canceled) return Promise.reject()
        await new Promise<void>((res, rej) => {
          state.rejectJob = rej
          state.doJob = () => {
            const timer = state.timer = window.setInterval(async () => {
              if ((await gen.next()).done) {
                res()
                // fixed. 清除当前的定时器 timer，而不是 state.timer，因为其可能被更改
                // clearInterval(state.timer)
                clearInterval(timer)
              }
            }, delay)
          }
          state.doJob()
        })
        await new Promise(res => setTimeout(res, perDelay))
      }
    }

    state.pause = () => {
      const _pause = state.pause
      state.pause = void 0
      clearInterval(state.timer)
      state.canceled = new Promise<boolean>((res) => {
        state.cancelRun = () => res(true)
        state.resume = () => {
          state.pause = _pause
          state.resume = void 0
          res(false)
          // 若立即 pause，doJob 可能尚未初始化
          state.doJob?.()
        }
      })
    }

    return {
      finished: run().finally(() => {
        if (!isReadonly) {
          this._ctx.editor.setReadonly(false)
        }
        this._stopTyping()
      }),
      pause: () => state.pause?.(),
      resume: () => state.resume?.(),
      cancel: () => {
        clearInterval(state.timer)
        // 用于 C. 阻断下一次循环；因为此时 interval 可能已经结束，clear不一定能完全取消后续输入
        state.canceled = Promise.resolve(true)
        state.pause = void 0
        state.resume = void 0
        state.cancelRun?.()
        state.rejectJob?.()
      },
    }
  }

  private async* _genMdText(mdText: string, byWord: boolean) {
    const segItor = byWord
      ? this._ctx.segmenter.segmentWordItor(mdText)
      : this._ctx.segmenter.segmentGraphemeItor(mdText)
    let nextIdx = 0
    // 遇到 \x00 时, 意味着接下来要输入一个按键, 格式:
    // "\x00Enter,1111"
    // 意味着接下来按下: Ctrl+Shift+Alt+Meta+Enter
    const parseKey = async (start: number) => {
      const j = mdText.indexOf(',', start)
      if (j < 0) {
        return start
      }
      const code = mdText.slice(start, j)
      const ctrlKey = mdText[j + 1] === '1'
      const shiftKey = mdText[j + 2] === '1'
      const altKey = mdText[j + 3] === '1'
      const metaKey = mdText[j + 4] === '1'
      const key = code === 'Space'
        ? ' '
        : code.startsWith('Key')
          ? shiftKey ? code.slice(3).toLowerCase() : code.slice(3)
          : code
      if (mdText[j + 5] === '{') {
        const k = mdText.indexOf('}', j + 5)
        const count = parseInt(mdText.slice(j + 6, k))
        if (!isNaN(count)) {
          return new Promise<number>((res) => {
            let i = 0
            const it = setInterval(() => {
              this.typeKey({ key, code, ctrlKey, shiftKey, altKey, metaKey })
              if (++i >= count) {
                clearInterval(it)
                res(k + 1)
              }
            }, 50)
          })
        }
      }
      this.typeKey({ key, code, ctrlKey, shiftKey, altKey, metaKey })
      return j + 5
    }
    const typeNext = async (segment: string, index: number) => {
      if (segment === AIEnum.Typing_Key_Char) {
        nextIdx = await parseKey(index + 1)
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
    }

    let next
    while (!(next = segItor.next()).done) {
      const { segment, index } = next.value
      if (!segment || nextIdx > index) {
        continue
      }
      if (!this._ctx.selection.range || !this._ctx.isUpdated()) {
        this._ctx.focusToBodyEnd()
      }
      yield typeNext(segment, index)
    }
  }

  private _startTyping() {
    this._ctx.editor.setReadonly(true)
    this._ctx.bodyEl.style.pointerEvents = 'none'
    this._runBeforeCallbacks()
    this._startMask()
  }

  private _stopTyping() {
    this._ctx.bodyEl.style.pointerEvents = ''
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
    if (!this._useDeco) {
      return
    }
    if (this._ctx.selection.rawEl) {
      this._maskEl.style.display = 'none'
      return
    }
    const rect = this._ctx.selection.range?.getClientRects()[0]
    if (rect) {
      this._maskEl.style.height = `${rect.height}px`
      this._maskEl.style.translate = `${rect.left + 5}px ${rect.top}px`
      this._maskEl.style.display = 'block'
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
