import type { Et } from '../@types'
import type { EditorContext, UpdatedContext } from '../context'
import type { EditorCallbacks } from '../editor'
import type { DefinedEtElementMap } from '../element'
import type { MainBeforeInputTypeSolver } from './beforeinput'
import type { MainAfterInputTypeSolver } from './input'
import type { MainKeydownKeySolver } from './keydown'
import type { MainKeyupKeySolver } from './keyup'

/**
 * 内联效应器 \
 * 除onMounted和onBeforeUnmount外, 其中所有执行器(函数)必须是箭头函数,
 * 且不可引用模块`import`对象以及任何函数作用域外的变量/函数, (除了从effitor导出的全局工具: `etcode, dom, cr`), \
 * 如需引用其他变量, 需使用 `useEffectorContext` 或 `withEffectorContext` 为其添加上下文
 * @rel [`ectx`](./ectx.ts)
 */
export interface EffectorSupportInline extends Effector {
  readonly inline: true
}
/** 效应器, 响应用户操作, 执行对应Handler */
export interface Effector extends Partial<Solvers & Hooks> {
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
export interface Solvers {
  /**
   * keydown.capture中处理按键响应, 类似 keydownSolver; 但能捕获所有按键, 并可通过
   * `ev.stopImmediatePropagation` 阻止后续 keydown 事件的传播 (keydownSolver, MainKeydownKeySolver)
   * * 若按键处理函数返回 true, 则会同时禁止(传播\冒泡\默认行为)
   * * 如非必要, 不建议使用此solver, 此 solver 处理太多逻辑会影响性能, 降低编辑流畅性
   */
  readonly beforeKeydownSolver: KeyboardSolver
  /**
   * keydown中处理按键响应 ev.key -> action;
   * * 若 ev.key长度为1 或为方向键, 则此 solver 捕获不到, 需使用 beforeKeydownSolver
   * * 当配置了`default`时, key 匹配失败将会使用 default, 但`效应元素特有效应器处理函数`除外
   * * 键名可用效应元素名(DefinedEtElementMap中定义的), 类似`default`, 光标在效应元素内触发相应事件时
   *   会用该效应元素小写标签从 Solver 里获取处理函数, 一旦获取成功, 便不再访问该 solver,
   *   可以理解为, 使用效应元素名定义的 sovler 处理函数会独占该效应元素内的行为
   */
  readonly keydownSolver: KeyboardSolver
  /**
   * keyup中处理按键响应
   * * 当配置了`default`时, key 匹配失败将会使用 default, 但`效应元素特有效应器处理函数`除外
   * * 键名可用效应元素名(DefinedEtElementMap中定义的), 类似`default`, 光标在效应元素内触发相应事件时
   *   会用该效应元素小写标签从 Solver 里获取处理函数, 一旦获取成功, 便不再访问该 solver,
   *   可以理解为, 使用效应元素名定义的 sovler 处理函数会独占该效应元素内的行为
   */
  readonly keyupSolver: KeyboardSolver
  /**
   * beforeinput中处理inputType
   * * 当配置了`default`时, key 匹配失败将会使用 default, 但`效应元素特有效应器处理函数`除外
   * * 键名可用效应元素名(DefinedEtElementMap中定义的), 类似`default`, 光标在效应元素内触发相应事件时
   *   会用该效应元素小写标签从 Solver 里获取处理函数, 一旦获取成功, 便不再访问该 solver,
   *   可以理解为, 使用效应元素名定义的 sovler 处理函数会独占该效应元素内的行为
   */
  readonly beforeInputSolver: InputSolver
  /**
   * input中处理inputType
   * * 当配置了`default`时, key 匹配失败将会使用 default, 但`效应元素特有效应器处理函数`除外
   * * 键名可用效应元素名(DefinedEtElementMap中定义的), 类似`default`, 光标在效应元素内触发相应事件时
   *   会用该效应元素小写标签从 Solver 里获取处理函数, 一旦获取成功, 便不再访问该 solver,
   *   可以理解为, 使用效应元素名定义的 sovler 处理函数会独占该效应元素内的行为
   */
  readonly afterInputSolver: InputSolver
  /**
   * 其他html事件监听器; 在这些监听器中, 通过 `ev.stopImmediatePropagation`
   * 来阻止Effitor的相同事件行为, 而不是`ctx.preventAndSkipDefault(ev)`
   */
  readonly htmlEventSolver: HTMLEventSolver
  /** 复制或剪切时添加数据到clipboardData */
  readonly copyCallback: ClipboardAction
  /**
     * 粘贴回调,
     */
  readonly pasteCallback: ClipboardAction
  /**
   * selectionchange回调
   *  `document`的`selectionchange`事件监听器由编辑器focus时创建, blur时移除;
   *  effector的selchange回调统一在该监听器内执行
   */
  readonly selChangeCallback: SelChangeAction
  /** 编辑器focus后调用, 这不是立即调用的, 它们会在编辑器focus且更新上下文和选区后调用(在第一次selectionchange之前) */
  readonly focusinCallback: FocusEventAction
  /** 编辑器失去焦点时立即调用 (解绑selectionchange事件之前以及相关效应元素 focusoutCallback 前) */
  readonly focusoutCallback: FocusEventAction
}
export type Solver = KeyboardKeySolver | InputTypeSolver | HTMLEventSolver
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
export type KeyboardKeySolver = Partial<Record<Et.KeyboardKey, KeyboardAction>> & {
  /** 默认响应, 即当ev.key未声明在solver中时, 执行该响应 */
  default?: KeyboardAction
}
/**
 * beforeinput/input事件中的处理相关输入, ev.inputType -> action \
 * action中不可引用外部变量, 若需引用, 则应使用 useEffectorContext 或 withEffectorContext 为其添加上下文
 */
export type InputTypeSolver = Partial<Record<Exclude<Et.InputType, 'undefined'>, InputAction>> & {
  default?: InputAction
}

export type KeyboardSolverInEtElement = {
  [k in keyof DefinedEtElementMap]?: KeyboardAction
}
export type InputTypeSolverInEtElement = {
  [k in keyof DefinedEtElementMap]?: InputAction
}

export type KeyboardSolver = KeyboardKeySolver & KeyboardSolverInEtElement
export type InputSolver = InputTypeSolver & InputTypeSolverInEtElement

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
export type HTMLEventSolver = {
  [k in keyof HTMLElementEventMap]?: HtmlEventAction<HTMLElementEventMap[k]>
}

// 输入行为的ctx 是更新了的, 即 effectElement, paragraphEl, topElement 非空
export type KeyboardAction = (ev: Et.KeyboardEvent, ctx: UpdatedContext) => TrueOrVoid
export type InputAction = (ev: Et.InputEvent, ctx: UpdatedContext) => TrueOrVoid
export type ClipboardAction = (ev: Et.ClipboardEvent, ctx: UpdatedContext) => TrueOrVoid
// html其他事件中对应元素可能为空
export type HtmlEventAction<E = Event> = (ev: E, ctx: EditorContext) => void
export type SelChangeAction = HtmlEventAction
export type FocusEventAction = (ev: FocusEvent, ctx: EditorContext) => void
