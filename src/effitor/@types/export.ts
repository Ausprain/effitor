/** 项目对外导出的类型声明和常量
 * @author: Ausprain 
 * @email: ausprain@qq.com 
 * @date: 2024-04-20 20:09:55 
 */

import { AbbrInit as _AbbrInit } from '../plugins/abbr';
import { BuiltinConfig, BuiltinElName, BuiltinElType, CmdTypeEnum, CssClassEnum, HtmlCharEnum, MIMETypeEnum } from './constant';
import { DOM, LowerLetter, Prettify } from './declare';

export namespace Effitor {

    export declare namespace Editor {
        /**
         * 编辑器
         */
        interface Editor {
            /**
             * 在一个div下绑定一个辑器
             */
            readonly mount: (el: HTMLDivElement) => void;
            readonly unmount: (el: HTMLDivElement) => void;
        }
        /**
         * 编辑器配置
         */
        type Config = {
            /** 缩进margin-left像素值 */
            INDENT_PIXEL: number;
            /** 页面最大缩进数 */
            MAX_INDENT: number;
            /** 编辑区字体大小 */
            FONT_SIZE: number;
            /** 撤回栈长度 */
            UNDO_LENGTH: number;
            /** 链接url最大有效长度 */
            ALLOW_LINK_URL_MAX_LENGTH: number;
        };
        /**
         * 编辑器上下文对象
         */
        interface Context {
            /** symbol索引, 用于给扩展effector添加自定义属性 */
            [k: symbol]: any;
            readonly schema: Schema;
            /** 当前活跃编辑器所属的div, root.host的父节点 */
            el: HTMLDivElement;
            /** 当前触发编辑逻辑的ShadowRoot */
            root: ShadowRoot & {
                getSelection?: () => Selection | null;
            };
            /** 当前编辑区 */
            body: Element.EtBodyElement;
            /** 当前`Selection`对象 */
            selection: Selection;
            /** 对应的`Range`对象 */
            range: Range;
            /** 当且仅当`Selection.anchorNode`是TextNode时非空  */
            node: DOM.NullableText;
            /** 上一个`text node` */
            oldNode: DOM.NullableText;
            /** 当前效应元素 */
            effectElement: EtElement;
            /** 是否EffectElement开端, 当且仅当effectElement非空且其textContent=='' */
            /** 当前光标所在段落, 段落驱动的, 光标只能落在段落里 */
            paragraphEl: Element.EtParagraphElement;
            /** 光标在编辑区内 */
            /** 当前按下的按键, 在keydown事件中, 为上一个按下的按键; 在keydown结束时赋值当前按键 */
            currDownKey?: string;
            /** 上一个抬起的按键; 111ms后重设为undefined; 若在keydown时光标为Range状态, 则设置为null, 并在keyup中为null时不记录该按键 */
            prevUpKey?: string | null;
            /** 是否按住按键 */
            /** 当前按键是否在输入法会话中按下, 该值等于keydown事件的isComposing, 触发输入法会话的那一下keydown为false */
            /** 是否处于输入法会话中, 即compositionstart与compositionend之间 */
            inCompositionSession: boolean;
            /** 记录composingupdate次数, 用于跳过后续update导致的selectionchange; 当第一次触发输入法事务时, count=1 */
            compositionupdateCount: number;
            /** 跳过n次`selectionchange`回调；如：在手动插入一个`zws`时 +1 */
            /** 是否跳过默认Effector, (在keydown/keyup/beforeinput/input中设置为true时, 都将跳过mainEffector的对应事件监听器) */
            skipDefault: boolean;
            readonly forceUpdate: (this: Context) => void;
            readonly effectInvoker: Handler.EffectInvoker;
            readonly commandHandler: Handler.CommandHandler;
            /** 编辑器配置 */
            readonly config: Config;
        }
        interface Schema {
            readonly editor: Element.EtEditorCtor;
            readonly body: Element.EtBodyCtor;
            readonly paragraph: Element.EtParagraphCtor;
        }
        /**
         * 编辑器插件
         */
        type Plugin = {
            /** 插件唯一名字 */
            readonly name: string;
            /**
             * 将注册在编辑器上的效应器列表
             * 按顺序绑定, 并按顺序触发响应,
             * 对应handler返回true时将跳过后续效应,
             * `ctx.skipDefault标记为true`时将跳过内置效应
             */
            readonly effector: Effitor.Effector.Effector;
            /**
             * 自定义的效应元素列表
             */
            readonly elements?: EtElementCtor[];
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
            readonly registry?: (ctx: Context) => void;
        };
        /**
         * 编辑器初始化选项
         */
        type CreateEditorOptions = {
            schemaInit?: Partial<Schema>;
            /** 主效应器 */
            mainEffector?: Required<Effector.MainEffector>;
            /** 编辑器插件 */
            plugins?: Plugin[];
            /** 编辑器配置项 */
            config?: Partial<Config>;
        };
    }
    export declare namespace Effector {

        /** 效应器, 响应用户操作, 执行对应Handler */
        interface Effector extends Partial<Solvers> {
            /** 编辑器mount一个div时执行 */
            readonly mounted?: (el: HTMLDivElement, ctx: Editor.Context) => void;
            /** 卸载一个div前执行 */
            readonly beforeUnmount?: (el: HTMLDivElement, ctx: Editor.Context) => void;
        }
        type Solvers = {
            /** keydown中处理按键响应 ev.key -> action */
            readonly keydownSolver: KeyboardKeySolver;
            /** keyup中处理按键响应 */
            readonly keyupSolver: KeyboardKeySolver;
            /** beforeinput中处理inputType */
            readonly beforeInputSolver: InputTypeSolver;
            /** input中处理inputType */
            readonly afterInputSolver: InputTypeSolver;
            readonly htmlEventSolver: HTMLEventSolver;
            /** 复制或剪切时添加数据到clipboardData */
            readonly copyCallback: ClipboardAction;
            /**
             * 粘贴回调,
             */
            readonly pasteCallback: ClipboardAction;
            /**
             * selectionchange回调
             *  `document`的`selectionchange`事件监听器由编辑器focus时创建, blur时移除;
             *  effector的selchange回调统一在该监听器内执行
             */
            readonly selChangeCallback: SelChangeAction;
        };

        /** 主效应器 */
        interface MainEffector {
            readonly keydownSolver: MainKeydownSolver;
            readonly keyupSolver: MainKeyupSolver;
            readonly beforeInputSolver: MainBeforeInputTypeSolver;
            readonly afterInputSolver: MainAfterInputTypeSolver;
        }
        // /** 撤回栈插件效应器类型 */
        // type UndoEffector = Effector & {
        //     undoLength: number;
        //     commandUndoHandler: Handler.CommandUndoHandler;
        // };

        type KeyboardAction = (ev: KeyboardEvent, ctx: Editor.Context) => boolean | void;
        type InputAction = (ev: DOM.InputEvent, ctx: Editor.Context) => boolean | void;
        type ClipboardAction = (e: DOM.ClipboardEvent, c: Editor.Context) => boolean | void;
        type SelChangeAction = (e: Event, c: Editor.Context) => void;
        type KeyboardSolver = Partial<Record<string, KeyboardAction>>;
        type InputSolver = Partial<Record<string, InputAction>>;
        /** keydown/keyup中处理按键响应 ev.key -> action */
        type KeyboardKeySolver = Partial<Record<DOM.KeyboardKey, KeyboardAction> & {
            /** 默认响应, 即当ev.key未声明在solver中时, 执行该响应 */
            default: KeyboardAction;
        }>;
        /** 同KeyboardKeySolver, ev.inputType -> action */
        type InputTypeSolver = Partial<Record<Exclude<DOM.InputType, 'undefined'>, InputAction> & {
            default: InputAction;
        }>;
        type MainInputTypeSolver = InputTypeSolver & {
            /** 非法的inputType会自动替换为"", 走此映射" */
            '': InputAction;
        };
        type HTMLEventSolver = {
            [k in keyof HTMLElementEventMap]?: (ev: HTMLElementEventMap[k], ctx: Editor.Context) => void;
        };

        class MainKeydownSolver implements KeyboardSolver {
            [k: string]: KeyboardAction | undefined;
        }
        class MainKeyupSolver implements KeyboardSolver {
            [k: string]: KeyboardAction | undefined;
        }
        class MainBeforeInputTypeSolver implements InputTypeSolver {
            [k: string]: InputAction | undefined;
        }
        class MainAfterInputTypeSolver implements InputTypeSolver {
            [k: string]: InputAction;
        }

    }
    export declare namespace Element {
        type ElName = `et-${LowerLetter}${Lowercase<string>}`;
        type ElType = `${BuiltinElType}`;
        type ElStyle = Partial<{ [k in keyof CSSStyleDeclaration as (CSSStyleDeclaration[k] extends string ? k : never)]: CSSStyleDeclaration[k] }>;
        /**
         * 自定义EtElement设置属性
         * @expandable
         */
        interface ElAttrs {
            part: string;
            href: string;
            contenteditable: 'plaintext-only' | 'false' | '' | 'true';
            draggable: 'true' | 'false';
        }
        type ElementCallbacks = {
            connectedCallback?(this: EtElement): void;
            disconnectedCallback?(this: EtElement): void;
            adoptedCallback?(this: EtElement): void;
            attributeChangedCallback?(this: EtElement, name: string, oldValue: string, newValue: string): void;
        };

        /** 效应拦截器, 作为EffectElement的一个属性, 仅当返回true时, 阻止该效应 */
        type EffectBlocker = (effect: string) => boolean;

        /* ---------------------------- builtin elements ---------------------------- */

        /**
         * 效应元素, 通过绑在类名上的 EffectHandle 处理编辑器逻辑
         */
        abstract class EffectElement extends HTMLElement implements ElementCallbacks {
            /** 绑在类名上的效应处理器 */
            /** 元素名, 应与实例的tagName或nodeName的小写完全相同, 即Element.localName */
            static readonly elName: ElName;
            /** style对象, 用于构建<style>标签字符串, 插入到shadownRoot中的内置样式表, 为元素设置内定样式; 最终以`${elName} { ... }`形式追加到cssText中 */
            static readonly cssStyle: ElStyle;
            /** style字符串, 作为cssStyle的补充, 如添加:focus等的样式 */
            static readonly cssText: string;
            static readonly observedAttributes: string[];
            /** 元素类型, 绑在this上用于判断是否是效应元素 */
            readonly elType: ElType;
            /** 效应拦截器, 当非空 且执行返回true时, 阻止对应效应 */
            effectBlocker?: EffectBlocker;
            connectedCallback?(this: EffectElement): void;
            disconnectedCallback?(this: EffectElement): void;
            adoptedCallback?(this: EffectElement): void;
            attributeChangedCallback?(this: EffectElement, name: string, oldValue: string, newValue: string): void;
            /** 替换当前节点, 并转移其后代到新节点; 在DocumentFragment内使用 */
            replaceToNativeElement?(this: EffectElement): void;
            /** 光标位于当前Effect元素的直接子孙内（即中间无其他Effect元素）时调用; 即赋值到ctx.effectElement时调用 */
            focusinCallback?(_ctx: Editor.Context): void;
            /** 当前Effect元素从ctx.effectElement移除（被赋新值）时调用 */
            focusoutCallback?(_ctx: Editor.Context): void;
        }
        type EffectElementCtor = typeof EffectElement;
        /**
         * 编辑区
         */
        class EtBodyElement extends EffectElement {
            static readonly elName = BuiltinElName.ET_BODY;
            static readonly cssStyle: ElStyle;
            connectedCallback(): void;
            replaceToNativeElement(): void;
        }
        type EtBodyCtor = typeof EtBodyElement;
        /**
         * 组件节点
         */
        class EtComponentElement extends EffectElement {
            static readonly elName: ElName;
            /**
             * 是否嵌套contenteditable, 即组件内是否有contenteditable=true的节点
             */
            readonly nestedEditable: boolean;
            readonly elType: ElType;
            connectedCallback?(): void;
            replaceToNativeElement?(): void;
        }
        type EtComponentCtor = typeof EtComponentElement;
        /**
         * 编辑器主体
         */
        class EtEditorElement extends EffectElement {
            static readonly elName = BuiltinElName.ET_APP;
            connectedCallback(this: EffectElement): void;
        }
        type EtEditorCtor = typeof EtEditorElement;
        /**
         * 段落
         */
        class EtParagraphElement extends EffectElement {
            static readonly elName: ElName;
            static readonly cssText: string;
            readonly elType: ElType;
            get pid(): string;
            set pid(v: string);
            get indent(): number;
            set indent(v: number);
            connectedCallback(this: EtParagraphElement): void;
            focusinCallback(): void;
            focusoutCallback(): void;
            replaceToNativeElement(): void;
        }
        type EtParagraphCtor = typeof EtParagraphElement;
        /**
         * 纯文本节点
         */
        class EtPlainTextElement extends EffectElement {
            static readonly elName: ElName;
            readonly elType: ElType;
            connectedCallback(this: EffectElement): void;
            replaceToNativeElement(): void;
        }
        type EtPlainTextCtor = typeof EtPlainTextElement;
        /**
         * 富文本节点
         */
        class EtRichTextElement extends EffectElement {
            static readonly elName: ElName;
            readonly elType: ElType;
            replaceToNativeElement(): void;
        }
        type EtRichTextCtor = typeof EtRichTextElement;

        const ET_APP: `${BuiltinElName.ET_APP}`
        const ET_BODY: `${BuiltinElName.ET_BODY}`
        const ET_PARAGRAPH: `${BuiltinElName.ET_PARAGRAPH}`
        const ET_PLAINTEXT: `${BuiltinElName.ET_PLAINTEXT}`
        const ET_RICHTEXT: `${BuiltinElName.ET_RICHTEXT}`
        const ET_COMPONENT: `${BuiltinElName.ET_COMPONENT}`
        type BuiltinEtElement = {
            [ET_APP]: EtEditorElement;
            [ET_BODY]: EtBodyElement;
            [ET_RICHTEXT]: EtRichTextElement;
            [ET_PLAINTEXT]: EtPlainTextElement;
            [ET_PARAGRAPH]: EtParagraphElement;
            [ET_COMPONENT]: EtComponentElement;
        };

    }
    export declare namespace Handler {
        /** Effect处理器 */
        type EffectHandler = (...args: any[]) => any;
        type InputEffectHandler = (ctx: Editor.Context, ev: InputEvent) => void;
        /**
         * InputType效应
         */
        type InputTypeEffect = `${BuiltinConfig.BUILTIN_EFFECT_PREFFIX}${DOM.InputType}`;
        type DefaultEffectHandlerMap = Record<InputTypeEffect, InputEffectHandler>;

        /** 效应触发器 */
        interface EffectInvoker {
            /** 获取EffectElement的类对象（构造函数） */
            readonly getEffectElCtor: (el: EtElement) => EtElementCtor;
            /** 调用EffectElement类对象上绑定的Effect EtHandler */
            invoke(e: keyof DefaultEffectHandlerMap, ...args: Parameters<InputEffectHandler>): ReturnType<InputEffectHandler>;
            invoke<E extends keyof EffectHandlerDeclaration>(e: E, ...args: EffectHandlerDeclaration[E] extends (...args: infer P) => any ? P : []): ReturnType<EffectHandlerDeclaration[E]>;
        }
        type CmdType = `${CmdTypeEnum}`
        /** 更新dom统一命令 */
        interface Cmd {
            readonly type: CmdType;
            /**
             * 命令执行完毕后是否重新定位光标
             */
            setCaret?: boolean;
            /**
             * 数组[0, 1]  
             * 0: 添加命令时光标位置  
             * 1: 执行命令后光标位置, 包含范围, 用于更新Selection  
             */
            readonly targetRanges: [StaticRange, StaticRange?];
        }
        interface CmdInsertNode extends Cmd {
            readonly type: `${CmdTypeEnum.Insert_Node}`;
            readonly node: HTMLElement | Text;
            /**
             * node要插入的位置, 必须是一个与node未来父节点相关的Range, 而不能与node的未来兄弟节点相关
             */
            readonly insertAt: StaticRange;
            readonly targetRanges: [StaticRange, StaticRange];
        }
        interface CmdRemoveNode extends Cmd {
            readonly type: `${CmdTypeEnum.Remove_Node}`;
            readonly node: HTMLElement | Text;
            /**
             * node所在的位置, 需要与node无关（而与node的父节点相关）, 用于构建逆命令
             */
            readonly removeAt: StaticRange;
            readonly targetRanges: [StaticRange, StaticRange];
        }
        interface CmdReplaceNode extends Cmd {
            readonly type: `${CmdTypeEnum.Replace_Node}`;
            readonly node: HTMLElement | Text;
            readonly newNode: HTMLElement | Text;
            /**
             * node 所在位置, 与node无关
             */
            readonly replaceAt: StaticRange;
            readonly targetRanges: [StaticRange, StaticRange];
        }
        interface CmdInsertText extends Cmd {
            readonly type: `${CmdTypeEnum.Insert_Text}`;
            readonly text: Text;
            /** 文本插入位置偏移量, 0则插入至开头 */
            readonly offset: number;
            /** 将插入的文本 */
            readonly data: string;
            /** 插入位置依赖于[0], 因此该SR必须与#text节点相关 */
            readonly targetRanges: [StaticRange, StaticRange];
        }
        interface CmdDeleteText extends Cmd {
            readonly type: `${CmdTypeEnum.Delete_Text}`;
            /**
             * 根据deleteRange范围内文本
             */
            readonly data: string;
            /**
             * 删除方向, Backspace删除时true, Delete时false; 用于合并命令时字符串的拼接方向
             * 作为insertText的逆命令始终为true
             */
            readonly isBackward: boolean;
            /**
             * 一般为beforeinput事件的getTargetRanges()[0]
             */
            readonly deleteRange: StaticRange;
            readonly targetRanges: [StaticRange, StaticRange];
        }
        interface CmdReplaceText extends Cmd {
            readonly type: `${CmdTypeEnum.Replace_Text}`;
            readonly text: Text;
            readonly offset: number;
            readonly data: string;
            readonly replacedData: string;
            readonly targetRanges: [StaticRange, StaticRange];
        }
        interface CmdInsertCompositionText extends Cmd {
            readonly type: `${CmdTypeEnum.Insert_Composition_Text}`;
            readonly data: string;
            /**
             * [0]是插入文本的位置; 当输入法开始输入时光标位置不在#text节点上, 浏览器会自动插入一个#text（无法阻止）
             */
            readonly targetRanges: [StaticRange];
        }
        interface CmdInsertContent extends Cmd {
            readonly type: `${CmdTypeEnum.Insert_Content}`;
            /**
             * 为避免合并边缘节点, fragment必须是完整的节点片段
             */
            readonly fragment: DocumentFragment;
            /**
             * fragment插入到的位置, collapsed的StaticRange; 应与fragment内任何节点无关
             */
            readonly insertAt: StaticRange;
            /**
             * 一个fragment.childNodes的索引, 当命令结束光标需要定位到该节点前时, 需配置该属性,
             * 命令执行时构造StaticRange并覆盖targetRanges[1]
             * 否则光标落点直接用targetRanges[1]
             */
            readonly collapseTo?: number;
            /**
             * 刚好完全包含插入到fragment内容的范围, 用于逆命令的removeRange;
             * *在命令执行时必须赋值该属性, 否则无法构建逆命令; 命令创建时忽略
             */
            fragmentRange?: StaticRange;
            readonly targetRanges: [StaticRange, StaticRange];
        }
        interface CmdRemoveContent extends Cmd {
            readonly type: `${CmdTypeEnum.Remove_Content}`;
            /**
             * 删除的内容范围, 必须包含完整的节点, 并且与被移除的任何节点不相关
             * 此命令撤回时, content将插回 removeRange 的startContainer/offset的位置
             */
            readonly removeRange: StaticRange;
            /**
             * 此项用于暂存removeRange extract出来的片段, 用于逆命令的fragment; 命令执行时必须赋值该属性
             */
            removeFragment?: DocumentFragment;
            readonly targetRanges: [StaticRange, StaticRange];
        }
        interface CmdFunctional extends Cmd {
            readonly type: `${CmdTypeEnum.Functional}`;
            readonly targetRanges: [StaticRange, StaticRange];
        }
        type CmdCallback = (ctx: Editor.Context) => void;
        type CmdCallbackInit = {
            redoCallback?: CmdCallback;
            undoCallback?: CmdCallback;
            finalCallback?: CmdCallback;
        };
        type Command = CmdCallbackInit & (CmdInsertNode | CmdRemoveNode | CmdReplaceNode | CmdInsertText | CmdDeleteText | CmdReplaceText | CmdInsertCompositionText | CmdInsertContent | CmdRemoveContent | CmdFunctional);
        type CommandMap = { [k in Command['type']]: Extract<Command, { type: k }> };
        type CommandInit = { [k in keyof CommandMap]: Prettify<Omit<CommandMap[k], 'type'>> };
        type CommandCreator = <T extends keyof CommandMap>(type: T, init: CommandInit[T]) => CommandMap[T];
        /**
         * 命令控制器
         */
        interface CommandHandler {
            /** 命令队列 */
            // readonly cmds: Command[];
            /** 是否在一个命令组事务内;  */
            readonly inTransaction: boolean;
            /** 添加一个命令到队列中 */
            push(this: CommandHandler, cmd: Command): void;
            push<T extends keyof CommandMap>(this: CommandHandler, type: T, init: CommandInit[T]): void;
            /**
             * 执行命令更新dom; 当cmds未提供时, 执行this.cmds 并清空
             * @returns 是否执行了至少一个命令
             */
            handle(this: CommandHandler, cmds?: Command[]): boolean;
            /**
             * 若不在事务内, 将当前记录栈内命令合并成事务添加到撤回栈
             * @returns 是否 commit 了至少一个命令
             */
            commit(this: CommandHandler): boolean;
            /**
             * 撤回当前命令队列内所有命令（已执行）并丢弃
             * @returns 是否撤销了至少一个命令
             */
            discard(this: CommandHandler): boolean;
            /**
             * 开启事务（开启前自动commit先前命令）
             */
            startTransaction(this: CommandHandler): void;
            /**
             * 关闭事务, 并自动commit命令
             */
            closeTransaction(this: CommandHandler): void;
            /**
             * 确认所有事务，执行final回调，清空撤回栈; 用户退出页面前应自动执行该函数
             */
            commitAll(this: CommandHandler, ctx: Editor.Context): void;
        }
        type CommandUndoHandler = {
            handle(ctx: Editor.Context, cmds: Command[]): boolean;
            commit(ctx: Editor.Context): boolean;
            discard(ctx: Editor.Context): boolean;
            commitAll(ctx: Editor.Context): void;
        };
    }

    /* --------------------------------- const -------------------------------- */
    export const CmdType: typeof CmdTypeEnum = {
        Insert_Node: CmdTypeEnum.Insert_Node,
        Remove_Node: CmdTypeEnum.Remove_Node,
        Replace_Node: CmdTypeEnum.Replace_Node,
        Insert_Text: CmdTypeEnum.Insert_Text,
        Delete_Text: CmdTypeEnum.Delete_Text,
        Replace_Text: CmdTypeEnum.Replace_Text,
        Insert_Composition_Text: CmdTypeEnum.Insert_Composition_Text,
        Insert_Content: CmdTypeEnum.Insert_Content,
        Remove_Content: CmdTypeEnum.Remove_Content,
        Functional: CmdTypeEnum.Functional,
    }
    export const HtmlChar: typeof HtmlCharEnum = {
        ZERO_WIDTH_SPACE: HtmlCharEnum.ZERO_WIDTH_SPACE,
        NBSP: HtmlCharEnum.NBSP,
    }
    export const MIMEType: typeof MIMETypeEnum = {
        ET_COPY_METADATA: MIMETypeEnum.ET_COPY_METADATA,
        ET_TEXT_HTML: MIMETypeEnum.ET_TEXT_HTML,
        TEXT_PLAIN: MIMETypeEnum.TEXT_PLAIN,
        TEXT_HTML: MIMETypeEnum.TEXT_HTML,
    }
    export const CssClass: typeof CssClassEnum = {
        Active: CssClassEnum.Active,
        Dragging: CssClassEnum.Dragging,
        Dragover: CssClassEnum.Dragover,
        Selected: CssClassEnum.Selected,
        SelectionRange: CssClassEnum.SelectionRange,
        Heading: CssClassEnum.Heading,

        Prefix: CssClassEnum.Prefix,
        Suffix: CssClassEnum.Suffix,
        Block: CssClassEnum.Block,
    }
    export const BUILTIN_EFFECT_PREFFIX = BuiltinConfig.BUILTIN_EFFECT_PREFFIX

    /* ---------------------------------- alias --------------------------------- */
    export type Editor = Editor.Editor
    export type Effector = Effector.Effector
    export type EtElement = Element.EffectElement
    export type EtElementCtor = Element.EffectElementCtor
    export type AbbrInit = _AbbrInit
    /**
     * 定义的EtElement映射表, 用于document.createElement()的提示 
     * @expandable
     */
    export interface DefinedEtElementMap extends Element.BuiltinEtElement { }
    /**
     * 绑在类名上的效应处理器声明
     * InputType的Effect使用 `E+inputType`命名
     * 自定义Effect小写字母开头
     * @expandable
     */
    export interface EffectHandlerDeclaration extends Handler.DefaultEffectHandlerMap {
        replaceText: (ctx: Editor.Context, data: string, targetRange: DOM.TextStaticRange, setCaret?: boolean) => boolean;
        /** 
         * 按下tab将光标跳至当前效应元素（richtext或component）外结尾（即下一节点文本开头, 
         * 若光标无法定位到下一节点文本开头, 则会插入一个零宽字符 
         */
        tabout: (ctx: Editor.Context) => boolean;
        /**
         * 双击空格跳出最外层样式节点(richtext, component), 在keydown内触发;  
         * 类似的, Tab只跳出当前样式节点
         */
        dblSpace: (ctx: Editor.Context) => boolean;
        /**
         * 键入'# ' 把当前段落设置为一个atx标题（仅支持一层）,
         */
        atxHeading: (ctx: Editor.Context) => boolean;
    }
}
