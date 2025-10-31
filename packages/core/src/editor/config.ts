import type { EditorContext, EditorContextMeta } from '../context'
import type { Effector, EffectorSupportInline, MainEffector } from '../effector'
import type {
  EffectElement,
  EffectElementCtor,
  EtBodyElement,
  EtEditorElement,
  EtHeading,
  EtParagraph,
  EtParagraphCtor,
} from '../element'
import type { MountEtHandler } from '../element/register'
import { HotstringOptions } from '../hotstring/manager'
import { HtmlProcessorOptions } from '../html'
import type { CaretRange } from '../selection'
import { ConfigManager } from './ConfigManager'

export type OnEffectElementChanged = (
  el: EffectElement | null, old: EffectElement | null, ctx: EditorContext) => void
export type OnParagraphChanged = (
  el: EtParagraph | null, old: EtParagraph | null, ctx: EditorContext) => void
/**
 * 编辑器回调, 编辑器核心会使用到的回调, 相当于编辑器钩子;
 * * 其中on 开头的钩子, 也可通过 effector 添加, 并最终合并到editor.callbacks对象上
 */
export interface EditorCallbacks {
  /**
   * 定义编辑区内首个插入的段落, 未定义则使用内部默认方式创造第一个段落 ( ctx.createParagraph() )
   * @returns 返回一个元组或一个段落元素; 元组: [段落元素, 光标位置]
   */
  firstInsertedParagraph?: ParagraphCreator
  /** 光标位置所在效应元素改变时调用, 这是同步执行的 */
  onEffectElementChanged?: OnEffectElementChanged
  /** 光标位置所在段落改变时调用, 这是同步执行的 */
  onParagraphChanged?: OnParagraphChanged
  /** 光标所在顶层节点发生改变时调用, 这是同步执行的 */
  onTopElementChanged?: OnParagraphChanged
  /**
   * 编辑器内容改变时调用
   * @deprecated 未清晰此回调用意
   *
   * @param ctx
   * @param changedTopElements 改变了的顶层元素
   */
  onEditorContentChanged?: (ctx: EditorContext, changedTopElements: EtParagraph[]) => void
  /**
   * 编辑器深色模式改变时调用
   * @param isDark 是否为深色模式
   */
  onDarkModeChanged?: (ctx: EditorContext, isDark: boolean) => void
}
export interface ParagraphCreator {
  /**
   * 自定义段落创建函数
   * @returns 单元组or二元组 [段落, 光标要定位到段落内的位置]; 返回单元组时, 则默认使用段落内开头位置
   */
  (ctx: EditorContext): [EtParagraph] | [EtParagraph, CaretRange]
}

/**
 * 编辑器设置, 类似于编辑器回调, 但编辑器核心不会主动调用; 一般由扩展/插件添加, 用于定义编辑器的状态 \
 * 其最大的意义是, 在编辑器创建之后, 在不重启编辑器的情况下更改编辑器及其插件的配置
 * @extendable
 */
// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
export interface EditorSettings {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: (...args: any[]) => any
}

export interface EditorStatus {
  /** 是否为深色模式 */
  isDark: boolean
}

/**
 * 编辑器配置
 */
export interface EditorConfig {
  /** 缩进margin-left像素值; 默认 22 */
  // INDENT_PIXEL: number
  /** 页面最大缩进数; 默认 6 */
  // MAX_INDENT: number
  /** 撤回栈长度; 默认 1000 */
  UNDO_LENGTH: number
  /** 允许挂载后不unmount而直接mount其他host; 默认 false */
  ALLOW_MOUNT_WHILE_MOUNTED?: boolean
  /** 自动创建第一个段落, 默认 true */
  AUTO_CREATE_FIRST_PARAGRAPH?: boolean
  /** 使用编辑器默认样式; 默认 true */
  WITH_EDITOR_DEFAULT_STYLE: boolean
  /** 是否开启编辑器默认log记录; 默认 false */
  WITH_EDITOR_DEFAULT_LOGGER: boolean
  /** 是否在按下空格时自动将前面一个全角标点字符替换为半角字符; 默认 true */
  AUTO_REPLACE_FULL_WIDTH_PUNC_WITH_HALF_AFTER_SPACE: boolean
  /** 插入(硬)换行时是否使用 br, 否则使用`\n`, 默认 false */
  INSERT_BR_FOR_LINE_BREAK: boolean
  /**
   * // TODO 使用插件方式实现
   * 是否动态设置contenteditable; 默认 false; (该配置仅 Chromium 有效)\
   * 仅 Chromium 平台在 100w 字符量级下需要开启, 用于优化输入法输入性能和体验\
   * Firefox 和 Safari 平台下不需要开启, 这俩平台输入法与普通输入拥有同等性能表现
   */
  // DYNAMIC_CONTENTEDITABLE: boolean
}

type IndexSchema = Readonly<Record<string, EffectElementCtor>>
export interface EditorSchema extends IndexSchema {
  /** 当前编辑器元素类 */
  readonly editor: typeof EtEditorElement
  /** 当前编辑区元素类 */
  readonly body: typeof EtBodyElement
  /** 当前标题元素类 */
  readonly heading: typeof EtHeading
  /** 当前段落元素类 */
  readonly paragraph: EtParagraphCtor
}
export type EditorSchemaSetter = (init: Partial<OmitStringIndexSignature<EditorSchema>>) => void

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
   * 插件注册时执行, 用于初始化上下文 meta, 效应元素 schema, 以及挂载效应处理器\
   * * 此函数执行时, 编辑器仅初始化, 尚未 mount
   * @example
   *  register(ctxMeta, setSchema, mountEtHandler) {
   *    // 设置 schema link 为 EtLinkElement
   *    setSchema({ link: EtLinkElement })
   *    // 挂载 link 效应处理器到段落上, 让 link 元素能插入到段落中
   *    mountEtHandler(ctx.schema.paragraph, markLinkHandler, [EtLinkElement])
   *    // 覆盖(增强) 原有的粘贴效应处理函数
   *    mountEtHandler(EffectElement, {
   *      EinsertFromPaste(ctx, payload) => {
   *        // before
   *        // 调用原有handler
   *        const res = this.superHandler.EinsertFromPaste(ctx, payload)
   *        // after
   *        return res
   *      }
   *    })
   *  }
   */
  readonly register?: (
    ctxMeta: EditorContextMeta, setSchema: EditorSchemaSetter, mountEtHandler: MountEtHandler,
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
  /**
   * 是否使用shadowDOM, 默认为false; 目前仅chromium (准确说是拥有ShadowRoot.getSelection方法的)支持设置为 true, 其他平台始终为false;
   * * ⚠️ 目前在 chrome ShadowDOM 内, 选区无法选中不可编辑节点边缘，Selection 会自动将选区调整到最近的可编辑文本节点边缘, 不清楚这是否是chrome的bug, 尚不建议设置为true
   * @default false
   */
  shadow?: boolean
  /** schema选项, 一个自定义元素map, 用于定义编辑器内的富文本内容 */
  schemaInit?: Partial<EditorSchema>
  /** 主效应器 */
  mainEffector?: Required<MainEffector>
  /**
   * 是否将插件效应器内联, 默认false, 设置为true时, 只能使用支持effector内联的插件 \
   * 启用时, 插件 effector 将内联到编辑器核心, 在插件数量较多时能拥有更好的性能 \
   * 内联的效应器将不可引用外部变量 (`ectx, dom, cr, etcode` 除外), 且相应函数必须是箭头函数, 也不可使用import.meta \
   * 具体见{@link EffectorSupportInline}
   */
  effectorInline?: boolean
  /**
   * 编辑器助手(插件) \
   * 若effectorInline设置为true, 则只能使用支持内联effector的插件
   */
  assists?: EditorPlugin[] | EditorPluginSupportInline[]
  /**
   * 编辑器(内容)插件 \
   * 若effectorInline设置为true, 则只能使用支持内联effector的插件
   */
  plugins?: EditorPlugin[] | EditorPluginSupportInline[]
  /** 编辑器配置项 */
  config?: Partial<EditorConfig>
  /** 自定义样式css文本, 该文本会连同自定义EffectElement的cssText和cssStyle一起插入到 shadowDOM的内置样式表中, 会在编辑器挂载前加载完毕 */
  customStyleText?: string
  /** 自定义样式文件列表, 以<link>形式插入到编辑器根节点中 */
  customStyleLinks?: CustomStyleLink[]
  /** 编辑器回调, 编辑器核心会主动调用的函数(钩子) */
  callbacks?: EditorCallbacks
  // /** 热键配置选项 */
  // hotkeyOptions?: HotkeyOptions
  /** 热字符串配置选项 */
  hotstringOptions?: HotstringOptions
  /** html 处理器选项 */
  htmlOptions?: HtmlProcessorOptions
  // /** markdown 处理器选项 */
  // markdownOptions?: MarkdownProcessorOptions
  /**
   * 配置管理器, 用于恢复存储的编辑器配置, 并监听编辑器配置更新, 以持久化编辑器配置
   * 通过该属性获取的配置的优先级是最高的, 会覆盖 config 传入的配置
   */
  configManager?: ConfigManager
};
export interface CustomStyleLink {
  href: string
  /** 是否预加载, 内容相关样式预加载可降低内容闪烁的可能; 或者直接使用customStyleText添加样式 */
  preload?: boolean
  as?: 'font' | 'style'
  onload?: (this: HTMLLinkElement, ev: HTMLElementEventMap['load']) => void
}

export interface EditorMountOptions {
  /** 编辑器所在滚动容器, 默认为根 html 元素 */
  scrollContainer?: HTMLElement
  /** 编辑器语言, 默认为 'navigator.language' */
  locale?: string
  /** 自定义样式文件列表, 该值会覆盖编辑器初始化时的customStyleLinks */
  customStyleLinks?: CustomStyleLink[]
}
