import { createInputEffectHandle } from '../../utils'
import { removeByTargetRange } from './deleteAtRange'

export const deleteByCut = createInputEffectHandle((_this, ctx) => {
  // collapse时剪切当前行, 不过应当在 cut 事件监听器中扩展选区并复制, 因为事件顺序是
  // (keydown cmd+x) -> cut -> (beforeinput 'deleteByCut'), 先执行了 cut 事件
  // 再执行到此, 此处直接处理删除即可
  return removeByTargetRange(ctx, ctx.selection.range)
})
