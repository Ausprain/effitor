import type { DefaultConfig } from "../config";
import type { MainBeforeInputSolver, MainKeydownSolver, MainAfterInputSolver, MainKeyupSolver } from "../effector";
import type {
    EffectElement,
    EffectElementCtor,
    EtBodyCtor,
    EtBodyElement,
    EtComponentElement,
    EtEditorCtor,
    EtEditorElement,
    EtParagraphCtor,
    EtParagraphElement,
    EtPlainTextElement,
    EtRichTextElement
} from "../element";

/**
 * 内置配置, 不对外导出, 仅开发使用
 */
export const enum BuiltinConfig {
    /** 内置Effect前缀, 便于effectBlocker过滤 */
    BUILTIN_EFFECT_PREFFIX = 'E',
}
export const enum BuiltinElType {
    UNDEFINED = 'undefined',
    RICHTEXT = 'richtext',
    PLAINTEXT = 'plaintext',
    PARAGRAPH = 'paragraph',
    COMPONENT = 'component',
}
export const enum BuiltinElName {
    ET_APP = 'et-editor',
    ET_BODY = 'et-body',
    ET_RICHTEXT = 'et-r',
    ET_PLAINTEXT = 'et-t',
    ET_PARAGRAPH = 'et-p',
    ET_COMPONENT = 'et-comp',

    ET_CODE = 'et-code',
    ET_IMAGE = 'et-img',
    ET_LINK = 'et-link',
    ET_LIST = 'et-list',
    // ET_TABLE = 'et-table',
}
export const enum HtmlChar {
    ZERO_WIDTH_SPACE = '\u200B',
    NBSP = '\u00A0',
}
declare global {
    interface HTMLElementEventMap {
        input: Et.EtInputEvent;
        copy: Et.EtClipboardEvent;
        cut: Et.EtClipboardEvent;
        paste: Et.EtClipboardEvent;
    }
    interface HTMLElement {
        readonly elType?: Et.ElType
        setAttribute<K extends keyof Et.ElAttrs>(qualifiedName: K, value: Et.ElAttrs[K]): void;
        setAttribute(qualifiedName: string, value: string): void;
        getAttribute<K extends keyof Et.ElAttrs>(qualifiedName: K): Et.ElAttrs[K];
        getAttribute(qualifiedName: string): string;
        removeAttribute<K extends keyof Et.ElAttrs>(qualifiedName: K): void;
        removeAttribute(qualifiedName: string): void;
        addEventListener(type: 'beforeinput', listener: (ev: Et.EtInputEvent) => any, options?: boolean | EventListenerOptions): void;
    }
    interface Document {
        // createElement<K extends keyof HTMLElementTagNameMap>(tagName: K, options?: ElementCreationOptions): HTMLElementTagNameMap[K];
        // createElement(tagName: string, options?: ElementCreationOptions): HTMLElement;
        createElement<K extends keyof Et.DefinedEtElementMap>(tagName: K): Et.DefinedEtElementMap[K];
        addEventListener(type: 'beforeinput', listener: (ev: Et.EtInputEvent) => any, options?: boolean | EventListenerOptions): void;
    }
}
/**
 * 开发effitor的命名空间, 需要由入口文件导出, 不要在此导出const enum, 这会失去const enum的意义
 */
export namespace Et {

    /**
     * 排版字符
     */
    export const HtmlChar = {
        ZERO_WIDTH_SPACE: '\u200B',
        NBSP: '\u00A0',
    } as const;

    export type Prototype<C extends Function> = { constructor: C }

    // export type NullableSelection = Selection | null;
    // export type NullableRange = Range | null;
    export type HTMLNode = Text | HTMLElement;
    export type NullableNode = Node | null;
    export type NullableElement = HTMLElement | null;
    export type NullableText = Text | null;
    export interface TextStaticRange extends StaticRange { endContainer: Text, startContainer: Text }
    export type booleanvoid = boolean | void;

    /* -------------------------------------------------------------------------- */
    /*                                     编辑器                                    */
    /* -------------------------------------------------------------------------- */

    /**
     * 编辑器
     */
    export interface Editor {
        /**
         * 在一个div下绑定一个Effitor编辑器
         */
        readonly mount: (el: HTMLDivElement) => void
        readonly unmount: (el: HTMLDivElement) => void
    }
    /**
     * 编辑器上下文对象
     */
    export interface EditorContext {
        /** symbol索引, 用于给扩展effector添加自定义属性 */
        [k: symbol]: any

        readonly schema: EditorSchema
        /** 当前活跃编辑器所属的div, root.host的父节点 */
        el: HTMLDivElement
        /** 当前触发编辑逻辑的ShadowRoot */
        root: ShadowRoot & { getSelection?: () => Selection | null }
        /** 当前编辑区 */
        body: EtBodyElement

        /** 当前`Selection`对象 */
        selection: Selection
        /** 对应的`Range`对象 */
        range: Range
        /** 当且仅当`Selection.anchorNode`是TextNode时非空  */
        node: NullableText
        /** 上一个`text node` */
        oldNode: NullableText
        /** 当前效应元素 */
        effectElement: EffectElement
        /** 是否EffectElement开端, 当且仅当effectElement非空且其textContent=='' */
        // isEtElBegining: boolean
        /** 当前光标所在段落, effitor是段落驱动的, 光标只能落在段落里 */
        paragraphEl: EtParagraphElement

        /** 光标在编辑区内 */
        // focused: boolean
        /** 当前按下的按键, 在keydown事件中, 为上一个按下的按键; 在keydown结束时赋值当前按键 */
        currDownKey?: string
        /** 上一个抬起的按键; 111ms后重设为undefined; 若在keydown时光标为Range状态, 则设置为null, 并在keyup中为null时不记录该按键 */
        prevUpKey?: string | null
        /** 是否按住按键 */
        // isPressing: boolean
        /** 当前按键是否在输入法会话中按下, 该值等于keydown事件的isComposing, 触发输入法会话的那一下keydown为false */
        // isComposing: boolean
        /** 是否处于输入法会话中, 即compositionstart与compositionend之间 */
        inCompositionSession: boolean
        /** 记录composingupdate次数, 用于跳过后续update导致的selectionchange; 当第一次触发输入法事务时, count=1 */
        compositionupdateCount: number
        /** 跳过n次`selectionchange`回调；如：在手动插入一个`zws`时 +1 */
        // skipSelChange: number
        /** 是否跳过默认Effector, (在keydown/keyup/beforeinput/input中设置为true时, 都将跳过mainEffector的对应事件监听器) */
        skipDefault: boolean

        // updateNeeded: boolean
        // readonly update: (this: EditorContext) => void
        readonly forceUpdate: (this: EditorContext) => void

        readonly effectInvoker: EffectInvoker
        readonly commandHandler: CommandHandler


        /** 是否光标跳跃，当`selectionchange`时若`anchorNode`不是同一个`node`节点，将视为光标跳跃 */
        // caretLeap: boolean

        /** 类型标记, 指示当前节点的类型；'none'表示清除样式 */
        // markType?: MarkType
        /** 标记将要删除的节点集合 */
        // readyRemoveNodeSet: Set<Element>
        /** 展开标记符的`hint-node`节点集合 */
        // hintingNodeSet: Set<Element>
        /** 检查selection, range, node是否均非空 */
        // checkNotNull: (x: [NullableSelection, NullableRange, NullableNode]) => x is [Selection, Range, Node]
    }
    export interface EditorSchema {
        readonly editor: EtEditorCtor
        readonly body: EtBodyCtor
        readonly paragraph: EtParagraphCtor
        // readonly link: EtLinkElementCtor
        // readonly image: EtImageElementCtor
    }
    export type EditorConfig = DefaultConfig
    /**
     * 编辑器初始化选项
     */
    export type CreateEditorOptions = {
        schemaInit?: Partial<EditorSchema>
        /** 主效应器 */
        mainEffector?: Required<MainEffector>
        /** 撤回栈效应器 */
        undoEffector?: UndoEffector
        /** 编辑器插件 */
        plugins?: EffitorPlugin[]
        /** 配置项 */
        config?: Partial<EditorConfig>
    }
    /**
     * 编辑器插件
     */
    export type EffitorPlugin = {
        /** 
         * 将注册在编辑器上的效应器列表  
         * 按顺序绑定, 并按顺序触发响应,   
         * 对应handler返回true时将跳过后续效应,   
         * `ctx.skipDefault标记为true`时将跳过内置效应
         */
        readonly effector: Effector
        readonly elements: EffectElementCtor[]
        // readonly handlers: EffectHandle[]
        /**
         * 插件注册时执行, 一般用于extentEtElement()给效应元素添加handler  
         * 也可让插件给EffectElement覆盖或增强绑定的 builtinHandler的内置beforeinput效应  
         * ```
         *  registry() {
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
        readonly registry?: (...args: any[]) => void
    }
    /**
     * 撤回栈插件效应器类型
     */
    export type UndoEffector = Effector & { commandUndoHandler: CommandUndoHandler }


    /* -------------------------------------------------------------------------- */
    /*                                  effector                                  */
    /* -------------------------------------------------------------------------- */

    export type KeyboardCode = `${KeyboardCodeEnum}`
    export type KeyboardKey = `${KeyboardKeyEnum}`
    export type InputType = `${InputTypeEnum}`
    export type EtInputEvent = InputEvent & { inputType: InputType }

    export const MIMEType = {
        /** effitor复制元信息, 以json字符串存储 */
        ET_COPY_METADATA: 'application/effitor.copy.metadata',
        ET_TEXT_HTML: 'text/et-html',

        TEXT_PLAIN: 'text/plain',
        TEXT_HTML: 'text/html',
    } as const;
    type DataTransferFormat = typeof MIMEType[keyof typeof MIMEType]
    export type EtDataTransfer = DataTransfer & {
        getData(format: DataTransferFormat): string;
        setData(format: DataTransferFormat, data: string): void;
    }
    export type EtClipboardEvent = ClipboardEvent & { clipboardData: EtDataTransfer }

    export type KeyboardAction = (ev: KeyboardEvent, ctx: EditorContext) => booleanvoid
    export type InputAction = (ev: InputEvent, ctx: EditorContext) => booleanvoid
    export type ClipboardAction = (e: ClipboardEvent & { clipboardData: DataTransfer }, c: EditorContext) => booleanvoid
    export type SelChangeAction = (e: Event, c: EditorContext) => void

    export type KeyboardSolver = Partial<Record<string, KeyboardAction>>
    export type InputSolver = Partial<Record<string, InputAction>>
    // export type KeyboardCodeSolver = Partial<Record<KeyboardCode, KeyboardAction> & { default: KeyboardAction }>
    export type KeyboardKeySolver = Partial<Record<KeyboardKey, KeyboardAction> & { default: KeyboardAction }>
    export type InputTypeSolver = Partial<Record<Exclude<InputType, 'undefined'>, InputAction> & { default: InputAction }>
    export type MainInputTypeSolver = InputTypeSolver & { '': InputAction }
    export type HTMLEventSolver = { [k in keyof HTMLElementEventMap]?: (ev: HTMLElementEventMap[k], ctx: EditorContext) => void }

    /** 效应器, 响应用户操作, 执行对应Handler */
    export interface Effector extends Partial<EffectorSolvers> {
        // [k: string]: any,
        /** 编辑器mount一个div时执行 */
        readonly mounted?: (el: HTMLDivElement, ctx: Et.EditorContext) => void
        /** 卸载一个div前执行 */
        readonly beforeUnmount?: (el: HTMLDivElement, ctx: Et.EditorContext) => void
        // 自定义事件监听器列表
        // readonly customEventListeners?: { [eventName: string]: (ev: Event, ctx: EditorContext) => void }
    }
    type EffectorSolvers = {
        /** keydown中处理按键响应 ev.key -> action */
        readonly keydownSolver: KeyboardKeySolver
        /** keyup中处理按键响应 */
        readonly keyupSolver: KeyboardKeySolver
        /** beforeinput中处理inputType */
        readonly beforeInputSolver: InputSolver
        /** input中处理inputType */
        readonly afterInputSolver: InputSolver
        // html事件处理器
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
    }
    export type EffectorConfigs = {
        /** 自定义元素, 统一注册到customElements */
        readonly etElementCtors: EffectElementCtor[]
    } & {
        [K in keyof EffectorSolvers as `${K}s`]: EffectorSolvers[K][]
    }
    /** 主效应器 */
    export interface MainEffector {
        readonly keydownSolver: MainKeydownSolver
        readonly keyupSolver: MainKeyupSolver
        readonly beforeInputSolver: MainBeforeInputSolver
        readonly afterInputSolver: MainAfterInputSolver
    }
    /**
     * 效应拦截器, 作为EffectElement的一个属性, 仅当返回true时, 阻止该效应
     */
    export type EffectBlocker = (effect: string) => boolean


    /* -------------------------------------------------------------------------- */
    /*                                   element                                  */
    /* -------------------------------------------------------------------------- */

    // 别名
    export type EtElement = EffectElement
    export type EtElementCtor = EffectElementCtor

    type EtShadowListenerMap = {
        keydown: (e: KeyboardEvent) => any,
        keyup: (e: KeyboardEvent) => any,
        beforeinput: (e: InputEvent) => any,
        input: (e: InputEvent) => any,
    }
    export interface EtShadow extends ShadowRoot {
        addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (e: HTMLElementEventMap[K]) => void, options?: boolean | AddEventListenerOptions): void
        addEventListener<K extends keyof EtShadowListenerMap>(type: K, listener: EtShadowListenerMap[K], options?: boolean | AddEventListenerOptions): void;
        addEventListener<K extends keyof ShadowRootEventMap>(type: K, listener: (this: ShadowRoot, ev: ShadowRootEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
        addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;

        getElementById(elementId: string): HTMLElement | null;
    }

    export type ElementCallbacks = {
        connectedCallback?(this: EtElement): void
        disconnectedCallback?(this: EtElement): void
        adoptedCallback?(this: EtElement): void
        attributeChangedCallback?(this: EtElement, name: string, oldValue: string, newValue: string): void
    }

    type Letter = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z'
    export type ElName = `et-${Letter}${Lowercase<string>}`
    export type ElType = `${BuiltinElType}`
    export type ElStyle = Partial<{
        [k in keyof CSSStyleDeclaration as (CSSStyleDeclaration[k] extends string ? k : never)]: CSSStyleDeclaration[k]
    }>
    /**
     * 自定义EtElement设置属性
     * expandable
     */
    export interface ElAttrs {
        // [k: string]: string | undefined
        part: string
        href: string
        contenteditable: 'plaintext-only' | 'false' | '' | 'true'
        draggable: 'true' | 'false'
    }

    type BuiltinEtElement = {
        [BuiltinElName.ET_APP]: EtEditorElement
        [BuiltinElName.ET_BODY]: EtBodyElement
        [BuiltinElName.ET_RICHTEXT]: EtRichTextElement
        [BuiltinElName.ET_PLAINTEXT]: EtPlainTextElement
        [BuiltinElName.ET_PARAGRAPH]: EtParagraphElement
        [BuiltinElName.ET_COMPONENT]: EtComponentElement
    }
    /**
     * 定义的EtElement映射表, 用于document.createElement()的提示  
     * expandable
     */
    export interface DefinedEtElementMap extends BuiltinEtElement {
    }

    export const CssClass = {
        /** 当前活跃 */
        Active: 'active',
        /** 当前被拖拽目标 */
        Dragging: 'dragging',
        /** 当前拖拽悬浮 */
        Dragover: 'dragover',
        /** 当前元素被选择 */
        Selected: 'selected',

        /** 用于et-body 选区为Range, 需通过ctx.range.collpased==false判断, Selection.isCollapsed在shadowRoot内不准 */
        SelectionRange: 'selection-range',

        /** 用于et-p 标记为标题段落 */
        Heading: 'heading',
    } as const;

    /* -------------------------------------------------------------------------- */
    /*                                   handler                                  */
    /* -------------------------------------------------------------------------- */

    export const BUILTIN_EFFECT_PREFFIX = BuiltinConfig.BUILTIN_EFFECT_PREFFIX

    /** Effect处理器 */
    export type EffectHandler = (...args: any[]) => any
    export type InputEffectHandler = (ctx: EditorContext, ev: InputEvent) => void
    /**
     * InputType效应
     */
    export type InputTypeEffect = `${BuiltinConfig.BUILTIN_EFFECT_PREFFIX}${InputType}`
    export type DefaultEffectHandlerMap = Record<InputTypeEffect, InputEffectHandler>
    /** 
     * 绑在类名上的效应处理器声明  
     * InputType的Effect使用 `E+inputType`命名
     * 自定义Effect小写字母开头
     * expandable
     */
    export interface EffectHandlerDeclaration extends DefaultEffectHandlerMap {
        // [e: string]: EffectHandler
        replaceText: (ctx: EditorContext, data: string, targetRange: TextStaticRange, setCaret?: boolean) => boolean
        /**
         * 双击空格跳出样式节点, 在keydown内触发
         */
        dblSpace: (ctx: EditorContext) => void
        // /**
        //  * 插入链接
        //  */
        // insertLink: (ctx: EditorContext, link: EtLink) => boolean
        /**
         * 键入'# ' 把当前段落设置为一个atx标题（仅支持一层）, 
         */
        atxHeading: (ctx: EditorContext) => boolean
    }
    /** 效应触发器 */
    export interface EffectInvoker {
        /** 获取EffectElement的类对象（构造函数） */
        readonly getEffectElCtor: (el: EffectElement) => EffectElementCtor
        /** 调用EffectElement类对象上绑定的Effect Handler */
        invoke(e: keyof DefaultEffectHandlerMap, ...args: Parameters<InputEffectHandler>): ReturnType<InputEffectHandler>
        invoke<E extends keyof EffectHandlerDeclaration>(e: E, ...args: EffectHandlerDeclaration[E] extends (...args: infer P) => any ? P : []): ReturnType<EffectHandlerDeclaration[E]> | booleanvoid
    }


    /** 更新dom统一命令 */
    export const CmdType = {
        Insert_Node: 'Insert_Node',
        Remove_Node: 'Remove_Node',
        Replace_Node: 'Replace_Node',
        Insert_Text: 'Insert_Text',
        /**
         * 构建此命令时, 请确保deleteRange是始末都在同一#text节点的Range
         */
        Delete_Text: 'Delete_Text',
        Replace_Text: 'Replace_Text',
        /**
         * 该命令只做记录, 用户操作时不执行（由不可取消的beforeinput事件插入）,   
         *  撤回栈记录事务时, 将连续的insertCompositionText合并成insertText（或insertNode插入#text节点）,    
         *  redo时就执行insertText（或insertNode）; 相应的其逆命令为deleteText（deleteNode）
         */
        Insert_Composition_Text: 'Insert_Composition_Text',
        Insert_Content: 'Insert_Content',
        Remove_Content: 'Remove_Content',
        /**
         * 函数式命令，仅使用三个回调，用于那些不修改dom但又需要可撤销的操作
         *   如 更改缩进
         * * 回调不要与具体的dom节点相关, 否则可能发生异常, 如命令撤回时 虽然节点信息不变, 但已经不是原来那个节点了
         */
        Functional: 'Functional',
    } as const;
    export interface Cmd {
        readonly type: typeof CmdType[keyof typeof CmdType],
        /**
         * 命令执行完毕后是否重新定位光标
         */
        setCaret?: boolean,
        /** 
         * [0]: 添加命令时光标位置
         * [1]: 执行命令后光标位置, 包含范围, 用于更新Selection */
        readonly targetRanges: [StaticRange, StaticRange?],
    }
    export interface CmdInsertNode extends Cmd {
        readonly type: typeof CmdType.Insert_Node
        readonly node: HTMLElement | Text
        /**
         * node要插入的位置, 必须是一个与node未来父节点相关的Range, 而不能与node的未来兄弟节点相关
         */
        readonly insertAt: StaticRange,
        readonly targetRanges: [StaticRange, StaticRange],
    }
    export interface CmdRemoveNode extends Cmd {
        readonly type: typeof CmdType.Remove_Node
        readonly node: HTMLElement | Text
        /**
         * node所在的位置, 需要与node无关（而与node的父节点相关）, 用于构建逆命令
         */
        readonly removeAt: StaticRange,
        readonly targetRanges: [StaticRange, StaticRange],
    }
    export interface CmdReplaceNode extends Cmd {
        readonly type: typeof CmdType.Replace_Node
        readonly node: HTMLElement | Text
        readonly newNode: HTMLElement | Text
        /**
         * node 所在位置, 与node无关
         */
        readonly replaceAt: StaticRange
        readonly targetRanges: [StaticRange, StaticRange]
    }
    export interface CmdInsertText extends Cmd {
        readonly type: typeof CmdType.Insert_Text
        readonly text: Text,
        readonly offset: number,
        /** 将插入的文本 */
        readonly data: string
        /** 插入位置依赖于[0], 因此该SR必须与#text节点相关 */
        readonly targetRanges: [StaticRange, StaticRange]
    }
    export interface CmdDeleteText extends Cmd {
        readonly type: typeof CmdType.Delete_Text
        /**
         * 根据deleteRange范围内文本  
         */
        readonly data: string
        /**
         * 删除方向, Backspace删除时true, Delete时false; 用于合并命令时字符串的拼接方向  
         * 作为insertText的逆命令始终为true
         */
        readonly isBackward: boolean
        /**
         * 一般为beforeinput事件的getTargetRanges()[0]  
         */
        readonly deleteRange: StaticRange,
        readonly targetRanges: [StaticRange, StaticRange]
    }
    export interface CmdReplaceText extends Cmd {
        readonly type: typeof CmdType.Replace_Text
        readonly text: Text
        readonly offset: number
        readonly data: string
        readonly replacedData: string
        readonly targetRanges: [StaticRange, StaticRange]
    }
    export interface CmdInsertCompositionText extends Cmd {
        readonly type: typeof CmdType.Insert_Composition_Text
        readonly data: string
        /**
         * [0]是插入文本的位置; 当输入法开始输入时光标位置不在#text节点上, 浏览器会自动插入一个#text（无法阻止）
         */
        readonly targetRanges: [StaticRange,]
    }
    export interface CmdInsertContent extends Cmd {
        readonly type: typeof CmdType.Insert_Content
        /**
         * 为避免合并边缘节点, fragment必须是完整的节点片段
         */
        readonly fragment: DocumentFragment
        /**
         * fragment插入到的位置, collapsed的StaticRange; 应与fragment内任何节点无关
         */
        readonly insertAt: StaticRange
        /**
         * 一个fragment.childNodes的索引, 当命令结束光标需要定位到该节点前时, 需配置该属性,  
         * 命令执行时构造StaticRange并覆盖targetRanges[1]  
         * 否则光标落点直接用targetRanges[1]
         */
        readonly collapseTo?: number
        /**
         * 刚好完全包含插入到fragment内容的范围, 用于逆命令的removeRange; 
         * *在命令执行时必须赋值该属性
         */
        fragmentRange?: StaticRange
        readonly targetRanges: [StaticRange, StaticRange]
    }
    export interface CmdRemoveContent extends Cmd {
        readonly type: typeof CmdType.Remove_Content
        /**
         * 删除的内容范围, 必须包含完整的节点, 并且与被移除的任何节点不相关  
         * 此命令撤回时, content将插回 removeRange 的startContainer/offset的位置  
         */
        readonly removeRange: StaticRange
        /**
         * 此项用于暂存removeRange extract出来的片段, 用于逆命令的fragment; 命令执行时必须赋值该属性
         */
        removeFragment?: DocumentFragment
        readonly targetRanges: [StaticRange, StaticRange]
    }
    export interface CmdFunctional extends Cmd {
        readonly type: typeof CmdType.Functional
        readonly targetRanges: [StaticRange, StaticRange]
    }

    export type CmdCallback = (ctx: EditorContext) => void
    export type CmdCallbackInit = {
        redoCallback?: CmdCallback
        undoCallback?: CmdCallback
        finalCallback?: CmdCallback
    }

    export type Command = CmdCallbackInit & (
        | CmdInsertNode | CmdRemoveNode | CmdReplaceNode
        | CmdInsertText | CmdDeleteText | CmdReplaceText
        | CmdInsertCompositionText
        | CmdInsertContent | CmdRemoveContent
        | CmdFunctional
    )
    export type CommandMap = {
        [k in Command['type']]: Extract<Command, { type: k }>
    }
    export type CommandInit = {
        [k in keyof CommandMap]: Prettify<Omit<CommandMap[k], 'type'>>
    }
    export type CommandCreator = <T extends keyof CommandMap>(type: T, init: CommandInit[T]) => CommandMap[T]
    /**
     * 命令控制器
     */
    export interface CommandHandler {
        /** 命令队列 */    // fixme 此项不应该暴露
        readonly cmds: Command[]
        /** 是否在一个命令组事务内;  */
        readonly inTransaction: boolean
        /** 添加一个命令到队列中 */
        push(this: CommandHandler, cmd: Command): void
        push<T extends keyof CommandMap>(this: CommandHandler, type: T, init: CommandInit[T]): void

        /** 
         * 执行命令更新dom; 当cmds未提供时, 执行this.cmds 并清空
         * @returns 是否执行了至少一个命令
         */
        handle(this: CommandHandler, cmds?: Command[]): boolean
        /** 
         * 若不在事务内, 将当前记录栈内命令合并成事务添加到撤回栈  
         * @returns 是否 commit 了至少一个命令
         */
        commit(this: CommandHandler): boolean
        /** 
         * 撤回当前命令队列内所有命令（已执行）并丢弃
         * @returns 是否撤销了至少一个命令
         */
        discard(this: CommandHandler): boolean
        /**
         * 开启事务（开启前自动commit先前命令）
         */
        startTransaction(this: CommandHandler): void
        /**
         * 关闭事务, 并自动commit命令
         */
        closeTransaction(this: CommandHandler): void
        /**
         * 确认所有事务，执行final回调，清空撤回栈; 用户退出页面前应自动执行该函数
         */
        commitAll(this: CommandHandler, ctx: Et.EditorContext): void
    }
    export type CommandUndoHandler = {
        handle(this: CommandHandler, ctx: EditorContext, cmds?: Command[]): boolean
        commit(this: CommandHandler, ctx: EditorContext): boolean
        discard(this: CommandHandler, ctx: EditorContext): boolean
        commitAll(this: CommandHandler, ctx: EditorContext): void
    }

}

/**
 * KeyboardEvent.code; 
 */
const enum KeyboardCodeEnum {
    F1 = 'F1',
    F2 = 'F2',
    F3 = 'F3',
    F4 = 'F4',
    F5 = 'F5',
    F6 = 'F6',
    F7 = 'F7',
    F8 = 'F8',
    F9 = 'F9',
    F10 = 'F10',
    F11 = 'F11',
    F12 = 'F12',
    Numpad0 = 'Numpad0',
    Numpad1 = 'Numpad1',
    Numpad2 = 'Numpad2',
    Numpad3 = 'Numpad3',
    Numpad4 = 'Numpad4',
    Numpad5 = 'Numpad5',
    Numpad6 = 'Numpad6',
    Numpad7 = 'Numpad7',
    Numpad8 = 'Numpad8',
    Numpad9 = 'Numpad9',
    NumpadDecimal = 'NumpadDecimal',
    NumpadEnter = 'NumpadEnter',
    NumpadAdd = 'NumpadAdd',
    NumpadSubtract = 'NumpadSubtract',
    NumpadMultiply = 'NumpadMultiply',
    NumpadDivide = 'NumpadDivide',
    Digit0 = 'Digit0',
    Digit1 = 'Digit1',
    Digit2 = 'Digit2',
    Digit3 = 'Digit3',
    Digit4 = 'Digit4',
    Digit5 = 'Digit5',
    Digit6 = 'Digit6',
    Digit7 = 'Digit7',
    Digit8 = 'Digit8',
    Digit9 = 'Digit9',
    KeyA = 'KeyA',
    KeyB = 'KeyB',
    KeyC = 'KeyC',
    KeyD = 'KeyD',
    KeyE = 'KeyE',
    KeyF = 'KeyF',
    KeyG = 'KeyG',
    KeyH = 'KeyH',
    KeyI = 'KeyI',
    KeyJ = 'KeyJ',
    KeyK = 'KeyK',
    KeyL = 'KeyL',
    KeyM = 'KeyM',
    KeyN = 'KeyN',
    KeyO = 'KeyO',
    KeyP = 'KeyP',
    KeyQ = 'KeyQ',
    KeyR = 'KeyR',
    KeyS = 'KeyS',
    KeyT = 'KeyT',
    KeyU = 'KeyU',
    KeyV = 'KeyV',
    KeyW = 'KeyW',
    KeyX = 'KeyX',
    KeyY = 'KeyY',
    KeyZ = 'KeyZ',
    BackQuote = 'BackQuote',
    Minux = 'Minux',
    Equal = 'Equal',
    BracketLeft = 'BracketLeft',
    BracketRight = 'BracketRight',
    Backslash = 'Backslash',
    Semicolon = 'Semicolon',
    Quote = 'Quote',
    Comma = 'Comma',
    Period = 'Period',
    Slash = 'Slash',
    Delete = 'Delete',
    Backspace = 'Backspace',
    Enter = 'Enter',
    Space = 'Space',
    Tab = 'Tab',
    ArrowDown = 'ArrowDown',
    ArrowLeft = 'ArrowLeft',
    ArrowRight = 'ArrowRight',
    ArrowUp = 'ArrowUp',
    Escape = 'Escape',
    CtrlLeft = 'CtrlLeft',
    CtrlRight = 'CtrlRight',
    AltLeft = 'AltLeft',
    AltRight = 'AltRight',
    ShiftLeft = 'ShiftLeft',
    ShiftRight = 'ShiftRight',
    MetaLeft = 'MetaLeft',
    MetaRight = 'MetaRight',
}
/**
 * KeyboardEvent.key枚举; 小写字母使用大写字母映射
 */
const enum KeyboardKeyEnum {
    A = "A",
    B = "B",
    C = "C",
    D = "D",
    E = "E",
    F = "F",
    G = "G",
    H = "H",
    I = "I",
    J = "J",
    K = "K",
    L = "L",
    M = "M",
    N = "N",
    O = "O",
    P = "P",
    Q = "Q",
    R = "R",
    S = "S",
    T = "T",
    U = "U",
    V = "V",
    W = "W",
    X = "X",
    Y = "Y",
    Z = "Z",
    Num0 = "0",
    Num1 = "1",
    Num2 = "2",
    Num3 = "3",
    Num4 = "4",
    Num5 = "5",
    Num6 = "6",
    Num7 = "7",
    Num8 = "8",
    Num9 = "9",
    '!' = '!',
    '@' = '@',
    '#' = '#',
    '$' = '$',
    '%' = '%',
    '^' = '^',
    '&' = '&',
    '*' = '*',
    '(' = '(',
    ')' = ')',
    '`' = "`",
    '~' = "~",
    '-' = "-",
    '_' = "_",
    '=' = "=",
    '+' = "+",
    '[' = "[",
    '{' = "{",
    ']' = "]",
    '}' = "}",
    '\\' = "\\",
    '|' = "|",
    ';' = ";",
    ':' = ":",
    "'" = "'",
    '"' = '"',
    ',' = ",",
    '<' = "<",
    '.' = ".",
    '>' = ">",
    '/' = "/",
    '?' = "?",
    Space = ' ',
    Tab = 'Tab',
    Enter = 'Enter',
    Backspace = 'Backspace',
    Delete = 'Delete',
    Ctrl = 'Ctrl',
    Shift = 'Shift',
    Alt = 'Alt',
    Meta = 'Meta',
    ArrowUp = 'ArrowUp',
    ArrowDown = 'ArrowDown',
    ArrowLeft = 'ArrowLeft',
    ArrowRight = 'ArrowRight',
    PageUp = 'PageUp',
    PageDown = 'PageDown',
    Home = 'Home',
    End = 'End',
    Escape = 'Escape',
    F1 = 'F1',
    F2 = 'F2',
    F3 = 'F3',
    F4 = 'F4',
    F5 = 'F5',
    F6 = 'F6',
    F7 = 'F7',
    F8 = 'F8',
    F9 = 'F9',
    F10 = 'F10',
    F11 = 'F11',
    F12 = 'F12',
}
/**
 * valid inputType of InputEvent  
 * `ref.`https://www.w3.org/TR/input-events-2/#interface-InputEvent-Attributes 
 */
const enum InputTypeEnum {
    /** 未初始化 或 不是规定以内的值; 该值作为保留, 其对应真正的inputType为空串"" 仅MainInputTypeSolver可实现 */
    'undefined' = 'undefined',
    /** 插入字符 */
    insertText = "insertText",
    /** 替换字符 */
    // insertReplacementText = 'insertReplacementText',
    /** 输入法插入字符 */
    insertCompositionText = 'insertCompositionText',
    /** 
     * chrome 120 不支持, 将被转为""
     * 插入链接, 在effitor中有如下规定:     
     * ev.data 一个EtLink对象的json字符串
     */
    // insertLink = 'insertLink',
    /** Enter换行 */
    insertParagraph = 'insertParagraph',
    /** Shift+Enter换行 */
    insertLineBreak = 'insertLineBreak',
    /** Backspace删除 */
    deleteContentBackward = 'deleteContentBackward',
    /** Delete删除 */
    deleteContentForward = 'deleteContentForward',
    /** Ctrl+Backspace删除 */
    deleteWordBackward = 'deleteWordBackward',
    /** Ctrl+Delete删除 */
    deleteWordForward = 'deleteWordForward',
    /** 拖拽删除 */
    // deleteByDrag = 'deleteByDrag',
    /** 拖拽插入 */
    // insertFromDrop = 'insertFromDrop',
    /** 
     * 插入粘贴, 在effitor中有如下规定:   
     * 0. 若Selection为Range, 需先手动发送一个deleteContentBackward的beforeinput让光标collapsed;  (checkRemoveSelectionToCollapsed)    
     * 1. 粘贴文本或富文本
     * ```
     * ev.data: 要粘贴内容的html文本
     *      为安全起见，onpaste仅从clipboardData中读取text/et-html, text/plain的内容
     * ev.dataTransfer: null
     * ```
     * 2. 粘贴图片
     * ```
     * ev.data: null
     * ev.dataTransfer: 包含复制到剪切板的图片
     * ```
     */
    insertFromPaste = 'insertFromPaste',
    /** 剪切删除 */
    deleteByCut = 'deleteByCut',
    /** 光标Ctrl+x剪切所在行 */
    // deleteEntireSoftLine = 'deleteEntireSoftLine',
    /** Ctrl+z撤销 */
    historyUndo = 'historyUndo',
    /** Ctrl+y重做 */
    historyRedo = 'historyRedo',
    /** 加粗 */
    // formatBold = 'formatBold',
    /** 斜体 */
    // formatItalic = 'formatItalic',
    /** 下划线 */
    // formatUnderline = 'formatUnderline',
    /** 删除线 */
    // formatStrikeThrough = 'formatStrikeThrough',
    /** 增加缩进（仅段落 */
    formatIndent = 'formatIndent',
    /** 减少缩进（仅段落 */
    formatOutdent = 'formatOutdent',
    // formatFontName = 'formatFontName',
    // formatBackColor = 'formatBackColor',
    // formatFontColor = 'formatFontColor',
    // formatRemove = 'formatRemove',
}