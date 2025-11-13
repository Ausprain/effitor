import type { Et } from '../@types'
import { solveKeydownArrow } from './keydownArrow'

export type MainKeyboardSolver = {
  [K in keyof Et.KeyboardKeySolver]: (ev: KeyboardEvent, ctx: Et.UpdatedContext) => void
}

const keydownKeySolver: MainKeyboardSolver = {
  // 在样式节点内按下 tab, 跳出样式节点, 否则插入制表符
  Tab: (ev, ctx) => {
    if (ev.ctrlKey || ev.altKey) return
    if (ctx.selection.rawEl) {
      return ctx.body.dispatchInputEvent('beforeinput', {
        inputType: ev.shiftKey ? 'formatOutdent' : 'formatIndent',
      })
    }
    if (!ctx.selection.isCollapsed) {
      ctx.selection.collapse(false)
      return
    }
    const tr = ctx.selection.getTargetRange()
    if (!tr) {
      return
    }
    if (tr.collapsed) {
      return ctx.getEtHandler(tr.startEtElement).tabout?.(ctx, tr.toTargetCaret())
    }
    ctx.selection.collapse(false, true)
  },
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class MainKeydownKeySolver implements Et.KeyboardKeySolver {
  [k: string]: Et.KeyboardAction
}
Object.assign(MainKeydownKeySolver.prototype, keydownKeySolver)

/**
 * 运行效应器 keyboardSolver
 * @returns 是否执行了默认行为, ctx 未更新或ctx.defaultSkipped为 true, 则返回 false
 */
export const runKeyboardSolver = (
  ev: Et.KeyboardEvent, ctx: Et.UpdatedContext,
  main: Et.KeyboardKeySolver, solver?: Et.KeyboardSolver,
) => {
  const key = ev.key.length === 1 ? ev.key.toUpperCase() : ev.key

  let fn
  if (solver) {
    fn = solver[ctx.commonEtElement.localName as keyof Et.DefinedEtElementMap]
      || solver[key as keyof typeof solver] || solver.default
    if (typeof fn === 'function') {
      // @ts-expect-error 效应元素独占 solver 的 ctx 的 commonEtElement就是该效应元素类型
      fn(ev, ctx)
    }
  }
  // ctx标记skipDefault跳过默认effector
  if (ctx.defaultSkipped) return false

  // mainKeydownSolver需要在其他效应器后执行, 因为会dispatch beforeinput事件；
  // 如果先执行, 就会先执行beforeinput再执行其他keydownSolver
  fn = main[key as keyof typeof main] || main.default
  if (typeof fn === 'function') {
    fn(ev, ctx)
  }
  return true
}

/**
 * 不同系统/浏览器平台的输入事件的顺序和行为不一:
 * 1. Windows 下 Chromium 和 MacOS 下 Firefox 可以使用 key = 'Process'
 *    来判断当前 keydown 是否为输入法输入
 * 2. MacOS 下 Safari 的输入法事件先于 keydown 事件触发
 *
 * 正常情况下编辑器只注册一个 keydown 监听器, 执行顺序:
 *
 * 0. 判断是否为输入法输入, 是则直接返回;
 *    光标是否在input/textarea 内, 是则直接执行 4 并返回
 * 1. 普通输入行为: ev.key.length==1 且无除`shift`外的修饰键; 此项放在前面时为了
 *    性能, 因为普通输入占编辑器输入的绝大多数场景
 * 2. 监听内置系统级按键行为; hotkeyManager.listenBuiltin; 有些系统级别的约定俗成
 *    的行为不应再走插件, 如 `opt+ArrowLeft` 光标左移一个单词等
 * 3. 监听快捷键绑定; hotkeyManager.listenBinding 在 listenBuiltin 失败之后,
 *    插件 keydownSovler 之前执行; 快捷键也不应走插件, 如 撤销/重做 等.
 * 4. 插件 keydownSovler;
 * 5. MainKeydownSolver, 作为插件兜底, 禁用 `ctrl+r` 刷新 等"灾难性"的浏览器默认行为
 * 6. 默认按键行为: hotkeyManager.listenDefault; 此项应放插件之后, 若插件未处理,
 *    才启用 default 行为; 如按下 Backspace 触发 `deleteContentBackward` 等.
 *
 */
export const getKeydownCaptureListener = (
  ctx: Et.EditorContext, solver?: Et.KeyboardSolver,
) => {
  return (ev: Et.KeyboardEvent) => {
    // 没有effectElement 或没有选区 阻止后续输入
    if (!ctx.isUpdated()) {
      if (import.meta.env.DEV) {
        console.error('keydown error: no effectelement', ctx)
      }
      ev.preventDefault()
      ev.stopPropagation()
      ev.stopImmediatePropagation()
      // 强制编辑器失去焦点
      ctx.editor.blur()
      return
    }

    // fixed. chromium存在输入法会话结束后并未触发compositionend事件的情况, 因此需要
    // 在此重新赋值, 避免ctx.inCompositionSession未能在输入法结束后赋值为false
    if ((ctx.composition.setInSession(ev.isComposing))) {
      ev.preventDefault()
      ev.stopPropagation()
      ev.stopImmediatePropagation()
      return
    }

    // Windows 下 Chrome 在开启输入法输入时, .key为Process
    // MacOS 下 Safari 的输入法事件先于 keydown 事件触发, 通过nextKeydownSkipped判断跳过
    if (ctx.nextKeydownSkipped || ev.key === 'Process') {
    // TODO 此处可去掉 'Process' 判断, 以实现多平台一致的输入法行为
    //    如果此处为 Process 跳过了, 那么后续的  keyboardWritableKeyToImeChar(ev.key)
    //    输入法标点符号映射将不奏效, 也就造成了多平台不一致的输入法行为
      ev.preventDefault()
      ev.stopPropagation()
      ev.stopImmediatePropagation()
      return
    }

    // 设置按键组合
    if (!ev.repeat) {
      ctx.hotkeyManager.setModkey(ev)
    }

    if (solver) {
      const key = ev.key.length === 1 ? ev.key.toUpperCase() : ev.key
      // 效应元素独占效应器
      const fn = solver[ctx.commonEtElement.localName as keyof Et.DefinedEtElementMap]
        || solver[key as keyof typeof solver] || solver.default
      if (typeof fn === 'function' && fn(
        ev,
        // @ts-expect-error 效应元素独占 solver 的 ctx 的 commonEtElement就是该效应元素类型
        ctx,
      )) {
        ev.preventDefault()
        ev.stopPropagation()
        ev.stopImmediatePropagation()
        // 消耗掉 defaultSkipped, 避免插件在 beforekeydown 中调用了 skipDefault, preventAndSkipDefault 等
        // 影响下一次事件; 因为在 beforekeydown 中没有没有默认行为
        return (ctx.defaultSkipped, void 0)
      }
    }
  }
}
export const getKeydownListener = (
  ctx: Et.UpdatedContext, main: MainKeydownKeySolver, solver?: Et.KeyboardSolver,
) => {
  return (ev: Et.KeyboardEvent) => {
    // 判断方向键
    if (ev.code[0] === 'A' && ev.code[4] === 'w') {
      if (solveKeydownArrow(ctx)) {
        ev.preventDefault()
        ev.stopPropagation()
        ev.stopImmediatePropagation()
        return
      }
    }

    // MacOS 下非 Safari, 通过延迟1帧, 等待 compositionstart 激活来判断是否输入法输入
    requestAnimationFrame(() => {
      if (ctx.composition.inSession) {
        return
      }

      // 1. 处理普通输入, 并兼顾 MacOS 下输入法输入标点符号的情况
      if (ev.key.length === 1 && !ev.ctrlKey && !ev.altKey && !ev.metaKey) {
        // 监听热字符串
        if (ev.key === ctx.hotstringManager.trigger && ctx.hotstringManager.listen(ev.key)) {
          return
        }

        let data: string | undefined
        if (ctx.composition.isUsingIME) {
          data = ctx.composition.getImeChar(ev.key)
          // 无对应ime 字符, 重置 ctx.composition.isUsingIME 为false
          if (!data) {
            data = ev.key
            ctx.composition.setUsingIME(false)
          }
        }
        else {
          data = ev.key
        }
        ctx.body.dispatchInputEvent('beforeinput', {
          data,
          inputType: 'insertText',
        })
        return
      }

      // 2. 监听内置系统级按键行为
      // ctx.hotkeyManager.setModkey(ev)
      if (ctx.hotkeyManager.listenBuiltin()) {
        return
      }

      // 3. 监听绑定的快捷键 (快捷键不可 repeat触发)
      if (!ev.repeat) {
        if (ctx.hotkeyManager.listenBinding()) {
          return
        }
      }

      // 4. 插件 keydownSovler; 5. MainKeydownSolver
      if (runKeyboardSolver(ev, ctx, main, solver)) {
        // 5. 若插件未 skipDefault, 则执行默认行为
        ctx.hotkeyManager.listenDefault()
      }
    })

    ev.stopPropagation()
    // 禁用(除复制/剪切/粘贴外)所有原生默认行为 (必须同步执行才有效)
    if (!ctx.keepDefaultModkeyMap[ctx.hotkeyManager.modkey]) {
      ev.preventDefault()
    }

    // 设置当前按下的按键, 用于在下一个 keydown 中判断是否连续按下相同的按键
    ctx.currDownKey = ev.key
    // 若光标为Range, 设为null, 并在keyup中跳过
    if (!ctx.selection.isCollapsed) {
      ctx.prevUpKey = null
    }
  }
}
