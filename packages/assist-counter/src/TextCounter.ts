import type { Et } from '@effitor/core'
import { HtmlCharEnum } from '@effitor/shared'

export type TextCountCallback = (count: TextCount) => void
export interface TextCount {
  /** 编辑区总字符数 (textContent.length) */
  totalCount: number
  /** 编辑区语义字符数 (contentText.length) */
  textCount: number
  /** 选择的字符总数(排除零宽字符) */
  selectedTextCount: number
}

const defaultOptions = {
  interval: 2000,
  idleTimeout: 1000,
  /**
   * 字符统计更新回调
   * 默认为 undefined, 未配置时不会执行统计任务
   */
  onUpdated: undefined as undefined | TextCountCallback,
}

export type CounterAssistOptions = Partial<typeof defaultOptions>
export class TextCounter {
  constructor(
    private _ctx: Et.EditorContext,
    options?: CounterAssistOptions,
  ) {
    this._interval = options?.interval ?? defaultOptions.interval
    this._idleTimeout = options?.idleTimeout ?? defaultOptions.idleTimeout
    this._onUpdated = options?.onUpdated
  }

  private _interval
  private _autoUpdateTimer?: number = void 0
  private _idleTimeout
  private _idleId?: number = void 0
  private _onUpdated?: TextCountCallback
  /** 设置字符统计更新回调, 未配置时不会执行统计任务；设置后自动开始统计 */
  setUpdatedCallback(callback?: TextCountCallback) {
    this._onUpdated = callback
    this.startCounting()
  }

  /** 开始自动统计, 未配置 onUpdated 时不会执行统计任务 */
  startCounting(interval = this._interval) {
    if (!this._onUpdated || this._autoUpdateTimer) return
    this._autoUpdateTimer = window.setInterval(async () => {
      this.forceUpdate()
    }, interval)
  }

  /** 停止自动统计 */
  stopCounting() {
    if (this._autoUpdateTimer) {
      window.clearInterval(this._autoUpdateTimer)
      this._autoUpdateTimer = void 0
    }
    if (this._idleId) {
      cancelIdleCallbackPolyByEffitor(this._idleId)
      this._idleId = void 0
    }
  }

  forceUpdate() {
    if (!this._onUpdated) {
      return
    }
    if (this._idleId) {
      cancelIdleCallbackPolyByEffitor(this._idleId)
    }
    this._idleId = requestIdleCallbackPolyByEffitor(async () => {
      if (!this._onUpdated) {
        return
      }
      const count = await this.update()
      if (count) {
        this._onUpdated?.(count)
      }
    }, { timeout: this._idleTimeout })
  }

  /** 手动更新字符统计, 并获取统计结果 */
  async update() {
    const totalChar = this._ctx.body.textContent
    const realChar = this._ctx.body.contentText
    let selectedTextCount = 0
    if (!this._ctx.selection.isCollapsed) {
      const selectedText = this._ctx.selection.selectedTextContent
      selectedTextCount = selectedText.replaceAll(HtmlCharEnum.ZERO_WIDTH_SPACE, '').length
    }
    return {
      totalCount: totalChar.length,
      textCount: realChar.length,
      selectedTextCount,
    }
  }
}
