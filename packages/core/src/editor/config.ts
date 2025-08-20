import type { EditorContext } from '../context'
import type { Effector, EffectorSupportInline, MainEffector } from '../effector'
import type {
  EffectElement,
  EffectElementCtor,
  EtBodyElement,
  EtEditorElement,
  EtHeadingElement,
  EtParagraph,
  EtParagraphCtor,
} from '../element'
import type { ExtentEtElement } from '../element/register'
import type { hotkey } from '../hotkey'
import type { CaretRange } from '../selection'

/**
 * 编辑器回调, 编辑器核心会使用到的回调, 相当于编辑器钩子
 */
export interface EditorCallbacks {
  /**
   * 定义编辑区内首个插入的段落, 未定义则使用内部默认方式创造第一个段落 ( ctx.createParagraph() )
   * @returns 返回一个元组或一个段落元素; 元组: [段落元素, 光标位置]
   */
  firstInsertedParagraph?: ParagraphCreator
  /** 光标位置所在效应元素改变时调用, 为避免影响性能，内部请使用异步操作 */
  onEffectElementChanged?: (el: EffectElement, old: EffectElement, ctx: EditorContext) => void
  /** 光标位置所在段落改变时调用, 为避免影响性能，内部请使用异步操作 */
  onParagraphChanged?: (el: EtParagraph, old: EtParagraph, ctx: EditorContext) => void
  /**
   * 编辑器内容改变时调用
   * @param ctx
   * @param changedTopElements 改变了的顶层元素
   */
  onEditorContentChanged?: (ctx: EditorContext, changedTopElements: EtParagraph[]) => void
}
export interface ParagraphCreator {
  /**
   * 自定义段落创建函数
   * @returns 单元组or二元组 [段落, 光标要定位到段落内的位置]; 返回单元组时, 则默认使用段落内开头位置
   */
  (): [EtParagraph] | [EtParagraph, CaretRange]
}
/**
 * 编辑器设置, 类似于编辑器回调, 但编辑器核心不会主动调用; 一般由扩展/插件添加, 用于定义编辑器的状态 \
 * 其最大的意义是, 在编辑器创建之后, 在不重启编辑器的情况下更改编辑器及其插件的配置
 */
export type EditorSettings = Record<string, (...args: unknown[]) => void>

/**
 * 编辑器配置
 */
export interface EditorConfig {
  /** 缩进margin-left像素值; 默认 22 */
  INDENT_PIXEL: number
  /** 页面最大缩进数; 默认 6 */
  MAX_INDENT: number
  /** 编辑区字体大小; 默认 16 */
  FONT_SIZE: number
  /** 撤回栈长度; 默认 1000 */
  UNDO_LENGTH: number
  /** 链接url最大有效长度; 默认 2048 */
  ALLOW_LINK_URL_MAX_LENGTH: number
  /** 允许挂载后不unmount而直接mount其他host; 默认 false */
  ALLOW_MOUNT_WHILE_MOUNTED?: boolean
  /** 自动创建第一个段落, 默认 true */
  AUTO_CREATE_FIRST_PARAGRAPH?: boolean
  /** 使用编辑器外框默认样式; 默认 true */
  WITH_EDITOR_DEFAULT_STYLE: boolean
  /** 是否在按下空格时自动将前面一个全角标点字符替换为半角字符; 默认 true */
  AUTO_REPLACE_FULL_WIDTH_PUNC_WITH_HALF_AFTER_SPACE: boolean
}

type IndexSchema = Readonly<Record<string, EffectElementCtor>>
export interface EditorSchema extends IndexSchema {
  /** 当前编辑器元素类 */
  readonly editor: typeof EtEditorElement
  /** 当前编辑区元素类 */
  readonly body: typeof EtBodyElement
  /** 当前标题元素类 */
  readonly heading: typeof EtHeadingElement
  /** 当前段落元素类 */
  readonly paragraph: EtParagraphCtor
}
export type EditorSchemaSetter = (init: Partial<OmitStringIndexKey<EditorSchema>>) => void
type OmitStringIndexKey<T> = {
  [K in keyof T as string extends K ? never : K]: T[K]
}

export interface EditorPluginSupportInline extends EditorPlugin {
  readonly effector: EffectorSupportInline | EffectorSupportInline[]
}
/**
 * 编辑器插件
 */
export interface EditorPlugin {
  /** 插件唯一名字 */
  readonly name: string
  /**
   * 将注册在编辑器上的效应器列表 \
   * 按顺序绑定, 并按顺序触发响应, \
   * 对应handler返回true时将跳过后续插件的相同效应, \
   * `ctx.skipDefault标记为true`时将跳过内置效应 \
   * 当编辑器设置effectorInline=true时, 效应器应遵守内联规则 `rel.`{@link EffectorSupportInline}
   */
  readonly effector: Effector | Effector[]
  /**
   * 自定义的效应元素列表
   */
  readonly elements?: EffectElementCtor[]
  /** 额外的样式css文本 */
  readonly cssText?: string
  /**
   * 插件注册时执行, 一般用于extentEtElement()给效应元素添加handler
   * 也可让插件给EffectElement覆盖或增强绑定的 builtinHandler的内置beforeinput效应
   * * 注意, 插件注册时编辑器尚未mount, 即此时ctx.root, ctx.body都是null
   * ```
   *  registry(ctx, extentEtElement) {
   *      extentEtElement(EffectElement, {
   *          /// 覆盖(增强) 原有的粘贴效应handler
   *          EinsertFromPaste: (ctx, ev) => {
   *              /// before
   *              /// 调用原有handler
   *              const res = builtinHandler.EinsertFromPaste(ctx, ev)
   *              /// after
   *              return res
   *          }
   *      })
   *  }
   * ```
   */
  readonly registry?: (
    ctx: EditorContext, setSchema: EditorSchemaSetter, extentEtElement: ExtentEtElement
  ) => void
};

export interface CreateEditorOptionsInline extends _CreateEditorOptions {
  effectorInline: true
  plugins?: EditorPluginSupportInline[]
}
/**
 * 编辑器初始化选项
 */
export interface CreateEditorOptions extends _CreateEditorOptions {
  effectorInline?: false
}
interface _CreateEditorOptions {
  /** 是否使用shadowDOM, 默认为true; 但仅chromium (准确说是拥有ShadowRoot.getSelection方法的), 其他平台始终为false;  */
  shadow?: boolean
  /** schema选项, 一个自定义元素map, 用于定义编辑器内的富文本内容 */
  schemaInit?: Partial<EditorSchema>
  /** 主效应器 */
  mainEffector?: Required<MainEffector>
  /**
   * 是否将插件效应器内联, 默认false, 设置为true时, 只能使用支持内联effector的插件 \
   * 内联效应器将内联到编辑器核心, 在插件数量较多时拥有更好的性能 \
   * 内联的效应器将不可引用外部变量 (`etcode, dom, cr` 除外), 且相应函数必须是箭头函数, 也不可使用import.meta \
   * 具体见{@link EffectorSupportInline}
   */
  effectorInline?: boolean
  /**
   * 编辑器插件 \
   * 若effectorInline设置为true, 则只能使用支持内联effector的插件
   */
  plugins?: EditorPlugin[] | EditorPluginSupportInline[]
  /** 编辑器配置项 */
  config?: Partial<EditorConfig>
  /** 自定义样式css文本, 该文本会连同自定义EffectElement的cssText和cssStyle一起插入到 shadowDOM的内置样式表中, 会在编辑器挂载前加载完毕 */
  customStyleText?: string
  /** 自定义样式文件列表 */
  customStyleLinks?: CustomStyleLink[]

  callbacks?: EditorCallbacks
  hotkeyOptions?: hotkey.ManagerOptions
};
export interface CustomStyleLink {
  href: string
  /** 是否预加载, 内容相关样式预加载可降低内容闪烁的可能; 或者直接使用customStyleText添加样式 */
  preload?: boolean
  as?: 'font' | 'style'
  onload?: (this: HTMLLinkElement, ev: HTMLElementEventMap['load']) => void
}
