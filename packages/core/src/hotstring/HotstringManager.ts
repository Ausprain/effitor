import type { Et } from '../@types'
import { removeHotstringOnTrigger } from './actions'
import { Hotstring, type HotstringOptions } from './judge'

declare module '../editor/ConfigManager' {
  interface UserConfig {
    hotstringData?: HotstringData
  }
}

interface HotstringData {
  hotstringMapping: Record<string, string>
}

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
  triggerChars: '\x20',
}

/**
 * 获取一个热字符串管理器
 */
export class HotstringManager {
  private readonly hotstringMapping: Record<string, string> = {}
  private readonly hotstringMap = new Map<string, Hotstring>()
  private readonly hsArray: Hotstring[] = []
  private _resetNeeded = false
  public readonly triggerChars: string
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
   * @param hotstring 热字符串, 不可包含触发字符(即HotstringOptions.triggerChars的最后一个字符, 默认为空格);
   *                  该方法会为该字符串添加后缀, 即HotstringOptions.triggerChars除去最后一个字符的剩余部分
   * @param action 热字符串触发回调
   * @example
   * // 假设 HotstringOptions.triggerChars = '.\x20'  即 '.' + 空格
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
          hs.action(this._ctx, hs, (repl = hs.repl) => removeHotstringOnTrigger(this._ctx, hs.hotstring, repl))
          this._ctx.commandManager.closeTransaction()
        })
        return (this._resetNeeded = true)
      }
    }
    return this._resetNeeded && (this._resetNeeded = false)
  }

  /**
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
   * 创建并添加一组热字符串, 已存在则覆盖
   * @param ha 热字符串 -> 触发函数
   */
  addHotStrings(ha: Record<string, HotstringOptions>) {
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
      this.#addHotString(new Hotstring(k, this.triggerChars, {
        repl: v,
        action: (_ctx, _hs, removeInsertedHotstring) => {
          removeInsertedHotstring()
        },
      }), false)
      this.hotstringMapping[k] = v
    })
    this.#updateHsArray()
    this.#updateConfig()
  }

  allHotstrings() {
    return Object.fromEntries(this.hotstringMap.entries())
  }
}
