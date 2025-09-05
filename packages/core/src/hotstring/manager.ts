import type { Et } from '../@types'
import { removeHotstringOnTrigger } from './actions'
import { Hotstring } from './judge'

/**
 * 获取一个热字符串管理器
 */
export const getHotstringManager = (ctx: Et.EditorContext) => {
  const hotstringMap = new Map<string, Hotstring>()
  let hsArray: Hotstring[] = []
  let _resetNeeded = false

  const updateHsArray = () => {
    hsArray = [...hotstringMap.values()]
  }
  return {
    /** 创建并添加一个热字符串 */
    create(...args: ConstructorParameters<typeof Hotstring>) {
      this.addHotString(new Hotstring(...args))
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
            hs.action(ctx, () => removeHotstringOnTrigger(ctx, hs.hotstring))
            ctx.commandManager.closeTransaction()
          })
          return (_resetNeeded = true)
        }
      }
      return _resetNeeded && (_resetNeeded = false)
    },
    /**
     * 添加一组热字符串
     */
    addHotStrings(hs: Hotstring[]) {
      hs.forEach((v) => {
        this.addHotString(v)
      })
      updateHsArray()
    },
    /**
     * 添加一个热字符串, 已存在则覆盖
     * @param hs 热字符串对象
     */
    addHotString: (hs: Hotstring) => {
      if (hotstringMap.has(hs.hotstring)) {
        if (import.meta.env.DEV) {
          console.warn(`hotstring "${hs.hotstring}" is already exist`)
        }
        return
      }
      hotstringMap.set(hs.hotstring, hs)
      updateHsArray()
    },
  }
}
export type HotstringManager = ReturnType<typeof getHotstringManager>
