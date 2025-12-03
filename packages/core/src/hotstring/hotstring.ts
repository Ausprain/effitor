import type { Et } from '../@types'
import { removeHotstringOnTrigger } from './actions'

export interface HotstringAction {
  (
    /** 编辑器上下文 */
    ctx: Et.EditorContext,
    /** 热字符串对象 */
    hs: Hotstring,
    /**
     * 移除已插入热字符串的回调函数, 接受一个可选的替换字符串, 缺省时使用热字符串对象的 repl 属性
     * @returns 移除(替换)了热字符串的文本节点, 不存在或未移除(替换)则返回null
     */
    removeInsertedHotstring: (repl?: string) => Text | null,
  ): void
}

export interface HotstringOptions {
  /** 热字符串触发回调; 若未提供且repl非空, 则替换输入的热字符串为repl */
  action?: HotstringAction
  /** 热字符串替换字符串 */
  repl?: string
  /** 热字符串标题 默认空串 */
  title?: string
  /** 热字符串描述 默认空串 */
  descr?: string
}

/**
 * 热字符串类，用于判断输入字符是否匹配热字符串, 匹配后执行相应动作
 */
export class Hotstring {
  /** 热字符串整串(不包含触发字符) */
  public readonly hotstring: string
  /** 热字符串标题 */
  public readonly title: string
  /** 热字符串描述 */
  public readonly descr: string
  /** 热字符串替换字符串 */
  public readonly repl: string
  /** 热字符串触发回调 */
  private __action?: HotstringAction
  private __chars: string[]
  private __pos: number

  /** 当前匹配进度 */
  get pos() {
    return this.__pos
  }

  /** 热字符串及其触发串后缀, 即热字符串整串 */
  get chars() {
    return this.__chars.join('')
  }

  setAction(action: HotstringAction) {
    this.__action = action
  }

  /**
   * 构造一个热字符串对象，所有热字符串均由空格作为末尾触发字符
   * @param hotstring 热字符串（不可包含触发串）
   * @param triggerChars 热字符串触发串, 会追加到热字符串末尾进行判定
   * @param options 热字符串选项
   *    - action 热字符串触发回调; 若未提供且repl非空, 则替换输入的热字符串为repl
   */
  constructor(hotstring: string, triggerChars: string, {
    action = void 0,
    repl = '',
    title = '',
    descr = '',
  }: HotstringOptions = {}) {
    this.hotstring = hotstring + triggerChars.slice(0, -1)
    this.title = title
    this.descr = descr
    this.repl = repl
    this.__action = action
    this.__chars = (hotstring + triggerChars).split('')
    this.__pos = 0
  }

  /**
   * 热字符串触发回调
   * @param ctx 编辑器上下文
   */
  action(ctx: Et.EditorContext): void {
    if (this.__action) {
      return this.__action(ctx, this, (repl = this.repl) => removeHotstringOnTrigger(ctx, this.hotstring, repl))
    }
    if (this.repl) {
      removeHotstringOnTrigger(ctx, this.hotstring, this.repl)
    }
  }

  /**
   * 判断input的字符是否匹配热字符串当前索引字符
   * @param resetNeeded 当任一热字符串匹配成功，需要重置所有热字符串的pos索引，
   *                    为避免多次遍历所有热字符串进行 reset，使用 resetNeeded 标记
   * @returns 是否匹配成功
   */
  judge(char: string, resetNeeded = false) {
    if (resetNeeded) {
      this.__pos = 0
    }
    if (char === this.__chars[this.__pos]) {
      this.__pos++
    }
    else {
      this.__pos = char === this.__chars[0] ? 1 : 0 // 重新匹配第1个字符
    }
    if (this.__pos === this.__chars.length) {
      this.__pos = 0
      return true
    }
    return false
  }

  /**
   * 回退字符
   * @param count 回退字符数, 默认1
   */
  backflow(count = 1) {
    if (!this.__pos) {
      return
    }
    this.__pos = Math.max(0, this.__pos - count)
  }

  // reset() {
  //     this.__pos = 0
  // }
}
