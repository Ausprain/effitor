import type { Et } from '../@types'

export interface HotstringAction {
  /**
   * 热字符串触发回调
   * @param ctx 编辑器上下文
   * @param hs 匹配的热字符串对象
   * @param removeInsertedHotstring 移除已输入的热字符串, 不会判断移除热字符串文本后节点是否为空;
   *                                接受一个参数, 要替换插入的字符串, 默认空串, 即仅删除热字符串; 若缺省, 则使用热字符对象上的 repl 属性
   */
  (ctx: Et.EditorContext, hs: Hotstring, removeInsertedHotstring: (repl?: string) => Text | null): void
}
export interface HotstringOptions {
  action: HotstringAction
  /** 热字符串替换字符串 */
  repl?: string
  title?: string
  descr?: string
}
/**
 * 热字符串类，用于判断输入字符是否匹配热字符串, 匹配后执行相应动作
 */
export class Hotstring {
  private __chars: string[] = []
  private __pos = 0
  /** 热字符串整串(不包含触发字符) */
  public readonly hotstring: string
  /** 热字符串替换字符串 */
  public readonly repl: string
  public readonly title: string
  /** 热字符串描述 */
  public readonly descr: string
  /** 热字符串触发回调 */
  public readonly action: HotstringAction

  /** 当前匹配进度 */
  get pos() {
    return this.__pos
  }

  /** 热字符串及其触发串后缀, 即热字符串整串 */
  get chars() {
    return this.__chars.join('')
  }

  /**
   * 构造一个热字符串对象，所有热字符串均由空格作为末尾触发字符
   * @param hotstring 热字符串（不可包含触发串）
   * @param triggerChars 热字符串触发串, 会追加到热字符串末尾进行判定
   * @param action 热字符串触发回调
   */
  constructor(hotstring: string, triggerChars: string, {
    action,
    repl = '',
    title = '',
    descr = '',
  }: HotstringOptions,
  ) {
    this.hotstring = hotstring + triggerChars.slice(0, -1)
    this.repl = repl
    this.title = title
    this.descr = descr
    this.__chars = (hotstring + triggerChars).split('')
    this.action = action
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
