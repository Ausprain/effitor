import type { Et } from '../@types'
import { removeHotstringOnTrigger } from './actions'
import { Hotstring, HotstringAction } from './judge'

export interface HotstringOptions {
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

const defaultOptions: HotstringOptions = {
  triggerChars: '\x20',
}

/**
 * 获取一个热字符串管理器
 */
export const getHotstringManager = (ctx: Et.EditorContext, options?: Partial<HotstringOptions>) => {
  const hotstringMap = new Map<string, Hotstring>()
  const triggerChars = options?.triggerChars ?? defaultOptions.triggerChars
  const trigger = triggerChars.slice(-1)
  let hsArray: Hotstring[] = []
  let _resetNeeded = false

  const updateHsArray = () => {
    hsArray = [...hotstringMap.values()]
  }
  /**
   * 添加一个热字符串, 已存在则覆盖
   * @param hs 热字符串对象
   */
  const addHotString = (hs: Hotstring, update = true) => {
    if (hotstringMap.has(hs.hotstring)) {
      ctx.assists.logger?.warn(`hotstring "${hs.hotstring}" is already exist`, 'Hotstring')
    }
    hotstringMap.set(hs.hotstring, hs)
    if (update) {
      updateHsArray()
    }
  }
  return {
    get trigger() {
      return trigger
    },
    get triggerChars() {
      return triggerChars
    },
    count: () => hotstringMap.size,
    /**
     * 创建并添加一个热字符串
     * @param hotstring 热字符串, 不可包含触发字符(即HotstringOptions.triggerChars的最后一个字符, 默认为空格);
     *                  该方法会为该字符串添加后缀, 即HotstringOptions.triggerChars除去最后一个字符的剩余部分
     * @param action 热字符串触发回调
     * @example
     * // 假设 HotstringOptions.triggerChars = '.\x20'  即 '.' + 空格
     * create('rel', action)  // 创建一个热字符串, 当连续输入 `rel.` + 空格 时执行 `action`
     */
    create(hotstring: string, action: HotstringAction) {
      addHotString(new Hotstring(hotstring, triggerChars, action))
    },
    /** 标记下次listen时, 需要先将当前judge reset; 以代替统一的reset(), 避免每次都要重新遍历一次所有judge */
    needResetBeforeJudge: () => _resetNeeded = true,
    /**
     * 监听一个字符, 判断是否激活热字符串
     * @param char 字符
     * @returns 是否有热字符串匹配
     */
    listen: (char: string) => {
      for (const hs of hsArray) {
        if (hs.judge(char, _resetNeeded)) {
          // 在微任务中执行（selectionchange之前）
          Promise.resolve().then(() => {
            // _resetNeeded = false
            ctx.commandManager.startTransaction()
            hs.action(ctx, hs.hotstring, () => removeHotstringOnTrigger(ctx, hs.hotstring))
            ctx.commandManager.closeTransaction()
          })
          return (_resetNeeded = true)
        }
      }
      return _resetNeeded && (_resetNeeded = false)
    },
    /**
     * 创建并添加一组热字符串, 已存在则覆盖
     * @param ha 热字符串 -> 触发函数
     */
    addHotStrings(ha: Record<string, HotstringAction>) {
      Object.entries(ha).forEach(([k, v]) => {
        addHotString(new Hotstring(k, triggerChars, v), false)
      })
      updateHsArray()
    },
  } as const
}
export type HotstringManager = ReturnType<typeof getHotstringManager>
