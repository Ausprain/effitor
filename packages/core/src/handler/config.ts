/* eslint-disable @stylistic/max-len */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Options as FmOptions } from 'mdast-util-from-markdown'

import type { Et } from '../@types'
import type { InputType } from '../@types/declare'
import type { EditorContext, UpdatedContext } from '../context'
import type { EffectElement, EtParagraphElement } from '../element'
import { BuiltinConfig } from '../enums'

export type EffectHandleReturnType = boolean | number | object | string
/**
 * Effect处理器
 * @returns 是否成功处理该效应
 */
export interface EffectHandle {
  /**
   * 效应处理函数
   * @param _this 当前invoke的效应元素类对象(构造器)
   * @param ctx 更新后的上下文
   * @param payload 效应负载
   * @returns 是否成功处理该效应
   */
  // 由于函数逆变特性, 后续声明的 handle 的参数列表必须是此处参数列表的父类, 因而此处 payload 只能是 any
  (_this: EffectHandleThis, ctx: EditorContext, payload?: any): EffectHandleReturnType
}
/**
 * InputEvent.inputType效应处理器
 */
export interface InputEffectHandle {
  /**
   * 处理指定InputEvent.inputType效应
   * @param _this 当前invoke的效应元素类对象(构造器)
   * @param ctx 更新后的上下文
   * @param ev 输入事件
   * @returns 是否成功处理该效应
   */
  (_this: EffectHandleThis, ctx: UpdatedContext, payload: InputEffectPayload): boolean
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
export type DefaultEffectHandleMap = InputTypeEffectHandleMap & {
  /**
   * 在段落开头 Backspace; 处理成功, 返回 true; 未处理, 返回topElement 的前兄弟, 处理失败, 返回false
   * @param targetCaret 目标光标, 必须是段落开头位置
   */
  BackspaceAtParagraphStart: (_this: EffectHandleThis, ctx: EditorContext, targetCaret: Et.ValidTargetCaret) => EtParagraphElement | boolean
  /**
   * 在段落结尾 Delete; 处理成功, 返回 true; 未处理, 返回topElement 的后兄弟, 处理失败, 返回false
   * @param targetCaret 目标光标, 必须是段落结尾位置
   */
  DeleteAtParagraphEnd: (_this: EffectHandleThis, ctx: EditorContext, targetCaret: Et.ValidTargetCaret) => EtParagraphElement | boolean
  /**
   * 初始化编辑器内容, 一般初始化为一个普通段落, 可通过编辑器 firstInsertedParagraph 回调自定义;
   * 若编辑器已有内容, 则会先清空再重新初始化
   * @param payload
   * * `create?`: 首段落创建函数
   * * `isFirstInit`: 是否首次初始化, 即编辑器是否为空
   */
  InitEditorContents: (_this: EffectHandleThis, ctx: EditorContext, payload: {
    create?: Et.ParagraphCreator
    isFirstInit: boolean
  }) => void
  /** 使用 markdown 文本更新编辑器内容 */
  UpdateEditorContentsFromMarkdown: (_this: EffectHandleThis, ctx: EditorContext, payload: {
    mdText: string
    mdOptions?: FmOptions
  }) => void

  /**
   * 对即将插入文档的内容进行转换; 如`insertFromPaste`时从剪切板`text/html`获取的内容;
   * 默认不转换, 原样使用 htmlProcessor 处理的到的片段
   * @param payload
   * * `payload.fragment`, 要转换的内容(原地转换)
   * * `payload.insertToEtElement`, 插入位置所属效应元素
   */
  TransformInsertContents: (_this: EffectHandleThis, ctx: EditorContext, payload: {
    fragment: Et.Fragment
    insertToEtElement: Et.EtElement
  }) => void
}
/**
 * 绑在类名上的效应处理器声明\
 * InputTypeEffect 以 `E+inputType` 命名\
 * 默认 Effect 以 TitleCase 命名\
 * 自定义 Effect 以 camelCase 命名\
 * 自定义的 Effect 只能通过 ctx.effectInvoker 来激活;
 * 而默认的 Effect 则可以通过 ctx.dispatchInputEvent 来激活
 * @extendable
 */
export interface EffectHandleDeclaration extends Record<string, EffectHandle> {
  E: EffectHandle
}
/**
 * 用于创建 handler 时提供类型提示
 */
export type EffectHandleMap = Partial<
  // 去掉索引签名, 用于在 invoke 方法中获得参数提示
  OmitStringIndexSignature<EffectHandleDeclaration> & DefaultEffectHandleMap
>

export type EffectHandleThis = typeof EffectElement & EffectHandleMap

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
