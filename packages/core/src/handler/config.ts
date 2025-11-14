/* eslint-disable @stylistic/max-len */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { BuiltinConfig } from '@effitor/shared'

import type { Et } from '../@types'
import type { InputType } from '../@types/declare'
import type { EditorContext, UpdatedContext } from '../context'
import type { EffectElement, EtParagraph, EtParagraphElement } from '../element'
import { CommandFunctional } from './command/cmds'

export type EffectHandleReturnType = TrueOrVoid | number | object | string
/**
 * Effect处理函数
 * @returns 是否成功处理该效应
 */
export interface EffectHandle<Payload = any> {
  /**
   * 效应处理函数
   * @param this 激活此效应的那个效应元素类对象(构造器)
   * @param ctx 上下文
   * @param payload 效应负载
   * @returns 是否成功处理该效应
   */
  // 由于函数逆变特性, 后续声明的 handle 的参数列表必须是此处参数列表的父类, 因而此处 payload 只能是 any
  (this: EffectHandleThis, ctx: EditorContext, payload: Payload): EffectHandleReturnType
}
/**
 * InputEvent.inputType效应处理器
 */
export interface InputEffectHandle {
  /**
   * 处理指定InputEvent.inputType效应
   * @param this 激活此效应的那个效应元素类对象(构造器)
   * @param ctx 更新后的上下文
   * @param ev 输入事件
   * @returns 是否成功处理该效应
   */
  (this: EffectHandleThis, ctx: UpdatedContext, payload: InputEffectPayload): TrueOrVoid
}
export interface InputEffectPayload {
  readonly data?: string | null
  readonly dataTransfer?: DataTransfer | null
  readonly targetRange: Et.ValidTargetSelection
}

/**
 * InputType效应
 */
export type InputTypeEffect = `${BuiltinConfig.BUILTIN_EFFECT_PREFFIX}${InputType}`
export type InputTypeEffectHandleMap = Record<InputTypeEffect, InputEffectHandle>
export interface DefaultEffectHandleMap {
  /**
   * 在段落末尾插入一个段落 (这是一个回调, 当在段落末尾位置按下 Enter 时, effitor 核心会激活当前段落元素的此效应)
   * * 核心先判断是否在开头, 再判断末尾, 因此当段落为空时, 总是会调用`InsertParagraphAtParagraphStart`
   */
  InsertParagraphAtParagraphEnd: (this: EffectHandleThis, ctx: UpdatedContext, targetCaret: Et.ValidTargetCaretWithParagraph) => boolean
  /**
   * 在段落开头插入一个段落 (这是一个回调, 当在段落开头位置按下 Enter 时, effitor 核心会激活当前段落元素的此效应)
   * * 核心先判断是否在开头, 再判断末尾, 因此当段落为空时, 总是会调用`InsertParagraphAtParagraphStart`
   */
  InsertParagraphAtParagraphStart: (this: EffectHandleThis, ctx: UpdatedContext, targetCaret: Et.ValidTargetCaretWithParagraph) => boolean
  /**
   * 在段落开头 Backspace;
   * @param targetCaret 目标光标, 由当前段落元素认可的段落开头位置
   * @returns 处理成功, 返回 true; 未处理, 返回当前段落的前兄弟; 处理失败, 返回false
   */
  DeleteBackwardAtParagraphStart: (this: EffectHandleThis, ctx: UpdatedContext, targetCaret: Et.ValidTargetCaret) => EtParagraphElement | boolean
  /**
   * 在段落结尾 Delete;
   * @param targetCaret 目标光标, 由当前段落元素认可的段落结尾位置
   * @returns 处理成功, 返回 true; 未处理, 返回当前段落的后兄弟; 处理失败, 返回false
   */
  DeleteForwardAtParagraphEnd: (this: EffectHandleThis, ctx: UpdatedContext, targetCaret: Et.ValidTargetCaret) => EtParagraphElement | boolean

  /**
   * 这是一个回调, 当 compositionend 事件中 event.data 非空时调用ctx.focusEtElement 的该效应处理函数
   * @param data 输入法输入的文本
   */
  InsertCompositionTextSuccess: (this: EffectHandleThis, ctx: EditorContext, data: string) => void
  /**
   * 对即将插入文档的外来内容进行转换; 如`insertFromPaste`时从剪切板`text/html`获取的内容;
   * 默认不转换, 原样使用 htmlProcessor 处理的到的片段
   * @param payload
   * * `payload.fragment`, 要转换的内容
   * * `payload.toEtElement`, 插入位置所属效应元素
   * @returns 转换后的内容
   */
  TransformInsertContents: (this: EffectHandleThis, ctx: EditorContext, payload: {
    readonly fragment: Et.Fragment
    readonly toEtElement: Et.EtElement
  }) => Et.Fragment

  /* -------------------------------------------------------------------------- */
  /*                               原生编辑节点内                                 */
  /* -------------------------------------------------------------------------- */
  /**
   * 原生编辑节点内, 插入输入法文本; 这是一个钩子效应, 由核心处理原生编辑节点内的 EinsertCompositionText 效应时激活
   * * [NB] 此效应内不要修改rawEl.value, 且必须调用原效应处理函数; 此外, 在该效应中, rawEl.selectionStart/End 的值,
   *        在 chrome 和 Safari中, 分别表示输入法组合串的开始和结束位置; 而在 Firefox 中, 这两个值都指向输入法组合串末尾
   * * 该效应内[整个输入法回话内]不能添加任何命令, 否则会导致输入法命令无法正确合并; 若要增强此效应处理, 使用 tailCmd
   * * 为什么要此效应? 设想, 一个 code 插件, 使用 textarea 承载代码输入, 另外使用<pre>展示高亮代码; 那么在输入法输入
   *   时, 也应该将输入法组合串呈现在<pre>上, 此回调效应就是用于通知插件, 你应该更新<pre>的内容了
   */
  InsertCompositionTextInRawEl: (this: EffectHandleThis, ctx: EditorContext, payload: {
    rawEl: Et.HTMLRawEditElement
    data: string
    /**
     * 尾随命令, 该命令会作为当前效应新增的命令的 meta 的一部分, 在执行时调用其 execCallback 方法, 撤回时调用其 undoCallback 方法\
     * * 这应该是一个无 merge 和 finalCallback 的可执行 Functional 命令
     * * 该效应添加的命令执行后若在一个命令事务内, 会尝试合并, 仅保留多个可合并命令的第一个, meta 的该属性值也将仅保留第一个命令的
     */
    tailCmd?: CommandFunctional
  }) => boolean
  /**
   * 原生编辑节点内, 插入文本; 这是一个钩子效应, 编辑/拖拽/粘贴插入文本都会激活此效应
   */
  InsertTextInRawEl: (this: EffectHandleThis, ctx: EditorContext, payload: {
    rawEl: Et.HTMLRawEditElement
    data: string
    offset: number
    /** 聚焦到的插入位置, false时不会让 rawEl 获取焦点 (除非光标已在其中), 默认 true */
    focus?: boolean
    /**
     * 尾随命令, 该命令会作为当前效应新增的命令的 meta 的一部分, 在执行时调用其 execCallback 方法, 撤回时调用其 undoCallback 方法\
     * * 这应该是一个无 merge 和 finalCallback 的可执行 Functional 命令
     * * 该效应添加的命令执行后若在一个命令事务内, 会尝试合并, 仅保留多个可合并命令的第一个, meta 的该属性值也将仅保留第一个命令的
     */
    tailCmd?: CommandFunctional
  }) => boolean
  /**
   * 原生编辑节点内, 删除文本; 这是一个钩子效应, 编辑/拖拽/剪切删除文本都会激活此效应; 此效应最终通过 DeleteTextInRawEl 产生结果
   */
  DeleteInRawEl: (this: EffectHandleThis, ctx: EditorContext, payload: {
    rawEl: Et.HTMLRawEditElement
    isBackward: boolean
    /** 删除类型, 当且仅当 rawEl 内选区非 range 时生效 */
    deleteType?: 'char' | 'word' | 'line'
    /** 聚焦到的删除位置, false时不会让 rawEl 获取焦点 (除非光标已在其中), 默认 true */
    focus?: boolean
  }) => boolean
  /** 原生编辑节点内, 删除文本; 这是一个钩子效应, 此效应由 DeleteInRawEl 效应激活 */
  DeleteTextInRawEl: (this: EffectHandleThis, ctx: EditorContext, payload: {
    rawEl: Et.HTMLRawEditElement
    start: number
    end: number
    /**
     * 聚焦到的删除位置, 缺省时不会让 rawEl 获取焦点; 若需要聚焦, 则
     * * Backspace删除时, 该值应为 'end' (应为命令撤回(插回文本)时直接使用该值设置 rawEl 内光标位置)
     * * Delete删除时, 该值应为 'start'
     */
    selectMode?: SelectionMode
    /**
     * 尾随命令, 该命令会作为当前效应新增的命令的 meta 的一部分, 在执行时调用其 execCallback 方法, 撤回时调用其 undoCallback 方法\
     * * 这应该是一个无 merge 和 finalCallback 的可执行 Functional 命令
     * * 该效应添加的命令执行后若在一个命令事务内, 会尝试合并, 仅保留多个可合并命令的第一个, meta 的该属性值也将仅保留第一个命令的
     */
    tailCmd?: CommandFunctional
  }) => boolean
  /** 原生编辑节点内, 替换文本; 这是一个钩子效应, 选区 range 状态下编辑/粘贴插入文本会激活此效应 */
  ReplaceTextInRawEl: (this: EffectHandleThis, ctx: EditorContext, payload: {
    rawEl: Et.HTMLRawEditElement
    start: number
    end: number
    data: string
    /** 聚焦到的替换位置, false时不会让 rawEl 获取焦点 (除非光标已在其中), 默认 true */
    focus?: boolean
    /**
     * 尾随命令, 该命令会作为当前效应新增的命令的 meta 的一部分, 在执行时调用其 execCallback 方法, 撤回时调用其 undoCallback 方法\
     * * 这应该是一个无 merge 和 finalCallback 的可执行 Functional 命令
     * * 该效应添加的命令执行后若在一个命令事务内, 会尝试合并, 仅保留多个可合并命令的第一个, meta 的该属性值也将仅保留第一个命令的
     */
    tailCmd?: CommandFunctional
  }) => boolean
  /** 原生编辑节点内, 增加缩进; */
  FormatIndentInRawEl: (this: EffectHandleThis, ctx: EditorContext, payload: {
    rawEl: Et.HTMLRawEditElement
    start: number
    end: number
  }) => boolean
  /** 原生编辑节点内, 减少缩进; */
  FormatOutdentInRawEl: (this: EffectHandleThis, ctx: EditorContext, payload: {
    rawEl: Et.HTMLRawEditElement
    start: number
    end: number
  }) => boolean
}
/**
 * 绑在类名上的效应处理器声明\
 * InputTypeEffect 以 `E+inputType` 命名\
 * 默认 Effect 以 TitleCase 命名\
 * 自定义 Effect 以 camelCase 命名\
 * 自定义的 Effect 只能通过 ctx.effectInvoker 来激活;
 * 而默认的 Effect 则可以通过 ctx.body.dispatchInputEvent 来激活
 * @augmentable
 */
export interface EffectHandleDeclaration extends Record<string, EffectHandle> {
  E: EffectHandle
  /** tab效应, 具有`CaretOut`效应的元素, 默认行为是跳到下一节点开头; 其他节点默认行为是插入制表符 */
  tabout: EffectHandle<Et.ValidTargetCaret>
  /** 双击空格效应, 具有`CaretOut`效应的元素, 默认行为是跳出最外层同类节点 */
  dblSpace: EffectHandle<Et.ValidTargetCaret>
}
/**
 * 效应处理器, 需通过`mountEtHandler`将其挂载到效应元素类对象(构造器)上才能被 effectInvoker 激活\
 * 可用于创建 handler 时提供类型提示
 */
export type EffectHandler = Partial<
  // 去掉索引签名, 用于在 invoke 方法中获得参数提示
  OmitStringIndexSignature<EffectHandleDeclaration> & DefaultEffectHandleMap & InputTypeEffectHandleMap
>

/**
 * EffectHandler的工具类, 从 EffectHandler 中提取指定键的类型, 并将其转换为必填项\
 * 可用于通过非 invoker 方式激活效应时断言pick 的效应处理函数非空
 */
export type EffectHandlerPick<K extends keyof T, T extends EffectHandler = EffectHandler> = Pick<Required<T>, K>

/**
 * 一个 EffectHandler 的工具类, 通过泛型断言`ctx.commonEtElement/focusParagraph/focusTopElement`的类型\
 * 当确定将某个 effectHandler 绑定到某个特定的 `E extends EffectElement` 效应元素类上,
 * 或者确定某个效应是经过已确定类型的上下文效应元素(commonEtElement/focusParagraph/focusTopElement)激活的
 * 则可以使用此工具类, 将对应的上下文效应元素分别断言为 `E/P/T`;
 * * 特别的, 当选区 collapsed 时, ctx.focusEtElement 等于 ctx.commonEtElement
 * * 此工具类旨在减少 effector -> effectHandler 过程中重复的效应元素类型判断;
 *   因为激活效应需要获取效应元素的构造函数, 这不是一个高效的过程, 因此一些简单的
 *   是否激活此效应的判断, 可以在 effector 中进行, 其中就包括判定当前上下文效应
 *   元素的类型; 那既然在 effector 中判定了, 那么不必在 handler 中再次判断,
 *   就需要借助此工具类对 handler 中的上下文效应元素类型进行断言
 */
export type EffectHandlerWith<
  E extends EffectElement = EffectElement,
  P extends EtParagraph | null = EtParagraph | null,
  T extends EtParagraph | null = EtParagraph | null,
> = {
  [K in keyof EffectHandler]: (
    this: EffectHandleThis,
    ctx: TupleFirst<Parameters<Required<EffectHandler>[K]>> & {
      commonEtElement: E
      focusParagraph: P
      focusTopElement: T
    },
    ...args: TupleTail<Parameters<Required<EffectHandler>[K]>>
  ) => ReturnType<Required<EffectHandler>[K]>
}

export type EffectHandleThis = Pick<typeof EffectElement,
  | 'superHandler'
  | 'thisHandler'
  | 'effectBlocker'
> & EffectHandler & EffectHandlerPick<keyof DefaultEffectHandleMap>

/**
 * InputEvent 初始化参数, 包含效应码; 这是一个扩展, 用于在那些浏览器自身不支持的
 * inputType 的场景下, 将该 inputType 值写入 data 里, 该扩展为了能在设置 data
 * 属性时获取正确的类型提示
 * * 使用 data 传递的效应名, 首字母大写则使用其本身, 若首字母小写, 则会在 invoke 时
 * 自动在其前加上InputTypeEffect 前缀`E`
 */
export interface InputEventInitWithEffect extends InputEventInit {
  data?: keyof DefaultEffectHandleMap | ''
  inputType: InputType
}
