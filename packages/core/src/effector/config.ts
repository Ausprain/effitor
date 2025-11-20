/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Et } from '../@types'
import type { EditorContext, UpdatedContext } from '../context'
import type { EditorCallbacks } from '../editor'
import type { DefinedEtElementMap } from '../element'
import type { MainBeforeInputTypeSolver } from './beforeinput'
import type { IEctx } from './ectx'
import type { MainAfterInputTypeSolver } from './input'
import type { MainKeydownKeySolver } from './keydown'
import type { MainKeyupKeySolver } from './keyup'

/**
 * 内联效应器 \
 * 除onMounted和onBeforeUnmount外, 其中所有执行器(函数)必须是箭头函数,
 * 且不可引用模块`import`对象以及任何函数作用域外的变量/函数\
 * 如需引用其他变量, 需使用 `useEffectorContext` 或 `withEffectorContext` 为其添加上下文
 * @rel [`ectx`](./ectx.ts)
 */
export interface EffectorSupportInline<Ex extends IEctx<string, object> = any>
  extends Effector<Ex>
{
  readonly inline: true
}
/** 效应器, 响应用户操作, 执行对应Handler */
export interface Effector<Ex extends IEctx<string, object> = any>
  extends Partial<Solvers<Ex> & Hooks>
{
  /** 用于标识该effector是否支持inline, 仅用于ts提示, 无特别作用 */
  readonly inline?: boolean
  /**
   * 强制将该effector注册次序提前or后移 \
   * 若多个插件effector标识了该属性, 则排在插件列表前的pre靠前, 排在插件列表后的post靠后 \
   * TODO 暂时post依旧放在默认effector之前, 即无论pre还是post, 插件的effector始终在主effector前执行
   */
  readonly enforce?: 'pre' | 'post'
}

type HookKeysInEditorCallback = keyof {
  [k in keyof EditorCallbacks as k extends `on${string}` ? k : never]: never
}
export interface Hooks extends Pick<EditorCallbacks, HookKeysInEditorCallback> {
  /**
   * 编辑器mount一个div时执行
   * * 对于支持内联的effector, 该方法不必遵守内联规则, 因其始终不会被内联
   * @param signal 与编辑器相关的事件监听器的终止监听信号, 所有与编辑器相关的事件监听器都应在此回调内绑定 并绑定该sinal
   */
  readonly onMounted: (ctx: EditorContext, signal: AbortSignal) => void
  /**
   * 卸载一个div前执行
   * * 对于支持内联的effector, 该方法不必遵守内联规则, 因其始终不会被内联
   */
  readonly onBeforeUnmount: (ctx: EditorContext) => void
}
export interface Solvers<Ex extends IEctx<string, object>> {
  /**
   * keydown.capture中处理按键响应, 类似 keydownSolver; 但能捕获所有按键, 并可通过
   * `ev.stopImmediatePropagation` 阻止后续 keydown 事件的传播 (keydownSolver, MainKeydownKeySolver)
   * * 若按键处理函数返回 true, 则会同时禁止(传播\冒泡\默认行为)
   * * 如非必要, 不建议使用此solver, 此 solver 处理太多逻辑会影响性能, 降低编辑流畅性
   * * 此外, 由于撤回记录在此 solver 中进行, 若某个效应元素在此 solver 内注册了 `效应元素特有效应器处理函数`
   * 且返回 true, 则需自行处理撤回记录, 否则可能导致很长一段操作才记录一次撤回
   */
  readonly beforeKeydownSolver: KeyboardSolver<Ex>
  /**
   * keydown中处理按键响应 ev.key -> action;
   * * 若 ev.key长度为1 或为方向键, 则此 solver 捕获不到, 需使用 beforeKeydownSolver
   * * 当配置了`default`时, key 匹配失败将会使用 default, 但`效应元素特有效应器处理函数`除外
   * * 键名可用效应元素名(DefinedEtElementMap中定义的), 类似`default`, 光标或选区在效应元素
   *   (`ctx.commonEtElement`)内触发相应事件时, 会用该效应元素小写标签名从 Solver 里获取处理函数,
   *   若存在且返回 true, 便不再访问该 solver, 可以理解为, 使用效应元素名定义的 sovler 处理函数会
   *   独占该效应元素内的行为
   */
  readonly keydownSolver: KeyboardSolver<Ex>
  /**
   * keyup中处理按键响应
   * * 当配置了`default`时, key 匹配失败将会使用 default, 但`效应元素特有效应器处理函数`除外
   * * 键名可用效应元素名(DefinedEtElementMap中定义的), 类似`default`, 光标或选区在效应元素
   *   (`ctx.commonEtElement`)内触发相应事件时, 会用该效应元素小写标签名从 Solver 里获取处理函数,
   *   若存在且返回 true, 便不再访问该 solver, 可以理解为, 使用效应元素名定义的 sovler 处理函数会
   *   独占该效应元素内的行为
   */
  readonly keyupSolver: KeyboardSolver<Ex>
  /**
   * beforeinput中处理inputType
   * * 当配置了`default`时, key 匹配失败将会使用 default, 但`效应元素特有效应器处理函数`除外
   * * 键名可用效应元素名(DefinedEtElementMap中定义的), 类似`default`, 光标或选区在效应元素
   *   (`ctx.commonEtElement`)内触发相应事件时, 会用该效应元素小写标签名从 Solver 里获取处理函数,
   *   若存在且返回 true, 便不再访问该 solver, 可以理解为, 使用效应元素名定义的 sovler 处理函数会
   *   独占该效应元素内的行为
   */
  readonly beforeInputSolver: InputSolver<Ex>
  /**
   * input中处理inputType
   * * 当配置了`default`时, key 匹配失败将会使用 default, 但`效应元素特有效应器处理函数`除外
   * * 键名可用效应元素名(DefinedEtElementMap中定义的), 类似`default`, 光标或选区在效应元素
   *   (`ctx.commonEtElement`)内触发相应事件时, 会用该效应元素小写标签名从 Solver 里获取处理函数,
   *   若存在且返回 true, 便不再访问该 solver, 可以理解为, 使用效应元素名定义的 sovler 处理函数会
   *   独占该效应元素内的行为
   * * [NB] 撤销/重做通过内置插件实现, 注册`效应元素特有效应器处理函数`时, 需手动放行 historyUndo/
   *   historyRedo (返回 false), 否则在该效应元素内无法通过快捷键撤回/重做
   *
   */
  readonly afterInputSolver: InputSolver<Ex>
  /**
   * 其他html事件监听器; 在这些监听器中, 通过 `ev.stopImmediatePropagation`
   * 来阻止Effitor的相同事件行为, 而不是`ctx.preventAndSkipDefault(ev)`
   */
  readonly htmlEventSolver: HTMLEventSolver<Ex>
  /** 复制或剪切时添加数据到clipboardData */
  readonly copyCutCallback: ClipboardAction<Ex>
  /**
   * 粘贴回调,
   */
  readonly pasteCallback: ClipboardAction<Ex>
  /**
   * selectionchange回调
   *  `document`的`selectionchange`事件监听器由编辑器focus时创建, blur时移除;
   *  effector的 selChangeCallback 回调统一在该监听器内执行
   */
  readonly selChangeCallback: SelChangeAction<Ex>
  /** 编辑器focus后调用, 这不是立即调用的, 它们会在编辑器focus且更新上下文和选区后调用 */
  readonly focusinCallback: FocusEventAction<Ex>
  /** 编辑器失去焦点时立即调用 (解绑selectionchange事件之前以及相关效应元素 focusoutCallback 前) */
  readonly focusoutCallback: FocusEventAction<Ex>

  readonly mousedownCallback: MouseEventAction<Ex>
  readonly mouseupCallback: MouseEventAction<Ex>
  readonly clickCallback: MouseEventAction<Ex>
  readonly dblclickCallback: MouseEventAction<Ex>

  readonly dragstartCallback: DragEventAction<Ex>
  readonly dragendCallback: DragEventAction<Ex>
  readonly dragenterCallback: DragEventAction<Ex>
  readonly dragoverCallback: DragEventAction<Ex>
  readonly dragleaveCallback: DragEventAction<Ex>
  readonly dropCallback: DragEventAction<Ex>
}
export type Solver = KeyboardSolver | InputSolver | HTMLEventSolver
/** 主效应器 */
export interface MainEffector {
  readonly keydownSolver: MainKeydownKeySolver
  readonly keyupSolver: MainKeyupKeySolver
  readonly beforeInputSolver: MainBeforeInputTypeSolver
  readonly afterInputSolver: MainAfterInputTypeSolver
}

/**
 * keydown/keyup中处理按键响应 ev.key -> action \
 * action中不可引用外部变量, 若需引用, 则应使用 useEffectorContext 或 withEffectorContext 为其添加上下文
 */
export type KeyboardKeySolver<Ex extends IEctx<string, object> = IEctx<string, object>>
  = Partial<Record<Et.KeyboardKey, KeyboardAction<Ex>>> & {
  /** 默认响应, 即当ev.key未声明在solver中时, 执行该响应 */
    default?: KeyboardAction<Ex>
  }
/**
 * beforeinput/input事件中的处理相关输入, ev.inputType -> action \
 * action中不可引用外部变量, 若需引用, 则应使用 useEffectorContext 或 withEffectorContext 为其添加上下文
 */
export type InputTypeSolver<Ex extends IEctx<string, object> = IEctx<string, object>>
  = Partial<Record<Exclude<Et.InputType, 'undefined'>, InputAction<Ex>>> & {
    default?: InputAction<Ex>
  }

export type KeyboardSolverInEtElement<Ex extends IEctx<string, object> = IEctx<string, object>> = {
  [k in keyof DefinedEtElementMap]?: KeyboardAction<Ex, UpdatedContext & {
    commonEtElement: DefinedEtElementMap[k]
  }>
}
export type InputTypeSolverInEtElement<Ex extends IEctx<string, object> = IEctx<string, object>> = {
  [k in keyof DefinedEtElementMap]?: InputAction<Ex, UpdatedContext & {
    commonEtElement: DefinedEtElementMap[k]
  }>
}

export type KeyboardSolver<Ex extends IEctx<string, object> = IEctx<string, object>>
  = KeyboardKeySolver<Ex> & KeyboardSolverInEtElement<Ex>
export type InputSolver<Ex extends IEctx<string, object> = IEctx<string, object>>
  = InputTypeSolver<Ex> & InputTypeSolverInEtElement<Ex>

/**
 * 主inputType映射器
 */
export type MainInputTypeSolver = {
  [K in keyof InputTypeSolver]: (...args: Parameters<Required<InputTypeSolver>[K]>) => void
} & {
  /** 非法的inputType会自动替换为"", 走此映射" */
  ''?: (...args: Parameters<InputAction>) => void
}
/**
 * 自定义添加html事件, 此处添加的事件监听器会在effitor核心监听器注册之后注册 \
 * action中不可引用外部变量, 若需引用, 则应使用 useEffectorContext 或 withEffectorContext 为其添加上下文
 */
export type HTMLEventSolver<Ex extends IEctx<string, object> = IEctx<string, object>> = {
  [k in keyof HTMLElementEventMap]?: HtmlEventAction<HTMLElementEventMap[k], Ex>
}

// 输入行为的ctx 是更新了的, 即 effectElement, paragraphEl, topElement 非空
export type KeyboardAction<Ex extends IEctx<string, object> = IEctx<string, object>, Cx = UpdatedContext>
  = (ev: Et.KeyboardEvent, ctx: Cx, ectx: Ex) => TrueOrVoid
export type InputAction<Ex extends IEctx<string, object> = IEctx<string, object>, Cx = UpdatedContext>
  = (ev: Et.InputEvent, ctx: Cx, ectx: Ex) => TrueOrVoid
export type ClipboardAction<Ex extends IEctx<string, object> = IEctx<string, object>>
  = (ev: Et.ClipboardEvent, ctx: UpdatedContext, ectx: Ex) => TrueOrVoid
// html其他事件中对应元素可能为空
export type HtmlEventAction<E = Event, Ex extends IEctx<string, object> = IEctx<string, object>>
  = (ev: E, ctx: EditorContext, ectx: Ex) => void
export type SelChangeAction<Ex extends IEctx<string, object> = IEctx<string, object>>
  = HtmlEventAction<Event, Ex>
export type FocusEventAction<Ex extends IEctx<string, object> = IEctx<string, object>>
  = (ev: FocusEvent, ctx: EditorContext, ectx: Ex) => void
export type MouseEventAction<Ex extends IEctx<string, object> = IEctx<string, object>>
  = (ev: MouseEvent, ctx: EditorContext, ectx: Ex) => void
export type DragEventAction<Ex extends IEctx<string, object> = IEctx<string, object>>
  = (ev: DragEvent, ctx: EditorContext, ectx: Ex) => void
