import type { Et } from '@effitor/core'
import { CssClassEnum } from '@effitor/shared'

const enum DialogEnum {
  Class_Backdrop = 'et-dialog__backdrop',
  Class_Container = 'et-dialog__container',
  Class_Show = 'et-dialog--show',
}

export interface DialogRender<T> {
  /** dialog渲染函数, 该函数需要返回一个 promise, fullfilled 时才会显示 dialog
   * @param container dialog容器
   * @param resolve open函数返回的promise的resolve函数, 调用时会关闭dialog并让编辑器聚焦, 同时恢复光标位置
   *        执行顺序是:
   *        ```ts
   *        open() -> render() -> [SHOW]
   *        -> [resolve -> open().then() -> close()]
   *        -> [close() -> reject -> open().catch()]
   *        ```
   */
  (container: HTMLDivElement, resolve: (value: T) => void): Promise<void>
}

const defaultOptions = {
  /**
   * 是否模态对话框，现阶段都是模态的
   */
  modal: true as const,
  /**
   * // TODO
   * 遮罩层定位, 目前仅支持 fixed;\
   * absolute定位时, 需要判断当前编辑器所在滚动容器; 而不可仅仅根据编辑器定位, 否则随内容增长,
   * 编辑器高度增加, 遮罩层的高度也会增加, 从而导致 container 的位置下移, 最终可能在视口外显示;
   * 若根据滚动容器来计算, 则增加开销, 且滚动容器带margin 的话, 遮罩层外围会有一圈白, 很丑.
   * 因此现阶段, dialog 是全屏(视口)遮罩的, 即当前的 dialog 就是个 modal
   */
  backdropPosition: 'fixed' as 'fixed' | 'absolute',
  /** 遮罩层背景, 当设置为 false 时, 背景遮罩为透明; 设置为 true 时, 使用 css 变量 `--et-color-bg__backdrop` 设置遮罩背景颜色 */
  backdropBackground: true,
  /** 容器初始样式 */
  containerStyle: {} as Partial<CSSStyleDeclaration>,
}
export type DialogAssistOptions = Partial<typeof defaultOptions>
export class DialogManager {
  private _options: Required<DialogAssistOptions>
  private _dialog!: {
    readonly backdrop: HTMLDivElement
    readonly container: HTMLDivElement
  }

  private globalKeydownListener: (ev: KeyboardEvent) => void
  /**
   * open函数返回一个 promise，该 promise 的 reject 回调会赋值给该变量；
   * 若 dialog 关闭时没有 fullfilled，则会调用此 reject
   */
  private _reject?: () => void

  constructor(private _ctx: Et.EditorContext, options?: DialogAssistOptions) {
    this._options = {
      ...defaultOptions,
      ...options ? Object.fromEntries(Object.entries(options).filter(([_, v]) => v !== undefined)) : void 0,
    }
    this.globalKeydownListener = (ev) => {
      if (ev.key === 'Escape') {
        this.close()
      }
      // 禁止一切修饰性按键（放行复制/剪切/粘贴）
      if ((ev.ctrlKey || ev.altKey || ev.metaKey) && !['x', 'c', 'v'].includes(ev.key)) {
        ev.preventDefault()
      }
    }
    this.__init()
  }

  private __init() {
    const backdrop = document.createElement('div')
    backdrop.classList.add(DialogEnum.Class_Backdrop, CssClassEnum.TransitionColorScheme)
    const container = document.createElement('div')
    // backdrop.style.position = this._options.backdropPosition
    if (!this._options.backdropBackground) {
      backdrop.style.backgroundColor = 'transparent'
    }
    Object.assign(container.style, this._options.containerStyle)
    container.classList.add(DialogEnum.Class_Container, CssClassEnum.Card)
    backdrop.appendChild(container)
    backdrop.onclick = () => this.close()
    container.addEventListener('click', e => e.stopPropagation())
    this._ctx.root.appendChild(backdrop)
    this._dialog = {
      backdrop,
      container,
    }
  }

  private __checkInitialized() {
    if (!this._dialog || !this._dialog.backdrop.isConnected || !this._dialog.container.isConnected) {
      this._dialog.backdrop.remove()
      this._dialog.container.remove()
      this.__init()
    }
  }

  private __open() {
    this._dialog.backdrop.classList.add(DialogEnum.Class_Show)
    document.addEventListener('keydown', this.globalKeydownListener, true)
  }

  private __close() {
    if (this._reject) {
      this._reject()
      this._reject = void 0
    }
    this._dialog.container.textContent = ''
    document.removeEventListener('keydown', this.globalKeydownListener, true)
  }

  /**
   * 打开dialog
   * @param render dialog渲染函数, 第一个参数为 dialog 容器, 第二个参数为该方法返回的 promise 的 resolve 函数
   * @returns 返回一个 promise, resolve 的值为 render 函数第二个参数调用时传入的值;
   *          当 dialog 不是通过resolve 关闭的, 则该 promise 会被 reject, 并返回 undefined
   */
  open<T>(render: DialogRender<T>): Promise<T> {
    this._ctx.editor.blur()
    return new Promise<T>((resolve, reject) => {
      this._reject = reject
      this.__checkInitialized()
      render(this._dialog.container, (value) => {
        resolve(value)
        this._reject = void 0
        this.close()
      }).then(() => {
        this.__open()
      })
    })
  }

  close() {
    this._ctx.editor.focus()
    this.__close()
    this._dialog?.backdrop.classList.remove(DialogEnum.Class_Show)
  }
}
