import type { Et } from '@effitor/core'
import { dom, traversal } from '@effitor/core'
import { CssClassEnum, HtmlCharEnum } from '@effitor/shared'

import { CodeEnum } from './config'
import type { EtCodeHighlighter } from './highlighter'

export interface CodeContextOptions<L extends string = string> {
  value?: string
  lang: L
  tabSize: number
  highlighter: EtCodeHighlighter<L>
}
export class CodeContext<L extends string = string> {
  //  html结构:
  //    div.wrapper <scroll>
  //      div.container
  //        pre
  //          code
  //            span.line
  //            span.line
  //            ...
  //        textarea
  public readonly wrapper: HTMLDivElement
  private readonly _container: HTMLDivElement
  public readonly area: HTMLTextAreaElement
  public readonly pre: HTMLPreElement
  private readonly _lineWrapper: HTMLElement
  private __lang: L
  private __tab = ''
  private readonly _highlighter: EtCodeHighlighter<L>

  constructor({ value = '', lang, tabSize = 4, highlighter }: CodeContextOptions<L>) {
    this.__lang = lang
    this.__tab = ' '.repeat(tabSize)
    this._highlighter = highlighter
    this.area = document.createElement('textarea')
    this.area.name = 'codearea'
    this.area.autocomplete = 'off'
    this.area.autocapitalize = 'off'
    this.area.spellcheck = false
    this.area.setAttribute('autocorrect', 'off')
    this.pre = document.createElement('pre')
    // this._lineWrapper = this.pre
    this._lineWrapper = document.createElement('code')
    this.wrapper = dom.el('div', `${CodeEnum.Class_Wrapper} ${CssClassEnum.TransitionColorScheme}`)
    this._container = dom.el('div', CodeEnum.Class_Container)
    this._container.appendChild(this.pre)
    this._container.appendChild(this.area)
    this.wrapper.appendChild(this._container)
    this.pre.appendChild(this._lineWrapper)
    highlighter.onInit?.(this.wrapper, lang)
    this.area.value = value
    this.disable()
  }

  get code() {
    return this.area.value
  }

  get lineCount() {
    return this._lineWrapper.childElementCount
  }

  get precedingChar() {
    return this.area.value[this.area.selectionStart - 1] || ''
  }

  get followingChar() {
    return this.area.value[this.area.selectionStart] || ''
  }

  /**
   * 渲染(高亮), 并挂载代码块到指定元素
   * @param el 挂载元素
   * @param async 是否异步渲染, 默认为 false
   */
  mount(el: HTMLElement, async: boolean) {
    el.appendChild(this.wrapper)
    if (!async) {
      this.render()
      this.enable()
      return
    }
    el.classList.add(CodeEnum.Class_Loading)
    this.renderByLine().then(() => {
      this.enable()
      el.classList.remove(CodeEnum.Class_Loading)
    })
  }

  /**
   * 启用代码编辑
   */
  enable() {
    this.area.disabled = false
  }

  /**
   * 禁用代码编辑
   */
  disable() {
    this.area.disabled = true
  }

  focus(toStart = true) {
    this.area.focus()
    if (toStart) {
      this.area.setSelectionRange(0, 0)
    }
    else {
      this.area.setSelectionRange(this.area.value.length, this.area.value.length)
    }
  }

  get lang() {
    return this.__lang
  }

  setLang(value: L) {
    if (this.__lang === value || !this._highlighter.langs.includes(value)) {
      return
    }
    this.__lang = value
  }

  supportsLang(lang: L) {
    return this._highlighter.langs.includes(lang)
  }

  get tab() {
    return this.__tab
  }

  get tabSize() {
    return this.__tab.length
  }

  setTabSize(value: number) {
    const oldTabSize = this.tabSize
    if (value < 0 || value === oldTabSize) {
      return
    }
    this.__tab = ' '.repeat(value)
    const lines = this.area.value.split('\n')
    this.area.value = lines.map((line) => {
      let j = 0
      while (j < line.length && line[j] === ' ') {
        j++
      }
      return ' '.repeat(Math.floor(j / oldTabSize) * value + j % oldTabSize % value) + line.slice(j)
    }).join('\n')
    this.updateIndent(0, lines.length - 1)
  }

  /**
   * 更新代码行缩进; 我们不重新渲染, 而是直接更新代码行 DOM 节点的第一个文本节点的前缀空格
   * @param startLine 开始行索引
   * @param endLine 结束行索引
   */
  updateIndent(startLine: number, endLine: number) {
    const lines = this.area.value.split('\n')
    for (let i = startLine; i <= endLine; i++) {
      const lineCode = lines[i]
      let j = 0
      while (j < lineCode.length && lineCode[j] === ' ') {
        j++
      }
      const indent = lineCode.slice(0, j)
      // 找第一个#text节点, 令其前缀等于indent
      const lineEl = this._lineWrapper.childNodes.item(i)
      let lineFirstText = lineEl?.firstChild as Text | null
      while (lineFirstText && lineFirstText.nodeType !== 3 /** Node.TEXT_NODE */) {
        lineFirstText = lineFirstText.firstChild as Text | null
      }
      if (!lineFirstText || lineFirstText.nodeType !== 3 /** Node.TEXT_NODE */) {
        if (import.meta.env.DEV) {
          throw new Error(`updateIndent: 第${i}代码行不存在!!这不应该发生`)
        }
        return
      }
      const data = lineFirstText.data
      j = 0
      while (j < data.length && data[j] === ' ') {
        j++
      }
      lineFirstText.data = indent + data.slice(j)
    }
  }

  /**
   * 将代码文本转换为代码块内部格式, 如将'\t'转为对应空格
   */
  toCodeText(data: string) {
    return data.replaceAll('\t', this.__tab).replaceAll(HtmlCharEnum.ZERO_WIDTH_SPACE, '')
  }

  /**
   * 获取指定偏移量所在的行索引
   * @param offset 偏移量
   * @returns 行索引
   */
  getLineIndexByOffset(offset: number) {
    const lines = this.area.value.split('\n')
    let row = 0
    for (const line of lines) {
      if (offset <= line.length) {
        return row
      }
      offset -= line.length + 1
      row++
    }
    return lines.length - 1
  }

  /**
   * 获取行的代码 (包含换行符)
   * @param index 行索引
   * @returns 行的代码
   */
  getLineCode(index: number) {
    const lines = this.area.value.split('\n')
    if (index < lines.length) {
      return index === lines.length - 1 ? lines[index] : lines[index] + '\n'
    }
    return ''
  }

  /**
   * 获取行的缩进空格数
   * @param index 行索引
   * @returns 缩进空格数
   */
  getLineIndent(index: number) {
    const lineCode = this.getLineCode(index)
    let j = 0
    while (j < lineCode.length && lineCode[j] === ' ') {
      j++
    }
    return j
  }

  /**
   * 获取行的偏移量 (前闭后开), slice 包含末尾换行符
   * @param index 行索引
   * @returns 行的偏移量范围 [start, end)
   */
  getLineOffset(index: number): [number, number] {
    const lines = this.area.value.split('\n')
    if (index >= lines.length) {
      return [this.area.value.length - lines[lines.length - 1].length, this.area.value.length]
    }
    let offset = 0
    for (let i = 0; i < index; i++) {
      offset += lines[i].length + 1
    }
    return [offset, offset + lines[index].length + 1] // 这里会超出value 长度
  }

  /**
   * 获取当前选区范围选中的代码行索引
   * @returns 选中行索引范围 [起始行, 结束行]
   */
  selectedLineIndices() {
    const { selectionStart, selectionEnd } = this.area
    const selectedText = this.area.value.slice(selectionStart, selectionEnd)
    const startLine = this.getLineIndexByOffset(selectionStart)
    const endLine = selectedText.includes('\n') ? startLine + selectedText.split('\n').length - 1 : startLine
    return [startLine, endLine]
  }

  /**
   * 更新(重新渲染)代码行
   * @param index 行索引
   */
  updateCodeLine(index: number) {
    const code = this.getLineCode(index)
    const codeLines = this._highlighter.codeToLines(code, this.__lang)
    if (codeLines.length) {
      const el = this._lineWrapper.childNodes.item(index) as HTMLElement
      if (el) {
        // 保留行原有装饰信息
        codeLines[0].className = el.className
        codeLines[0].style = el.style.cssText
        el.replaceWith(codeLines[0])
      }
      else {
        this._lineWrapper.appendChild(codeLines[0])
      }
    }
  }

  /**
   * 删除代码行
   * @param index 开始行索引
   * @param delCount 删除行数
   */
  removeCodeLines(index: number, delCount: number) {
    if (delCount < 0) {
      this._lineWrapper.textContent = ''
      return
    }
    const lineNodes = this._lineWrapper.childNodes
    while (delCount--) {
      lineNodes.item(index)?.remove()
    }
  }

  /**
   * 渲染代码行
   * @param index 开始行索引
   * @param count 渲染行数
   */
  renderCodeLines(index: number, count = 1) {
    let code
    if (count <= 0) {
      code = this.area.value
    }
    else if (count === 1) {
      code = this.getLineCode(index)
    }
    else {
      const lines = this.area.value.split('\n')
      code = lines[index]
      for (let i = 0; i < count - 1 && index + i + 1 < lines.length; i++) {
        code += '\n' + lines[index + i + 1]
      }
    }
    const codeLines = this._highlighter.codeToLines(code, this.__lang)
    if (count === 1 && codeLines.length) {
      this._lineWrapper.insertBefore(codeLines[0], this._lineWrapper.childNodes.item(index))
      return
    }
    const df = document.createDocumentFragment()
    for (const lineEl of codeLines) {
      df.appendChild(lineEl)
    }
    this._lineWrapper.insertBefore(df, this._lineWrapper.childNodes.item(index))
  }

  spliceCodeLines(index: number, delCount: number, addCount: number) {
    this.removeCodeLines(index, delCount)
    this.renderCodeLines(index, addCount)
  }

  /**
   * 渲染代码块(重新渲染所有代码行)
   */
  render() {
    this.removeCodeLines(0, -1)
    this.renderCodeLines(0, -1)
  }

  async renderByLine() {
    this.removeCodeLines(0, -1)
    this._container.dataset.code = this.code
    const lineCount = this.code.split('\n').length
    for (let i = 0; i < lineCount; i++) {
      // await new Promise<void>(res => setTimeout(() => res(), 1000))
      await Promise.resolve()
      this.updateCodeLine(i)
    }
    this._container.removeAttribute('data-code')
  }

  shiftLine(index: number, shiftTo: number) {
    const { selectionStart, selectionEnd } = this.area
    const [insertStart, insertEnd] = this.getLineOffset(shiftTo)
    const [delStart, delEnd] = this.getLineOffset(index)
    let lineCode = this.code.slice(delStart, delEnd)
    const delLen = delEnd - delStart

    // 由于代码最后一行若带换行符, 则代码块(textarea)最后一行实际上为空行
    // 因此移动代码行时, 需要考虑最后一行为空行的情况, 并处理换行符倒置问题
    // 同时使用 setRangeText 更新 textarea 内容时, 应先更改后边的, 再更改
    // 前面的, 避免重新计算偏移量

    if (index < shiftTo) {
      if (!this.code.slice(insertStart, insertEnd).endsWith('\n') && lineCode[lineCode.length - 1] === '\n') {
        // 移动到最后一行, 换行符倒置
        lineCode = '\n' + lineCode.slice(0, -1)
      }
      this.area.setRangeText(lineCode, insertEnd, insertEnd)
      this.area.setRangeText('', delStart, delEnd)
      this.area.setSelectionRange(selectionStart - delLen, selectionEnd - delLen)
    }
    else {
      if (!lineCode || lineCode[lineCode.length - 1] !== '\n') {
        // 末行移动, 无换行符, 需要向新末尾行借一个换行符
        lineCode += '\n'
        this.area.setRangeText('', delStart - 1, delEnd - 1)
      }
      else {
        this.area.setRangeText('', delStart, delEnd)
      }
      this.area.setRangeText(lineCode, insertStart, insertStart)
      this.area.setSelectionRange(selectionStart + delLen, selectionEnd + delLen)
    }
    const el = this._lineWrapper.childNodes.item(index) as HTMLElement
    if (el) {
      el.remove()
    }
    this._lineWrapper.insertBefore(el, this._lineWrapper.childNodes.item(shiftTo))
  }

  /**
   * 必要时滚动代码块容器, 让光标选区可见
   * @param toStart 如果选区为 Range, 是否保证选区开始位置可见, undefined 时使用选区方向判断
   * @param padding 滚动padding, 一个 0-1 的数值, 表示滚动后光标位置到代码块左/上边缘与代码块宽/高的比值;
   *                undefined 时, 使用固定边距 20px
   */
  scrollIntoView(ctx: Et.EditorContext, toStart?: boolean, padding?: number) {
    const { selectionStart, selectionEnd, selectionDirection } = this.area
    toStart = toStart ?? selectionDirection === 'backward'
    const caretOffset = toStart ? selectionStart : selectionEnd
    const pos = traversal.textPositionOf(this.pre, caretOffset)
    if (!pos) {
      return
    }
    const r = document.createRange()
    r.setStart(pos.container, pos.offset)

    const scrollToCaretRect = () => {
      let rect = r.getClientRects()[0] as DOMRect | undefined
      if (!rect) {
        // 光标处无文本, 无法获取矩形框; 获取对应行的矩形框, 并压缩宽度代替
        const lineEl = this._lineWrapper.childNodes.item(this.getLineIndexByOffset(caretOffset)) as HTMLElement
        rect = lineEl?.getBoundingClientRect()
        if (!rect) {
          return false
        }
        rect = {
          x: rect.x,
          y: rect.y,
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.left + 1,
          height: rect.height,
          width: 1,
        } as DOMRect
      }
      return ctx.body.scrollIntoView(rect, {
        toStart,
        paddingX: padding,
        paddingY: padding,
        scrollBehavior: 'smooth',
        scrollContainer: this.wrapper,
      })
    }

    const unscrolled = scrollToCaretRect()
    // wrapper 不在视口内, 将其滚动到视口内, 再将代码行滚动到视口内
    if (unscrolled) {
      this.wrapper.parentElement?.scrollIntoView({
        block: unscrolled === 1 ? 'end' : 'start',
      })
      // 使用异步, 等待 selection 滚动完毕后, 再次滚动代码容器, 以获取新的 Range矩形框
      setTimeout(() => {
        scrollToCaretRect()
      }, 20)
    }
  }

  clonePre() {
    const pre = this.pre.cloneNode(true) as HTMLPreElement
    pre.className = this.wrapper.className
    pre.classList.remove(CodeEnum.Class_Wrapper)
    pre.style.cssText = this.wrapper.style.cssText
    pre.style.display = 'block'
    pre.style.width = '100%'
    pre.style.overflow = 'auto'
    return pre
  }

  codeHTML() {
    return this.clonePre().outerHTML
  }

  async copy(ctx: Et.EditorContext) {
    if (!this.area.value) {
      return
    }
    const item = new ClipboardItem({
      'text/plain': this.area.value,
      'text/html': this.codeHTML(),
    })
    return navigator.clipboard.write([item]).then(() => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore to solve `error TS2339: Property 'msg' does not exist on type 'EditorAssists'.` on bundle
      ctx.assists.msg?.success('复制成功')
    }).catch(() => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      ctx.assists.msg?.error('复制失败')
    })
  }
}
