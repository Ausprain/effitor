import type { Et } from '../@types'
import { dom } from '../utils'
import { EtSelection, selectSoftLine } from './EtSelection'

export class EtSelectionIsolated extends EtSelection {
  public override readonly isolated: boolean = true
  /**
   * 下一个更新目标选区；通过 selectRange 设置
   */
  private _nextRange: Et.Range | null = null
  /**
   * 借用Selection对象时的选区范围
   */
  private _selRange: Range | null = null

  /**
   * 借用Selection对象时，隔离的EtSelection对象不需要Selection对象来更新选区，但目前一些功能，
   * 如光标上移一行等，需要借助sel对象的modify方法实现，因此需借用Selection对象来实现
   * @param range 借用初始化范围
   */
  private _borrowSel(range: Et.Range | null = null) {
    const sel = this.selection
    if (!range || !sel) {
      return false
    }
    if (sel.rangeCount) {
      this._selRange = sel.getRangeAt(0)
    }
    sel.removeAllRanges()
    sel.addRange(range)
    if (!sel.rangeCount) {
      this._returnSel()
      return false
    }
    return sel
  }

  /**
   * 归还sel对象，并恢复原本选区位置
   */
  private _returnSel() {
    if (this._selRange && this.selection) {
      this.selection.removeAllRanges()
      this.selection.addRange(this._selRange)
      this._selRange = null
    }
  }

  /**
   * isolate时，选区始终为前向选择的
   */
  override get isForward() {
    return true
  }

  override _update(): boolean {
    if (!this._nextRange) {
      // 若无下一个选区，则不更新，若当前无选区，则返回false（更新失败）
      return !!this._range
    }
    this.updateSelCtx(this._nextRange)
    this._nextRange = null
    return true
  }

  override selectRange(range: Range): boolean {
    if (!this._body.isNodeInBody(range.commonAncestorContainer)) {
      this._nextRange = null
      return false
    }
    this._nextRange = range as Et.Range
    // 手动触发一个selchange事件，模拟Selection.addRange 函数的‘副作用’
    this._ctx.forceUpdate()
    return true
  }

  override collapse(toStart = true, reveal = true): boolean {
    if (this._rawEl) {
      return this._collapseInRawEl(this._rawEl, toStart)
    }
    if (this._collapsed) {
      return true
    }
    if (!this._range) {
      return false
    }
    const r = document.createRange()
    if (toStart) {
      r.setStart(this._range.startContainer, this._range.startOffset)
    }
    else {
      r.setStart(this._range.endContainer, this._range.endOffset)
    }
    this._ctx.forceUpdate()
    if (reveal) {
      this.scrollIntoView()
    }
    return true
  }

  override collapseTo(node: Et.Node, offset: number): void {
    if (!this._body.isNodeInBody(node)) {
      return
    }
    const r = document.createRange()
    r.setStart(node, Math.min(dom.nodeLength(node), offset))
    this.selectRange(r)
  }

  override modify(
    alter: ModifyAlter, direction: ModifyDirection, granularity: ModifyGranularity, reveal = true,
  ) {
    const sel = this._borrowSel(this._range)
    if (sel) {
      sel.modify(alter, direction, granularity)
      this.selectRange(sel.getRangeAt(0))
      this._returnSel()
    }
    if (reveal) {
      this.scrollIntoView(['backward', 'left'].includes(direction))
    }
    return true
  }

  override modifyMulti(actions: Parameters<Selection['modify']>[]) {
    const sel = this._borrowSel(this._range)
    if (!sel) {
      return false
    }
    for (const action of actions) {
      sel.modify(...action)
    }
    if (sel.rangeCount) {
      this.selectRange(sel.getRangeAt(0))
    }
    this._returnSel()
    return true
  }

  override selectSoftLine(): boolean {
    if (this._rawEl) {
      return this._selectSoftLineInRawEl(this._rawEl)
    }
    const sel = this._borrowSel(this._range)
    if (!sel) {
      return false
    }
    selectSoftLine(sel)
    if (sel.rangeCount) {
      this.selectRange(sel.getRangeAt(0))
    }
    this._returnSel()
    return false
  }
}
