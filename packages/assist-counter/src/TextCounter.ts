import type { Et } from '@effitor/core'

export type TextCountCallback = (count: TextCount) => void
export interface TextCount {
  /** 编辑区总字符数 */
  totalCount: number
  /** 编辑区非空白字符数 */
  charCount: number
  /** 编辑区真实字符数(排除零宽字符和空白字符) */
  realCount: number
  /** 选择的总字符数 */
  selectedCount: number
  /** 选择的真实字符总数(排除零宽字符和空白字符) */
  selectedRealCount: number
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
  /** 设置字符统计更新回调, 未配置时不会执行统计任务 */
  setUpdatedCallback(callback?: TextCountCallback) {
    this._onUpdated = callback
  }

  /** 开启自动统计, 未配置 onUpdated 时不会执行统计任务 */
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
    const totalChar = this._ctx.textContent() ?? ''
    const nonBlank = totalChar.replaceAll(/\s/g, '')
    const realChar = nonBlank.replaceAll('\u200B' /** HtmlCharEnum.ZERO_WIDTH_SPACE */, '')
    let selectedCount = 0, selectedRealCount = 0
    if (!this._ctx.selection.isCollapsed) {
      const selectedText = this._ctx?.selectedTextContent() ?? ''
      selectedCount = selectedText.length
      selectedRealCount = selectedText.replaceAll(new RegExp(/\s|\u200B/g) /** HtmlCharEnum.ZERO_WIDTH_SPACE */, '').length
    }
    return {
      totalCount: totalChar.length,
      charCount: nonBlank.length,
      realCount: realChar.length,
      selectedCount,
      selectedRealCount,
    }
  }
}
