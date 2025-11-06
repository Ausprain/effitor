import type { Et } from '../@types'

export interface HotstringAction {
  /**
   * 热字符串触发回调
   * @param ctx 编辑器上下文
   * @param hs 热字符串
   * @param removeInsertedHotstring 移除已输入的热字符串, 不会判断移除热字符串文本后节点是否为空
   */
  (ctx: Et.EditorContext, hs: string, removeInsertedHotstring: () => Text | null): void
}
/**
 * 热字符串类，用于判断输入字符是否匹配热字符串, 匹配后执行相应动作
 */
export class Hotstring {
  private __chars: string[] = []
  private __pos = 0
  /** 热字符串整串(不包含触发字符) */
  public readonly hotstring: string
  /** 热字符串触发回调 */
  public readonly action: HotstringAction

  /**
   * 构造一个热字符串对象，所有热字符串均由空格作为末尾触发字符
   * @param hotstring 热字符串（不可包含触发字符：默认是空格）
   * @param action 热字符串触发回调
   */
  constructor(hotstring: string, triggerChars: string, action: HotstringAction) {
    this.hotstring = hotstring + triggerChars.slice(0, -1)
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
  // reset() {
  //     this.__pos = 0
  // }
}
