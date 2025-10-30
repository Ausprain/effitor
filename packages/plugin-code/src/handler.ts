import { cmd, type Et } from '@effitor/core'

import { CodeContext } from './CodeContext'
import { Brackets } from './config'
import type { EtCodeElement } from './EtCodeElement'

export const codeHandler: Et.EffectHandlerWith<EtCodeElement, EtCodeElement> = {
  InsertCompositionTextInRawEl(ctx, { rawEl, data }) {
    const codeCtx = ctx.commonEtElement.codeCtx
    if (rawEl !== codeCtx.area) {
      return false
    }
    const row = codeCtx.getLineIndexByOffset(rawEl.selectionStart)
    const tailCmd = cmd.functional({
      meta: {
        _cc: codeCtx,
        _row: row,
      },
      execCallback() {
        // 此时(beforeinput事件内)输入法尚未插入文本, 延迟渲染
        setTimeout(() => {
          this.meta._cc.updateCodeLine(this.meta._row)
        }, 0)
      },
      undoCallback(_ctx) {
        this.execCallback(_ctx)
      },
    })
    return this.superHandler.InsertCompositionTextInRawEl(ctx, {
      rawEl,
      data,
      tailCmd,
    })
  },
  InsertTextInRawEl(ctx, { rawEl, data, offset, focus }) {
    const codeCtx = ctx.commonEtElement.codeCtx
    data = codeCtx.toCodeText(data)
    if (!data || rawEl !== codeCtx.area) {
      return false
    }
    const row = codeCtx.getLineIndexByOffset(offset)
    const addCount = data.split('\n').length
    const insertNewLine = data === '\n' && (
      rawEl.selectionEnd === rawEl.value.length
      || rawEl.value[rawEl.selectionEnd] === '\n'
    )
    // 插入换行, 对齐缩进
    if (data === '\n') {
      let indent = codeCtx.getLineIndent(row)
      if (focus === false) {
        // 不带 focus, 说明是下面回调中插入的换行符, 缩进需要减一层
        indent = Math.max(0, indent - codeCtx.tabSize)
      }
      data += ' '.repeat(indent)
      // 括号后插入换行, 增加一层缩进
      const precedingChar = codeCtx.precedingChar
      if (precedingChar in Brackets) {
        data += codeCtx.tab
        if (codeCtx.followingChar === Brackets[precedingChar]) {
          ctx.commandManager.pushHandleCallback(() => {
            this.InsertTextInRawEl(ctx, {
              rawEl, data: '\n', offset: rawEl.selectionStart, focus: false,
            })
            ctx.commandManager.handle()
          })
        }
      }
    }
    else if (data.length === 1) {
      // 插入左括号, 自动添加右括号
      if (data in Brackets) {
        ctx.commandManager.pushHandleCallback(() => {
          this.InsertTextInRawEl(ctx, {
            rawEl, data: Brackets[data], offset: rawEl.selectionStart, focus: false,
          })
          ctx.commandManager.handle()
        })
      }
      // 插入右括号, 且与 followingChar 匹配, 则光标后移一位
      else if (Object.values(Brackets).includes(data) && codeCtx.followingChar === data) {
        rawEl.setSelectionRange(rawEl.selectionEnd + 1, rawEl.selectionEnd + 1)
        return true
      }
    }
    // 插入内容含换行符, 需要记录一次撤回栈事务; 否则导致命令合并, tailCmd丢失从而无法及时更新渲染
    if (addCount > 1) {
      ctx.commandManager.commitNextHandle(true)
    }
    const tailCmd = addCount === 1
      ? cmd.functional({
          meta: {
            _cc: codeCtx,
            _row: row,
          },
          execCallback() {
            this.meta._cc.updateCodeLine(this.meta._row)
          },
          undoCallback() {
            this.meta._cc.updateCodeLine(this.meta._row)
          },
        })
      : cmd.functional({
          meta: {
            _cc: codeCtx,
            _row: row,
            _addCount: addCount,
            _insertNewLine: insertNewLine,
          },
          execCallback() {
            if (this.meta._insertNewLine) {
              this.meta._cc.renderCodeLines(this.meta._row + 1, 1)
            }
            else {
              this.meta._cc.spliceCodeLines(this.meta._row, 1, this.meta._addCount)
            }
          },
          undoCallback() {
            if (this.meta._insertNewLine) {
              this.meta._cc.removeCodeLines(this.meta._row + 1, 1)
            }
            else {
              this.meta._cc.spliceCodeLines(this.meta._row, this.meta._addCount, 1)
            }
          },
        })
    return this.superHandler.InsertTextInRawEl(ctx, {
      rawEl,
      data,
      offset,
      focus,
      tailCmd,
    })
  },
  DeleteInRawEl(ctx, payload) {
    const codeCtx = ctx.commonEtElement.codeCtx
    const { rawEl, isBackward, deleteType, focus } = payload
    if (rawEl !== codeCtx.area) {
      return false
    }
    if (rawEl.selectionStart === rawEl.selectionEnd) {
    // 行开头对齐 tab 删除
      if (isBackward) {
        let e = rawEl.selectionEnd, indentChars = ''
        while (e > 0 && rawEl.value[e - 1] === ' ') {
          indentChars += ' '
          e--
        }
        if (indentChars.length && (e === 0 || rawEl.value[e - 1] === '\n')) {
          const delLen = indentChars.length % codeCtx.tabSize || codeCtx.tabSize
          ctx.commandManager.commitNextHandle(true)
          return this.DeleteTextInRawEl(ctx, {
            rawEl,
            start: rawEl.selectionEnd - delLen,
            end: rawEl.selectionEnd,
            selectMode: 'end',
          })
        }
      }
      // 删除左括号, 连带删除右括号
      const precedingChar = codeCtx.precedingChar
      if (precedingChar in Brackets && Brackets[precedingChar] === codeCtx.followingChar) {
        ctx.commandManager.commitNextHandle(true)
        return this.DeleteTextInRawEl(ctx, {
          rawEl,
          start: rawEl.selectionStart - 1,
          end: rawEl.selectionEnd + 1,
          selectMode: 'end',
        })
      }
    }
    // 重新绑定this, 让DeleteInRawEl内部调用当前 this 的 DeleteTextInRawEl
    return this.superHandler.DeleteInRawEl.call(this, ctx, {
      rawEl,
      isBackward,
      deleteType,
      focus,
    })
  },
  DeleteTextInRawEl(ctx, payload) {
    const codeCtx = ctx.commonEtElement.codeCtx
    const { rawEl, start, end } = payload
    if (rawEl !== codeCtx.area) {
      return false
    }
    const row = codeCtx.getLineIndexByOffset(start)
    const delText = rawEl.value.slice(start, end)
    let delCount = 1
    for (const char of delText) {
      if (char === '\n') {
        delCount++
      }
    }
    if (delCount > 1) {
      ctx.commandManager.commitNextHandle(true)
    }
    const tailCmd = delCount === 1
      ? cmd.functional({
          meta: {
            _cc: codeCtx,
            _row: row,
          },
          execCallback() {
            this.meta._cc.updateCodeLine(this.meta._row)
          },
          undoCallback() {
            this.meta._cc.updateCodeLine(this.meta._row)
          },
        })
      : cmd.functional({
          meta: {
            _cc: codeCtx,
            _row: row,
            _delCount: delCount,
          },
          execCallback() {
            this.meta._cc.spliceCodeLines(this.meta._row, this.meta._delCount, 1)
          },
          undoCallback() {
            this.meta._cc.spliceCodeLines(this.meta._row, 1, this.meta._delCount)
          },
        })
    return this.superHandler.DeleteTextInRawEl(ctx, {
      ...payload,
      tailCmd,
    }) && ctx.commandManager.handle()
  },
  ReplaceTextInRawEl(ctx, payload) {
    const codeCtx = ctx.commonEtElement.codeCtx
    const { rawEl, start, end, data } = payload
    if (rawEl !== codeCtx.area) {
      return false
    }
    const delText = rawEl.value.slice(start, end)
    const delCount = delText.split('\n').length
    const addCount = data.split('\n').length
    const row = codeCtx.getLineIndexByOffset(start)
    const tailCmd = delCount === 1 && addCount === 1
      ? cmd.functional({
          meta: {
            _cc: codeCtx,
            _row: row,
          },
          execCallback() {
            this.meta._cc.updateCodeLine(this.meta._row)
          },
          undoCallback() {
            this.meta._cc.updateCodeLine(this.meta._row)
          },
        })
      : cmd.functional({
          meta: {
            _cc: codeCtx,
            _row: row,
            _addCount: addCount,
            _delCount: delCount,
          },
          execCallback() {
            this.meta._cc.spliceCodeLines(this.meta._row, this.meta._delCount, this.meta._addCount)
          },
          undoCallback() {
            this.meta._cc.spliceCodeLines(this.meta._row, this.meta._addCount, this.meta._delCount)
          },
        })
    ctx.commandManager.commitNextHandle(true)
    return this.superHandler.ReplaceTextInRawEl(ctx, {
      ...payload,
      tailCmd,
    }) && ctx.commandManager.handle()
  },
  FormatIndentInRawEl(ctx, { rawEl, start, end }) {
    const value = rawEl.value
    const cc = ctx.commonEtElement.codeCtx
    const tabSize = cc.tabSize
    const selectedLines = value.slice(start, end).split('\n')
    if (selectedLines.length === 1) {
      if (start !== end) {
        return this.ReplaceTextInRawEl(ctx, {
          rawEl, start, end, data: ' '.repeat(tabSize),
        })
      }
      let lineStart = start
      while (lineStart > 0 && value[lineStart - 1] !== '\n') {
        lineStart--
      }
      const indent = value.slice(lineStart, start)
      // at line start
      if (indent.trim().length === 0) {
        return this.ReplaceTextInRawEl(ctx, {
          rawEl, start, end, data: ' '.repeat(tabSize - (indent.length % tabSize)),
        })
      }
      return this.InsertTextInRawEl(ctx, {
        rawEl, offset: start, data: ' '.repeat(tabSize),
      })
    }
    else {
      const startLine = ctx.commonEtElement.codeCtx.getLineIndexByOffset(start)
      const endLine = startLine + selectedLines.length - 1
      const lines = value.split('\n')
      const [startOffset] = cc.getLineOffset(startLine)
      let endOffset = startOffset
      let code = '', startBias = -1
      for (let i = startLine; i <= endLine; i++) {
        const line = lines[i]
        let j = 0
        while (j < line.length && line[j] === ' ') {
          j++
        }
        code += ' '.repeat(tabSize - (j % tabSize))
        if (startBias === -1) {
          startBias = code.length
        }
        if (i !== endLine) {
          endOffset += line.length + 1
          code += line + '\n'
        }
      }
      ctx.commandManager.commitNextHandle(true)
      return ctx.commandManager.push(cmd.functional({
        meta: {
          _cc: cc,
          _startLine: startLine,
          _endLine: endLine,
          _code: code,
          _start: startOffset,
          _end: endOffset,
          _startBias: startBias,
        },
        execCallback() {
          const { _cc, _startLine, _endLine, _code, _start, _end, _startBias } = this.meta
          this.meta._code = _cc.area.value.slice(_start, _end)
          this.meta._end = _start + _code.length
          const selectStart = _cc.area.selectionStart
          _cc.area.setRangeText(_code, _start, _end)
          // 保持选区位置
          _cc.area.setSelectionRange(selectStart + _startBias, _cc.area.selectionEnd)
          _cc.updateIndent(_startLine, _endLine)
        },
        undoCallback() {
          const { _cc, _startLine, _endLine, _code, _start, _end, _startBias } = this.meta
          this.meta._code = _cc.area.value.slice(_start, _end)
          this.meta._end = _start + _code.length
          const { selectionStart, selectionEnd } = _cc.area
          _cc.area.setRangeText(_code, _start, _end)
          _cc.area.setSelectionRange(selectionStart - _startBias, selectionEnd - (_end - _start - _code.length))
          _cc.updateIndent(_startLine, _endLine)
        },
        // 禁用初始光标, 防止撤回时代码块失去焦点
        srcCaretRange: null,
      })).handle()
    }
  },
  FormatOutdentInRawEl(ctx, { rawEl, start, end }) {
    const value = rawEl.value
    const cc = ctx.commonEtElement.codeCtx
    const tabSize = cc.tabSize
    const selectedLines = value.slice(start, end).split('\n')
    const startLine = ctx.commonEtElement.codeCtx.getLineIndexByOffset(start)
    const endLine = startLine + selectedLines.length - 1
    const lines = value.split('\n')
    const [startOffset] = cc.getLineOffset(startLine)
    let endOffset = startOffset
    let code = '', startBias = -1
    for (let i = startLine; i <= endLine; i++) {
      const line = lines[i]
      let j = 0
      while (j < line.length && line[j] === ' ') {
        j++
      }
      code += ' '.repeat(Math.max(0, j - (j % tabSize || tabSize))) + line.slice(j) + '\n'
      if (startBias === -1) {
        startBias = line.length + 1 - code.length
      }
      endOffset += line.length + 1
    }
    ctx.commandManager.commitNextHandle(true)
    return ctx.commandManager.push(cmd.functional({
      meta: {
        _cc: cc,
        _startLine: startLine,
        _endLine: endLine,
        _code: code,
        _start: startOffset,
        _end: endOffset,
        _startBias: startBias,
      },
      execCallback() {
        const { _cc, _startLine, _endLine, _code, _start, _end, _startBias } = this.meta
        this.meta._code = _cc.area.value.slice(_start, _end)
        this.meta._end = _start + _code.length
        const { selectionStart, selectionEnd } = _cc.area
        _cc.area.setRangeText(_code, _start, _end)
        // 保持选区位置
        _cc.area.setSelectionRange(selectionStart - _startBias, selectionEnd - (_end - _start - _code.length))
        _cc.updateIndent(_startLine, _endLine)
      },
      undoCallback() {
        const { _cc, _startLine, _endLine, _code, _start, _end, _startBias } = this.meta
        this.meta._code = _cc.area.value.slice(_start, _end)
        this.meta._end = _start + _code.length
        const { selectionStart, selectionEnd } = _cc.area
        _cc.area.setRangeText(_code, _start, _end)
        // 保持选区位置
        _cc.area.setSelectionRange(selectionStart + _startBias, selectionEnd - (_end - _start - _code.length))
        _cc.updateIndent(_startLine, _endLine)
      },
      // 禁用初始光标, 防止撤回时代码块失去焦点
      srcCaretRange: null,
    })).handle()
  },

  insertNewLineInCode(ctx, { codeCtx }) {
    const { selectionStart, selectionEnd, selectionDirection } = codeCtx.area
    const anchorOffset = selectionDirection === 'backward' ? selectionStart : selectionEnd
    const lineIndex = codeCtx.getLineIndexByOffset(anchorOffset)
    const lineIndent = codeCtx.getLineIndent(lineIndex)
    const [_, lineEnd] = codeCtx.getLineOffset(lineIndex)
    const data = '\n' + ' '.repeat(lineIndent)
    this.InsertTextInRawEl(ctx, {
      rawEl: codeCtx.area as Et.HTMLRawEditElement,
      offset: lineEnd - 1,
      data,
    })
    ctx.commandManager.commitNextHandle()
    return ctx.commandManager.handle()
  },
  codeLinesUp(ctx, { codeCtx }) {
    const [startLine, endLine] = codeCtx.selectedLineIndices()
    if (startLine === 0) {
      return
    }
    return lineShift(ctx, codeCtx, startLine - 1, endLine)
  },
  codeLinesDown(ctx, { codeCtx }) {
    const [startLine, endLine] = codeCtx.selectedLineIndices()
    if (endLine === codeCtx.lineCount - 1) {
      return
    }
    return lineShift(ctx, codeCtx, endLine + 1, startLine)
  },
}

const lineShift = (ctx: Et.EditorContext, cc: CodeContext, index: number, shiftTo: number) => {
  ctx.commandManager.commitNextHandle(true)
  ctx.commandManager.push(cmd.functional({
    meta: {
      _cc: cc,
      _index: index,
      _shiftTo: shiftTo,
    },
    execCallback() {
      const { _cc, _index, _shiftTo } = this.meta
      _cc.shiftLine(_index, _shiftTo)
    },
    undoCallback() {
      const { _cc, _index, _shiftTo } = this.meta
      _cc.shiftLine(_shiftTo, _index)
    },
    srcCaretRange: null,
  }))
  return ctx.commandManager.handle()
}
