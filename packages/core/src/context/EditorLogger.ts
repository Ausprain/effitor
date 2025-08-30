export class EditorLogger {
  private readonly _logs: string[] = []

  log(data: string, scope = '') {
    this._logs.push(`[LOG]${scope}\u0000: ${data}`)
  }

  warn(data: string, scope = '') {
    this._logs.push(`[WARN]${scope}\u0000: ${data}`)
  }

  error(data: string, scope = '') {
    this._logs.push(`[ERROR]${scope}\u0000: ${data}`)
  }

  clear() {
    this._logs.length = 0
  }

  head(count: number) {
    return this._logs.slice(0, count)
  }

  tail(count: number) {
    return this._logs.slice(-count)
  }
}
