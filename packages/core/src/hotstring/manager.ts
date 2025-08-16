import type { Et } from '..'
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
    /** 标记下次listen时, 需要先将当前judge reset; 以代替统一的reset(), 避免每次都要重新遍历一次所有judge */
    needResetBeforeJudge: () => _resetNeeded = true,
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
    addHotStrings: (hs: Hotstring[]) => {
      hs.forEach((v) => {
        if (hotstringMap.has(v.hotstring)) {
          if (import.meta.env.DEV) {
            console.warn(`hotstring "${v.hotstring}" is already exist`)
          }
          return
        }
        hotstringMap.set(v.hotstring, v)
      })
      updateHsArray()
    },
  }
}
export type Manager = ReturnType<typeof getHotstringManager>
