import { platform } from '../../../config'
import { cmd } from '../../command'
import { createInputEffectHandle } from '../../utils'
import { insertTextAtCaret } from '../insert/insert.shared'

export const insertCompositionText = platform.isSupportInsertFromComposition
  // Safari 或 MacOS webview 中可通过insertFromComposition拦截输入法输入,
  // 不用合并 InsertCompositionText 命令, 直接返回true 即可
  ? () => true
  : createInputEffectHandle((_that, ctx, pl) => {
      if (!pl.data) {
        return true
      }
      ctx.commandManager.push(cmd.insertCompositionText({
        data: pl.data,
      }))
      return true
    })

/**
 * 输入法会话中删除输入法组合串文本, 仅 Safari; 不用处理
 */
export const deleteCompositionText = createInputEffectHandle(() => {
  return true
})

/**
 * 输入法会话结束后, 自动删除输入法组合串, 并将组合结果插入到光标位置, 仅 Safari;
 * 阻止这个默认行为, 用 InsertText 命令代替
 */
export const insertFromComposition = createInputEffectHandle((_that, ctx, pl) => {
  // FIXME 在 Safari 中, 输入法插入内容后, 若当前块节点为空, 会自动插入一个<br>, 该行为似乎无法阻止
  // 类似的, 在删除一个块节点的内容以致其无子节点时, 也会自动插入一个<br>
  // pl.preventDefault()
  if (!pl.data) {
    return true
  }
  return insertTextAtCaret(ctx, pl.data, pl.targetRange.toTargetCaret())
})
