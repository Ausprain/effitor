import type { Et } from '../@types'
import { getBeforeinputListener } from '../effector/beforeinput'
import { getCopyListener, getCutListener, getPasteListener } from '../effector/clipboard'
import {
  getCompositionEnd,
  getCompositionStart,
  getCompositionUpdate,
} from '../effector/composition'
import { getInputListener } from '../effector/input'
import { getKeydownCaptureListener, getKeydownListener } from '../effector/keydown'
import { getKeyupListener } from '../effector/keyup'
import {
  getClickListener,
  getDblClickListener,
  getDragEndListener,
  getDragEnterListener,
  getDragLeaveListener,
  // getDragListener,
  getDragOverListener,
  getDragStartListener,
  getDropListener,
  getMouseDownListener,
  getMouseUpListener,
} from '../effector/mouse'
import { getSelectionChangeListener } from '../effector/selchange'
import { dom } from '../utils'
import type { PluginConfigs } from './Effitor'

export const initListeners = (
  ctx: Et.EditorContext, mainEffector: Et.MainEffector, pluginEffector: PluginConfigs,
) => ({
  // ): { [k in keyof Et.HTMLElementEventMap]?: (ev: Et.HTMLElementEventMap[k]) => void } => ({

  beforekeydown: getKeydownCaptureListener(ctx as Et.UpdatedContext, pluginEffector.beforeKeydownSolver),
  keydown: getKeydownListener(ctx as Et.UpdatedContext, mainEffector.keydownSolver, pluginEffector.keydownSolver),
  keyup: getKeyupListener(ctx, mainEffector.keyupSolver, pluginEffector.keyupSolver),
  beforeinput: getBeforeinputListener(ctx, mainEffector.beforeInputSolver, pluginEffector.beforeInputSolver),
  input: getInputListener(ctx, mainEffector.afterInputSolver, pluginEffector.afterInputSolver), // ? GlobalEventHandlersEventMap为什么input事件对象是Event而非InputEvent
  compositionstart: getCompositionStart(ctx),
  compositionupdate: getCompositionUpdate(ctx),
  compositionend: getCompositionEnd(ctx),

  copy: getCopyListener(ctx, pluginEffector.copyCutCallback),
  cut: getCutListener(ctx, pluginEffector.copyCutCallback),
  paste: getPasteListener(ctx, pluginEffector.pasteCallback),

  mousedown: getMouseDownListener(ctx, pluginEffector.mousedownCallback),
  mouseup: getMouseUpListener(ctx, pluginEffector.mouseupCallback),
  click: getClickListener(ctx, pluginEffector.clickCallback),
  dblclick: getDblClickListener(ctx, pluginEffector.dblclickCallback),
  dragstart: getDragStartListener(ctx, pluginEffector.dragstartCallback),
  // drag: getDragListener(ctx),
  dragend: getDragEndListener(ctx, pluginEffector.dragendCallback),
  dragenter: getDragEnterListener(ctx, pluginEffector.dragenterCallback),
  dragover: getDragOverListener(ctx, pluginEffector.dragoverCallback),
  dragleave: getDragLeaveListener(ctx, pluginEffector.dragleaveCallback),
  drop: getDropListener(ctx, pluginEffector.dropCallback),

  selectionchange: getSelectionChangeListener(ctx, pluginEffector.selChangeCallback),

  focusin: (ev: FocusEvent) => pluginEffector.focusinCallback?.(ev, ctx),
  focusout: (ev: FocusEvent) => pluginEffector.focusoutCallback?.(ev, ctx),
})
export const addListenersToEditorBody = (
  // root: Et.ShadowRoot,
  body: Et.EtBodyElement,
  ac: AbortController,
  ctx: Et.EditorContext,
  listeners: ReturnType<typeof initListeners>,
  htmlEventSolver?: Et.HTMLEventSolver,
) => {
  // 先为插件绑定其他监听器, 这样通过e.stopImmediatePropagation()可以阻止effitor相关事件的默认行为触发
  if (htmlEventSolver) {
    for (const [name, fn] of Object.entries(htmlEventSolver)) {
      // @ts-expect-error name 是一个 string, 无法准确提取出 e 的类型
      body.addEventListener(name, e => fn(e, ctx), { signal: ac.signal })
    }
  }

  // 绑在shadowRoot上
  body.addEventListener('focusin', (ev) => {
    // import.meta.env.DEV && console.error('body focus', ev.target, ev.relatedTarget)
    // body无段落, 清空并初始化
    if (body.childElementCount === 0) {
      ctx.editor.initBody(void 0, false)
    }
    else if (dom.isRawEditElement(ev.target as Node) && !ctx.selIsolated) {
      ctx.selection.setInRaw(ev.target as Et.HTMLRawEditElement)
      ctx.forceUpdate()
    }
    // 仅当焦点从编辑区外部移入时, 才执行相应逻辑; 因为编辑区内嵌套 contenteditable之间切换时也会触发 focusin/out
    if (!ev.relatedTarget || !ctx.body.isNodeInBody(ev.relatedTarget as Node)) {
      // @ts-expect-error, deliberate, internal api
      ctx.editor._markFocused()
      // fixed. HMR热更新时 旧的selection对象可能丢失
      // fixed. focus瞬间 还未获取光标位置(Selection对象未更新), 使用requestAnimationFrame延迟更新上下文
      // fixed. requestAnimationFrame 和 setTimeout(0) 都太快，Selection 对象依旧未更新，
      // 这取决于 focus 瞬间 浏览器事件循环的进度
      setTimeout(() => {
        if (!ctx.editor.isFocused) {
          // 编辑器又立马失去焦点, 直接返回
          return
        }
        // 手动更新上下文和选区, 再绑定sel监听器
        ctx.update()
        // fixed. 延迟绑定selectionchange监听器，避免间接再次调用 ctx.update
        requestAnimationFrame(() => {
          document.addEventListener('selectionchange', listeners.selectionchange, { signal: ac.signal })
        })
        listeners.focusin(ev)
      }, 10)
    }
  }, { signal: ac.signal })
  body.addEventListener('focusout', (ev) => {
    // import.meta.env.DEV && console.error('body blur', ev.target, ev.relatedTarget)

    if (dom.isRawEditElement(ev.target as Node) && !ctx.selIsolated) {
      ctx.selection.setInRaw(null)
    }
    // 当编辑区失去焦点, 且焦点并非落入编辑区内的嵌套 contenteditable 内时
    // 即焦点转移到编辑区(et-body)外 时
    if (!ev.relatedTarget || !ctx.body.isNodeInBody(ev.relatedTarget as Node)) {
      // @ts-expect-error, deliberate, internal api
      ctx.editor._markBlurred()
      setTimeout(() => {
        if (ctx.editor.isFocused) {
          // fixed. 编辑器又马上重新获得了焦点, 直接返回
          // 在命令 discard 时经常发生, 即光标在某个命令新插入的节点中, 而执行 discard 时,
          // 新插入的节点被撤销移除, 其中的光标也随之移出, 还未来得及设置新光标位置, 就触发了 focusout事件
          return
        }
        // 编辑器失去焦点时, 结束命令事务
        listeners.focusout(ev)
        // 解绑selectionchange
        document.removeEventListener('selectionchange', listeners.selectionchange)
        // 清理上下文
        if (import.meta.env.DEV) {
          return
        }
        // @ts-expect-error, deliberate, internal api
        ctx._blurCallback()
      }, 10)
    }
  }, { signal: ac.signal })

  body.addEventListener('keydown', listeners.beforekeydown, { signal: ac.signal, capture: true })
  body.addEventListener('keydown', listeners.keydown, { signal: ac.signal })
  body.addEventListener('keyup', listeners.keyup, { signal: ac.signal })
  // *wran. shadow dom内不会捕获isTrusted=true 的 inputType='insertFromDrop' 的 beforeinput事件
  body.addEventListener('beforeinput', listeners.beforeinput, { signal: ac.signal })
  body.addEventListener('input', listeners.input, { signal: ac.signal })

  body.addEventListener('compositionstart', listeners.compositionstart, { signal: ac.signal })
  body.addEventListener('compositionupdate', listeners.compositionupdate, { signal: ac.signal })
  body.addEventListener('compositionend', listeners.compositionend, { signal: ac.signal })

  body.addEventListener('copy', listeners.copy, { signal: ac.signal })
  body.addEventListener('cut', listeners.cut, { signal: ac.signal })
  body.addEventListener('paste', listeners.paste, { signal: ac.signal })

  body.addEventListener('mousedown', listeners.mousedown, { signal: ac.signal })
  body.addEventListener('mouseup', listeners.mouseup, { signal: ac.signal })
  body.addEventListener('click', listeners.click, { signal: ac.signal })
  body.addEventListener('dblclick', listeners.dblclick, { signal: ac.signal })

  body.addEventListener('dragstart', listeners.dragstart, { signal: ac.signal })
  // body.addEventListener('drag', listeners.drag, { signal: ac.signal })
  body.addEventListener('dragend', listeners.dragend, { signal: ac.signal })
  body.addEventListener('dragenter', listeners.dragenter, { signal: ac.signal })
  body.addEventListener('dragover', listeners.dragover, { signal: ac.signal })
  body.addEventListener('dragleave', listeners.dragleave, { signal: ac.signal })
  body.addEventListener('drop', listeners.drop, { signal: ac.signal })

  // // 媒体查询
  // const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  // ctx.editor.setColorScheme(darkModeMediaQuery.matches)
  // darkModeMediaQuery.onchange = (ev) => {
  //   ctx.editor.setColorScheme(ev.matches)
  // }
}
