export class EditorLogger {
  private readonly _logs: string[] = []

  log(data: string, scope = '') {
    this._logs.push(`[LOG]${scope}\u0000: ${data}`)
    if (import.meta.env.DEV) {
      console.log(this.tail(1)[0])
    }
  }

  warn(data: string, scope = '') {
    this._logs.push(`[WARN]${scope}\u0000: ${data}`)
    if (import.meta.env.DEV) {
      console.warn(this.tail(1)[0])
    }
  }

  error(data: string, scope = '') {
    this._logs.push(`[ERROR]${scope}\u0000: ${data}`)
    if (import.meta.env.DEV) {
      throw new Error(this.tail(1)[0])
    }
  }

  /**
   * 获取头部(最久)n条log
   */
  head(n: number) {
    return this._logs.slice(0, n)
  }

  /**
   * 获取尾部(最近)n条log
   */
  tail(n: number) {
    return this._logs.slice(-n)
  }

  clear() {
    this._logs.length = 0
  }

  /**
   * 批量消费log记录
   * @param chunk 每次迭代返回的log chunk大小
   * @param fn 消费函数，接收一个生成器, 每次yield返回log chunk，next 传入true时停止迭代;
   *           函数返回 true 时将清空 log 记录
   */
  flush(chunk: number, fn: (
    /** chunk生成器，每次yield返回log chunk，next 传入true时停止迭代 */
    it: Generator<string[], void, true | undefined>,
  ) => boolean) {
    const logs = this._logs
    const gen = function* (): Generator<string[], void, true | undefined> {
      for (let i = 0; i < logs.length; i += chunk) {
        if (yield logs.slice(i, i + chunk)) {
          return
        }
      }
    }
    if (fn(gen())) {
      this.clear()
    }
  }
}
