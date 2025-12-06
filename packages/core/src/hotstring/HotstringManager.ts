import type { Et } from '../@types'
import { type HotstringData, HotstringEnum } from './config'
import { Hotstring, type HotstringOptions } from './Hotstring'

export interface HotstringManagerOptions {
  /**
   * 热字符串触发串\
   * 最后一个字符会作为热字符串触发字符, 必须是 KeyboardEvent.key 长度为 1 的合法值, 否则热字符串失效\
   * 若长度>1, 则前面的字符会追加到新增的热字符串末尾, 成为热字符串的一部分(后缀)
   * * ⚠️ 若为空串, 则不使用触发串, 热字符串匹配时直接执行 action; 这会导致当一个热字符串是别的热字符串的前缀时,
   *      永远只有该"前缀"能被触发
   * @default '\x20' (空格)
   */
  triggerChars: string
}

const defaultOptions: HotstringManagerOptions = {
  triggerChars: HotstringEnum.TriggerChar,
}

/**
 * 获取一个热字符串管理器
 */
export class HotstringManager {
  private readonly hotstringMapping: Record<string, string> = {}
  private readonly hotstringMap = new Map<string, Hotstring>()
  private readonly hsArray: Hotstring[] = []
  private _resetNeeded = false
  /** 热字符串触发串, 除最后一个字符外, 作为热字符串的一部分(后缀) */
  public readonly triggerChars: string
  /** 热字符串触发字符, 即 HotstringOptions.triggerChars 的最后一个字符 */
  public readonly trigger: string
  private readonly _configManager: Et.ConfigManager

  constructor(
    private readonly _ctx: Et.EditorContext,
    options?: Partial<HotstringManagerOptions>,
  ) {
    const triggerChars = options?.triggerChars ?? defaultOptions.triggerChars
    this.triggerChars = triggerChars
    this.trigger = triggerChars.slice(-1)
    this._configManager = _ctx.editor.configManager

    // 初始化替换热字符串
    const hotstringData = this._configManager.getConfig('hotstringData') ?? {} as HotstringData
    if (!hotstringData) {
      this._configManager.updateConfig('hotstringData', {
        hotstringMapping: {},
      })
    }
    else if (hotstringData.hotstringMapping) {
      this.addReplHotstrings(hotstringData.hotstringMapping)
    }
  }

  #updateConfig() {
    this._configManager.updateConfig('hotstringData', {
      hotstringMapping: { ...this.hotstringMapping },
    })
  }

  #updateHsArray() {
    this.hsArray.length = 0
    this.hsArray.push(...this.hotstringMap.values())
  }

  /**
   * 添加一个热字符串, 已存在则覆盖
   * @param hs 热字符串对象
   */
  #addHotString(hs: Hotstring, update = true) {
    if (this.hotstringMap.has(hs.hotstring)) {
      this._ctx.assists.logger?.logWarn(`hotstring "${hs.hotstring}" is already exist`, 'Hotstring')
    }
    this.hotstringMap.set(hs.hotstring, hs)
    if (update) {
      this.#updateHsArray()
    }
  }

  get count() {
    return this.hotstringMap.size
  }

  /**
   * 创建并添加一个热字符串
   * @param hotstring 热字符串, 不可包含触发字符(即 HotstringManagerOptions.triggerChars的最后一个字符, 默认为空格);
   *                  该方法会为该字符串添加后缀, 即 HotstringManagerOptions.triggerChars除去最后一个字符的剩余部分
   * @param options 热字符串选项
   * @example
   * // 假设 HotstringManagerOptions.triggerChars = '.\x20'  即 '.' + 空格
   * // 注意: 最后一个字符必须是可视字符, 如`\n`等是无效的
   * create('rel', action)  // 创建一个热字符串, 当连续输入 `rel.` + 空格 时执行 `action`
   */
  create(hotstring: string, options: HotstringOptions) {
    this.#addHotString(new Hotstring(hotstring, this.triggerChars, options))
  }

  /** 标记下次listen时, 需要先将当前judge reset; 以代替统一的reset(), 避免每次都要重新遍历一次所有judge */
  needResetBeforeJudge() {
    return this._resetNeeded = true
  }

  /**
   * 监听一个字符, 判断是否激活热字符串
   * @param char 字符
   * @returns 是否有热字符串匹配
   */
  listen(char: string) {
    for (const hs of this.hsArray) {
      if (hs.judge(char, this._resetNeeded)) {
        // 在微任务中执行（selectionchange之前）
        Promise.resolve().then(() => {
          // _resetNeeded = false
          this._ctx.commandManager.startTransaction()
          hs.action(this._ctx)
          this._ctx.commandManager.closeTransaction()
        })
        return (this._resetNeeded = true)
      }
    }
    return this._resetNeeded && (this._resetNeeded = false)
  }

  /**
   * @internal
   * 回退监听字符
   * @param count 回退字符数
   */
  backflow(count: number) {
    if (count > 0) {
      for (const hs of this.hsArray) {
        hs.backflow(count)
      }
    }
  }

  /**
   * 添加一组热字符串, 已存在则覆盖
   * @param hss 热字符串对象数组
   */
  addHotStrings(hss: Hotstring[]) {
    for (const hs of hss) {
      this.#addHotString(hs, false)
    }
    this.#updateHsArray()
  }

  /**
   * 创建并添加一组热字符串, 已存在则覆盖
   * @param ha 热字符串 -> 热字符串选项
   */
  addHotStringsByOptions(ha: Record<string, HotstringOptions>) {
    Object.entries(ha).forEach(([k, v]) => {
      this.#addHotString(new Hotstring(k, this.triggerChars, v), false)
    })
    this.#updateHsArray()
  }

  /**
   * 创建并添加一组热字符串, 已存在则覆盖; 若任意键或值为空, 则跳过
   * @param hotstringMapping 热字符串 -> 替换字符串
   */
  addReplHotstrings(hotstringMapping: Record<string, string>) {
    Object.entries(hotstringMapping).forEach(([k, v]) => {
      if (!k || !v) {
        return
      }
      this.#addHotString(new Hotstring(k, this.triggerChars, { repl: v }), false)
      this.hotstringMapping[k] = v
    })
    this.#updateHsArray()
    this.#updateConfig()
  }

  /** 获取所有已注册热字符串对象数组 */
  allHotstrings() {
    return [...this.hotstringMap.values()]
  }
}
