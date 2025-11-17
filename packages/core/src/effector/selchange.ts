import type { Et } from '../@types'

export const getSelectionChangeListener = (ctx: Et.EditorContext, callback?: Et.SelChangeAction) => {
  return (ev: Event) => {
    // if (import.meta.env.DEV) {
    //   console.error('sel change', ev)
    // }
    // 编辑命令使用 ctx.forceUpdate 更新了上下文, 跳过
    // fixed. 必须先判断 selChangeSkipped, 因为要消耗掉, 避免其他几个一直为 true, 导致该属性一直不能消耗
    if (ctx.selChangeSkipped
      // 在输入法会话中, 跳过
      || ctx.composition.inSession
      // 原生编辑节点内, 跳过
      || ctx.selection.rawEl
      // 编辑器失去焦点, 跳过
      || !ctx.editor.isFocused
    ) {
      return
    }

    // 光标不连续, 重置热字符串判断
    ctx.hotstringManager.needResetBeforeJudge()
    // activeElement 不是效应元素, 跳过更新上下文, 因为这是全局的 selectionchange 事件
    // TODO 是否可用`editor.isFocused`代替
    // if (!document.activeElement || !etcode.check(document.activeElement)) {
    //   return
    // }
    ctx.update()
    callback?.(ev, ctx)
  }
}
