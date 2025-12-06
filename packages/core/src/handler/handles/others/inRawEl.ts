import type { Et } from '../../../@types'
import { platform } from '../../../config'
import { cmd } from '../../command'
import type { CommandFunctional } from '../../command/cmds'
import { createEffectHandle } from '../../utils'

const solveInsertCompositionTextInRawEl = platform.isSupportInsertFromComposition
  // safari可通过 insertFromComposition 拦截输入法输入, 不用处理
  ? (tailCmd: CommandFunctional | undefined, ctx: Et.EditorContext) => {
      tailCmd?.exec(ctx)
      return true
    }
  : (tailCmd: CommandFunctional | undefined,
      ctx: Et.EditorContext, rawEl: Et.HTMLRawEditElement, data: string, start: number,
    ) => {
      ctx.commandManager.push(cmd.functional({
        meta: {
          el: rawEl,
          _data: data,
          _start: start,
          isFirstRun: true,
          _tailCmd: tailCmd,
        },
        merge(nextCmd) {
          // 通过 isFirstRun 属性来判断是输入法命令
          if (nextCmd.meta && nextCmd.meta.isFirstRun !== void 0) {
            // fixed. 输入法事件的每个 data, 都是最新的输入法组合串, 直接覆盖即可
            // 对于 Firefox, 其输入法输入过程中, 选区是 collapsed 的 (这一点不同于chrome 和 Safari)
            // 即 start === end, 位于输入法组合串的末尾, 因此要保留第一个命令的 start 位置
            this.meta._data = nextCmd.meta._data
            return true
          }
          return false
        },
        execCallback() {
          // 输入法输入无法阻止, 因此命令第一次执行时什么都不做, 只在撤回重做时处理
          if (this.meta.isFirstRun) {
            this.meta.isFirstRun = false
            this.meta._tailCmd?.exec(ctx)
            return
          }
          const { el, _data, _start, _tailCmd } = this.meta
          el.focus()
          el.setRangeText(_data, _start, _start, 'end')
          _tailCmd?.exec(ctx)
        },
        undoCallback() {
          const { el, _data, _start, _tailCmd } = this.meta
          el.focus()
          el.setRangeText('', _start, _start + _data.length, 'end')
          _tailCmd?.undo(ctx)
        },
        // 禁用初始光标, 防止撤回时代码块失去焦点
        srcCaretRange: null,
      }))
    }

export const insertCompositionTextInRawEl = createEffectHandle('InsertCompositionTextInRawEl', (ctx, {
  rawEl, data, tailCmd,
}) => {
  solveInsertCompositionTextInRawEl(tailCmd, ctx, rawEl, data, rawEl.selectionStart)
  return true
})
export const insertTextInRawEl = createEffectHandle('InsertTextInRawEl', (ctx, {
  rawEl, data, offset, focus = true, tailCmd,
}) => {
  if (!data) {
    return false
  }
  if (data === '\n') {
    ctx.commandManager.commitNextHandle(true)
  }
  ctx.commandManager.push(cmd.functional({
    meta: {
      el: rawEl,
      _data: data,
      _offset: offset,
      _focus: focus,
      _tailCmd: tailCmd,
    },
    merge(nextCmd) {
      if (this.meta.el !== nextCmd.meta?.el
        || !nextCmd.meta._data
        || this.meta._offset + this.meta._data.length !== nextCmd.meta._offset
      ) {
        return false
      }
      this.meta._data += nextCmd.meta._data
      return true
    },
    execCallback(_ctx) {
      const { el, _data, _offset, _focus, _tailCmd } = this.meta
      if (_focus) {
        el.focus()
      }
      el.setRangeText(_data, _offset, _offset, _focus ? 'end' : void 0)
      _tailCmd?.exec(_ctx)
    },
    undoCallback(_ctx) {
      const { el, _data, _offset, _focus, _tailCmd } = this.meta
      if (_focus) {
        el.focus()
      }
      el.setRangeText('', _offset, _offset + _data.length, _focus ? 'end' : void 0)
      _tailCmd?.undo(_ctx)
    },
    // 撤回时不要改变光标位置
    srcCaretRange: null,
  }))
  return true
})
export const deleteInRawEl = createEffectHandle('DeleteInRawEl', function (ctx, {
  rawEl, isBackward, deleteType, focus = true,
}) {
  const start = rawEl.selectionStart, end = rawEl.selectionEnd
  if (start !== end) {
    return this.DeleteTextInRawEl(ctx, { rawEl, start, end, selectMode: focus ? 'end' : void 0 })
  }
  if ((isBackward && start === 0) || (!isBackward && end === rawEl.value.length)) {
    return true
  }
  const value = rawEl.value

  if (deleteType === 'word') {
    if (isBackward) {
      // value可能是一个很大的文本, 我们只截取一小部分进行 word 判断
      let deleteWord: string | undefined = value.slice(Math.max(0, start - 50), start)
      deleteWord = ctx.segmenter.precedingWord(deleteWord, deleteWord.length)
      if (deleteWord) {
        const tmp = deleteWord.split('\n')
        if (tmp[tmp.length - 1]) {
          deleteWord = tmp[tmp.length - 1] as string
        }
        else {
          // \n分割末项为空, 说明末尾是一个换行符, 则仅删除换行符
          deleteWord = '\n'
        }
        return this.DeleteTextInRawEl(ctx, {
          rawEl,
          start: start - deleteWord.length,
          end,
          selectMode: focus ? 'end' : void 0,
        })
      }
    }
    else {
      let deleteWord: string | undefined = value.slice(end, end + 50)
      deleteWord = ctx.segmenter.followingWord(deleteWord, 0)
      if (deleteWord) {
        const tmp = deleteWord.split('\n')
        if (tmp[0]) {
          deleteWord = tmp[0]
        }
        else {
          deleteWord = '\n'
        }
        return this.DeleteTextInRawEl(ctx, {
          rawEl,
          start,
          end: end + deleteWord.length,
          selectMode: focus ? 'start' : void 0,
        })
      }
    }
  }
  else if (deleteType === 'line') {
    if (isBackward) {
      if (value[start - 1] === '\n') {
        return this.DeleteTextInRawEl(ctx, { rawEl, start: start - 1, end, selectMode: focus ? 'end' : void 0 })
      }
      for (let i = start - 2; i >= 0; i--) {
        if (value[i] === '\n') {
          return this.DeleteTextInRawEl(ctx, { rawEl, start: i + 1, end, selectMode: focus ? 'end' : void 0 })
        }
      }
      return this.DeleteTextInRawEl(ctx, { rawEl, start: 0, end, selectMode: focus ? 'end' : void 0 })
    }
    else {
      if (value[end] === '\n') {
        return this.DeleteTextInRawEl(ctx, { rawEl, start, end: end + 1, selectMode: focus ? 'start' : void 0 })
      }
      for (let i = end + 1; i < value.length; i++) {
        if (value[i] === '\n') {
          return this.DeleteTextInRawEl(ctx, { rawEl, start, end: i, selectMode: focus ? 'start' : void 0 })
        }
      }
      return this.DeleteTextInRawEl(ctx, { rawEl, start, end: value.length, selectMode: focus ? 'start' : void 0 })
    }
  }
  return isBackward
    ? this.DeleteTextInRawEl(ctx, { rawEl, start: start - 1, end, selectMode: focus ? 'end' : void 0 })
    : this.DeleteTextInRawEl(ctx, { rawEl, start, end: end + 1, selectMode: focus ? 'start' : void 0 })
})
export const deleteTextInRawEl = createEffectHandle('DeleteTextInRawEl', (ctx, {
  rawEl, start, end, selectMode, tailCmd,
}) => {
  if (start === end) {
    return false
  }
  const data = rawEl.value.slice(start, end)
  ctx.commandManager.push(cmd.functional({
    meta: {
      el: rawEl,
      _offset: start,
      _data: data,
      _selectMode: selectMode,
      _tailCmd: tailCmd,
    },
    merge(nextCmd) {
      if (this.meta.el !== nextCmd.meta?.el || !nextCmd.meta._data) {
        return false
      }
      // backspace
      if (this.meta._offset === nextCmd.meta._offset + nextCmd.meta._data.length) {
        this.meta._data = nextCmd.meta._data + this.meta._data
        this.meta._offset = nextCmd.meta._offset
        return true
      }
      // delete
      if (this.meta._offset === nextCmd.meta._offset) {
        this.meta._data += nextCmd.meta._data
        return true
      }
      return false
    },
    execCallback(_ctx) {
      const { el, _offset, _data, _selectMode, _tailCmd } = this.meta
      if (_selectMode) {
        el.focus()
      }
      el.setRangeText('', _offset, _offset + _data.length, _selectMode)
      _tailCmd?.exec(_ctx)
    },
    undoCallback(_ctx) {
      const { el, _offset, _data, _selectMode, _tailCmd } = this.meta
      if (_selectMode) {
        el.focus()
      }
      el.setRangeText(_data, _offset, _offset, _selectMode)
      _tailCmd?.undo(_ctx)
    },
    // 撤回时不要改变光标位置
    srcCaretRange: null,
  }))
  return true
})
export const replaceTextInRawEl = createEffectHandle('ReplaceTextInRawEl', (ctx, {
  rawEl, start, end, data, focus = true, tailCmd,
}) => {
  if (!data && start === end) {
    return false
  }
  ctx.commandManager.push(cmd.functional({
    meta: {
      el: rawEl,
      _data: data,
      _start: start,
      _end: end,
      _focus: focus ? 'end' : void 0 as SelectionMode | undefined,
      _tailCmd: tailCmd,
    },
    execCallback(_ctx) {
      const { el, _data, _start, _end, _focus, _tailCmd } = this.meta
      this.meta._end = _start + _data.length
      this.meta._data = el.value.slice(_start, _end)
      if (_focus) {
        el.focus()
      }
      el.setRangeText(_data, _start, _end, _focus ? 'end' : 'preserve')
      _tailCmd?.exec(_ctx)
    },
    undoCallback(_ctx) {
      const { el, _data, _start, _end, _focus, _tailCmd } = this.meta
      this.meta._end = _start + _data.length
      this.meta._data = el.value.slice(_start, _end)
      if (_focus) {
        el.focus()
      }
      el.setRangeText(_data, _start, _end, _focus ? 'select' : 'preserve')
      _tailCmd?.undo(_ctx)
    },
    // 撤回时不要改变光标位置
    srcCaretRange: null,
  }))
  return true
})
