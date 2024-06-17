/** 项目对外导出的类型声明和常量
 * @author: Ausprain 
 * @email: ausprain@qq.com 
 * @date: 2024-04-20 20:09:55 
 */

import { BuiltinConfig, BuiltinElName, BuiltinElType, CmdTypeEnum } from "./constant";
import type { EffectElement, EffectElementCtor, EtBodyCtor, EtBodyElement, EtComponentElement, EtEditorCtor, EtEditorElement, EtParagraphCtor, EtParagraphElement, EtPlainTextElement, EtRichTextElement } from "../element";
import type { MainAfterInputTypeSolver, MainBeforeInputTypeSolver, MainKeydownKeySolver, MainKeyupKeySolver } from "../effector";
import type { DOM } from "./declare";
import type { Effitor } from "../effitor";
import type { UndoStack } from "../handler/undo";

export type LowerLetter = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z';
export type Prototype<C extends Function> = { constructor: C };
export type Prettify<T> = {
    [k in keyof T]: T[k]
} & {};

export type HTMLNode = Text | HTMLElement;
export type NullableNode = Node | null;
export type NullableElement = HTMLElement | null;
export type NullableText = Text | null;
export type TextStaticRange = StaticRange & { endContainer: Text, startContainer: Text }

export type KeyboardCode = DOM.KeyboardCode
export type KeyboardKey = DOM.KeyboardKey
export type InputType = DOM.InputType
export type KeyboardEvent = DOM.KeyboardEvent
export type InputEvent = DOM.InputEvent
export type ClipboardEvent = DOM.ClipboardEvent
export type DataTransfer = DOM.DataTransfer
export interface ShadowRoot extends DOM.ShadowRoot {
    querySelector<K extends keyof DefinedEtElementMap>(selectors: K): DefinedEtElementMap[K] | null;
    querySelectorAll<K extends keyof DefinedEtElementMap>(selectors: K): NodeListOf<DefinedEtElementMap[K]>;
}


/* -------------------------------------------------------------------------- */
/*                             Et Editor Namespace                            */
/* -------------------------------------------------------------------------- */
export type Editor = Effitor
// /**
//  * 编辑器
//  */
// export interface Editor {
//     /**
//      * 在一个div下加载一个编辑器
//      */
//     readonly mount: (el: HTMLDivElement) => void;
//     /**
//      * 从div卸载编辑器
//      */
//     readonly unmount: (el: HTMLDivElement) => void;
//     /**
//      * 返回div上挂载的编辑器影子根
//      */
//     readonly getRoot: (el: HTMLDivElement) => ShadowRoot | null;
//     /**
//      * 导出`<et-body>`的outerHTML
//      */
//     toEtHTML: (el: HTMLDivElement) => string | null;
//     /**
//      * 导入html为`<et-body>` 若非以下格式将报错  
//      * ```html
//      * <et-body>
//      *  <et-p>...</et-p>
//      *  ...
//      *  <et-p>...</et-p>
//      * </et-body>
//      * ```
//      */
//     fromEtHTML: (el: HTMLDivElement, html: string) => void;
// }
/**
 * 编辑器配置
 */
export type EditorConfig = {
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
export interface EditorContext {
    /** symbol索引, 用于给扩展effector添加自定义属性 */
    [k: symbol]: any;
    /** 编辑器对象本身 */
    readonly editor: Editor;
    /** 编辑器配置 */
    readonly config: EditorConfig;
    readonly schema: EditorSchema;
    /** 当前编辑器宿主div, root.host的祖父节点  若host为空 则焦点不在编辑器内 */
    host: HTMLDivElement;
    /** 当前触发编辑逻辑的ShadowRoot */
    root: ShadowRoot;
    /** 当前编辑区 */
    body: EtBodyElement;
    /** 当前`Selection`对象 */
    selection: Selection;
    /** 对应的`Range`对象 */
    range: Range;
    /** 当且仅当`Selection.anchorNode`是TextNode时非空  */
    node: NullableText;
    /** 上一个`text node` */
    oldNode: NullableText;
    /** 当前效应元素 */
    effectElement: EtElement;
    /** 是否EffectElement开端, 当且仅当effectElement非空且其textContent=='' */
    /** 当前光标所在段落, 段落驱动的, 光标只能落在段落里 */
    paragraphEl: EtParagraphElement;
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
    compositionUpdateCount: number;
    /** 跳过n次`selectionchange`回调；如：在手动插入一个`zws`时 +1 */
    /** 是否跳过默认Effector, (在keydown/keyup/beforeinput/input中设置为true时, 都将跳过mainEffector的对应事件监听器) */
    skipDefault: boolean;
    readonly effectInvoker: EffectInvoker;
    readonly commandHandler: CommandHandler;
    readonly forceUpdate: (this: EditorContext) => void;
    /**
     * [Selection.modify](https://developer.mozilla.org/zh-CN/docs/Web/API/Selection/modify) with `ctx.selection` and `ctx.forceUpdate`
     */
    readonly modify: (this: EditorContext, alter: ModifyAlter, direction: ModifyDirection, granularity: ModifyGranularity) => void;

}
export interface EditorSchema {
    [k: string]: EtElementCtor;
    readonly editor: EtEditorCtor;
    readonly body: EtBodyCtor;
    readonly paragraph: EtParagraphCtor;
}
/**
 * 编辑器插件
 */
export type EditorPlugin = {
    /** 插件唯一名字 */
    readonly name: string;
    /**
     * 将注册在编辑器上的效应器列表
     * 按顺序绑定, 并按顺序触发响应,
     * 对应handler返回true时将跳过后续效应,
     * `ctx.skipDefault标记为true`时将跳过内置效应
     */
    readonly effector: Effector;
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
     *              const res = builtinEinsertFromPaste(ctx, ev)
     *              /// after
     *              return res
     *          }
     *      })
     *  }
     * ```
     */
    readonly registry?: (ctx: EditorContext) => void;
};
/**
 * 编辑器初始化选项
 */
export type CreateEditorOptions = {
    schemaInit?: Partial<EditorSchema>;
    /** 主效应器 */
    mainEffector?: Required<MainEffector>;
    /** 编辑器插件 */
    plugins?: EditorPlugin[];
    /** 编辑器配置项 */
    config?: Partial<EditorConfig>;
    /** 自定义样式文件url列表 */
    customStyleUrls?: [string];
};

/* -------------------------------------------------------------------------- */
/*                            Et Effector Namespace                           */
/* -------------------------------------------------------------------------- */

/** 效应器, 响应用户操作, 执行对应Handler */
export interface Effector extends Partial<Solvers> {
    /** 编辑器mount一个div时执行 */
    readonly onMounted?: (el: HTMLDivElement, ctx: EditorContext) => void;
    /** 卸载一个div前执行 */
    readonly onBeforeUnmount?: (el: HTMLDivElement, ctx: EditorContext) => void;
}
export type Solvers = {
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
export interface MainEffector {
    readonly keydownSolver: MainKeydownKeySolver;
    readonly keyupSolver: MainKeyupKeySolver;
    readonly beforeInputSolver: MainBeforeInputTypeSolver;
    readonly afterInputSolver: MainAfterInputTypeSolver;
}

type KeyboardSolver = Partial<Record<string, KeyboardAction>>;
type InputSolver = Partial<Record<string, InputAction>>;
/** keydown/keyup中处理按键响应 ev.key -> action */
export type KeyboardKeySolver = Partial<Record<KeyboardKey, KeyboardAction> & {
    /** 默认响应, 即当ev.key未声明在solver中时, 执行该响应 */
    default: KeyboardAction;
}>;
/** 同KeyboardKeySolver, ev.inputType -> action */
export type InputTypeSolver = Partial<Record<Exclude<InputType, 'undefined'>, InputAction> & {
    default: InputAction;
}>;
export type MainInputTypeSolver = InputTypeSolver & {
    /** 非法的inputType会自动替换为"", 走此映射" */
    '': InputAction;
};
export type HTMLEventSolver = {
    [k in keyof HTMLElementEventMap]?: (ev: HTMLElementEventMap[k], ctx: EditorContext) => void;
};
export type KeyboardAction = (ev: KeyboardEvent, ctx: EditorContext) => boolean | void;
export type InputAction = (ev: InputEvent, ctx: EditorContext) => boolean | void;
export type ClipboardAction = (e: ClipboardEvent, c: EditorContext) => boolean | void;
export type SelChangeAction = (e: Event, c: EditorContext) => void;


/* -------------------------------------------------------------------------- */
/*                            Et Element Namespace                            */
/* -------------------------------------------------------------------------- */

/** `EffectElement`的别名 */
export type EtElement = EffectElement
export type EtElementCtor = EffectElementCtor
export type ElName = `et-${LowerLetter}${Lowercase<string>}`;
export type ElType = `${BuiltinElType}`;
export type ElStyle = Partial<{ [k in keyof CSSStyleDeclaration as (CSSStyleDeclaration[k] extends string ? k : never)]: CSSStyleDeclaration[k] }>;
/**
 * 自定义EtElement设置属性
 * @expandable
 */
export interface ElAttrs {
    part: string;
    href: string;
    contenteditable: 'plaintext-only' | 'false' | '' | 'true';
    draggable: 'true' | 'false';
}
export type ElementCallbacks = {
    connectedCallback?(this: EtElement): void;
    disconnectedCallback?(this: EtElement): void;
    adoptedCallback?(this: EtElement): void;
    attributeChangedCallback?(this: EtElement, name: string, oldValue: string, newValue: string): void;
};

/** 效应拦截器, 作为EffectElement的一个属性, 仅当返回true时, 阻止该效应 */
export type EffectBlocker = (effect: string) => boolean;

declare const ET_APP: `${BuiltinElName.ET_APP}`
declare const ET_BODY: `${BuiltinElName.ET_BODY}`
declare const ET_PARAGRAPH: `${BuiltinElName.ET_PARAGRAPH}`
declare const ET_PLAINTEXT: `${BuiltinElName.ET_PLAINTEXT}`
declare const ET_RICHTEXT: `${BuiltinElName.ET_RICHTEXT}`
declare const ET_COMPONENT: `${BuiltinElName.ET_COMPONENT}`
type BuiltinEtElement = {
    [ET_APP]: EtEditorElement;
    [ET_BODY]: EtBodyElement;
    [ET_RICHTEXT]: EtRichTextElement;
    [ET_PLAINTEXT]: EtPlainTextElement;
    [ET_PARAGRAPH]: EtParagraphElement;
    [ET_COMPONENT]: EtComponentElement;
};
/**
 * 定义的EtElement映射表, 用于document.createElement()的提示 
 * @expandable
 */
export interface DefinedEtElementMap extends BuiltinEtElement { }


/* -------------------------------------------------------------------------- */
/*                            Et Handler Namespace                            */
/* -------------------------------------------------------------------------- */

/** Effect处理器 */
export type EffectHandler = (...args: any[]) => any;
export type InputEffectHandler = (ctx: EditorContext, ev: InputEvent) => void;
/**
 * InputType效应
 */
export type InputTypeEffect = `${BuiltinConfig.BUILTIN_EFFECT_PREFFIX}${InputType}`;
export type DefaultEffectHandlerMap = Record<InputTypeEffect, InputEffectHandler>;
/**
* 绑在类名上的效应处理器声明
* InputType的Effect使用 `E+inputType`命名
* 自定义Effect小写字母开头
* @expandable
*/
export interface EffectHandlerDeclaration extends DefaultEffectHandlerMap {
    replaceText: (ctx: EditorContext, data: string, targetRange: TextStaticRange, setCaret?: boolean) => boolean;
    /** 
     * 按下tab将光标跳至当前效应元素（richtext或component）外结尾（即下一节点文本开头, 
     * 若光标无法定位到下一节点文本开头, 则会插入一个零宽字符 
     */
    tabout: (ctx: EditorContext) => boolean;
    /**
     * 双击空格跳出最外层样式节点(richtext, component), 在keydown内触发;  
     * 类似的, Tab只跳出当前样式节点
     */
    dblSpace: (ctx: EditorContext) => boolean;
    /**
     * 键入'# ' 把当前段落设置为一个atx标题（仅支持一层）,
     */
    atxHeading: (ctx: EditorContext) => boolean;
}

/** 效应触发器 */
export interface EffectInvoker {
    /** 获取EffectElement的类对象（构造函数） */
    readonly getEffectElCtor: (el: EtElement) => EtElementCtor;
    /** 调用EffectElement类对象上绑定的Effect EtHandler */
    invoke(e: keyof DefaultEffectHandlerMap, ...args: Parameters<InputEffectHandler>): ReturnType<InputEffectHandler>;
    invoke<E extends keyof EffectHandlerDeclaration>(e: E, ...args: EffectHandlerDeclaration[E] extends (...args: infer P) => any ? P : []): ReturnType<EffectHandlerDeclaration[E]>;
}
type CmdType = `${CmdTypeEnum}`
/** 更新dom统一命令 */
export interface Cmd {
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
export interface CmdInsertNode extends Cmd {
    readonly type: `${CmdTypeEnum.Insert_Node}`;
    readonly node: HTMLElement | Text;
    /**
     * node要插入的位置, 必须是一个与node未来父节点相关的Range, 而不能与node的未来兄弟节点相关
     */
    readonly insertAt: StaticRange;
    readonly targetRanges: [StaticRange, StaticRange];
}
export interface CmdRemoveNode extends Cmd {
    readonly type: `${CmdTypeEnum.Remove_Node}`;
    readonly node: HTMLElement | Text;
    /**
     * node所在的位置, 需要与node无关（而与node的父节点相关）, 用于构建逆命令
     */
    readonly removeAt: StaticRange;
    readonly targetRanges: [StaticRange, StaticRange];
}
export interface CmdReplaceNode extends Cmd {
    readonly type: `${CmdTypeEnum.Replace_Node}`;
    readonly node: HTMLElement | Text;
    readonly newNode: HTMLElement | Text;
    /**
     * node 所在位置, 与node无关
     */
    readonly replaceAt: StaticRange;
    readonly targetRanges: [StaticRange, StaticRange];
}
export interface CmdInsertText extends Cmd {
    readonly type: `${CmdTypeEnum.Insert_Text}`;
    readonly text: Text;
    /** 文本插入位置偏移量, 0则插入至开头 */
    readonly offset: number;
    /** 将插入的文本 */
    readonly data: string;
    /** 插入位置依赖于[0], 因此该SR必须与#text节点相关 */
    readonly targetRanges: [StaticRange, StaticRange];
}
export interface CmdDeleteText extends Cmd {
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
export interface CmdReplaceText extends Cmd {
    readonly type: `${CmdTypeEnum.Replace_Text}`;
    readonly text: Text;
    readonly offset: number;
    readonly data: string;
    readonly replacedData: string;
    readonly targetRanges: [StaticRange, StaticRange];
}
export interface CmdInsertCompositionText extends Cmd {
    readonly type: `${CmdTypeEnum.Insert_Composition_Text}`;
    readonly data: string;
    /**
     * [0]是插入文本的位置; 当输入法开始输入时光标位置不在#text节点上, 浏览器会自动插入一个#text（无法阻止）
     */
    readonly targetRanges: [StaticRange];
}
export interface CmdInsertContent extends Cmd {
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
     * 一个`fragment.childNodes`的索引偏移量,   
     * 当命令执行后光标需要定位到该索引指向的节点前时（即执行命令时无法取得准确的`targetRanges[1]`时）必须配置该属性,  
     * 命令执行时会根据该值构造`StaticRange`并覆盖`targetRanges[1]`  
     * 未配置时，光标落点直接用`targetRanges[1]`  
     */
    readonly collapseTo?: number;
    /**
     * 刚好完全包含插入到fragment内容的范围, 用于逆命令的removeRange;  
     * *在命令执行时必须赋值该属性, 否则无法构建逆命令; 命令创建时忽略
     */
    fragmentRange?: StaticRange;
    readonly targetRanges: [StaticRange, StaticRange];
}
export interface CmdRemoveContent extends Cmd {
    readonly type: `${CmdTypeEnum.Remove_Content}`;
    /**
     * 删除的内容范围, 必须包含完整的节点, 并且与被移除的任何节点不相关
     * 此命令撤回时, content将插回 removeRange 的startContainer/offset的位置
     */
    readonly removeRange: StaticRange;
    /**
     * 此项用于暂存removeRange extract出来的片段, 用于逆命令的fragment;   
     * *在命令执行时必须赋值该属性, 否则无法构建逆命令; 命令创建时忽略
     */
    removeFragment?: DocumentFragment;
    readonly targetRanges: [StaticRange, StaticRange];
}
export interface CmdFunctional extends Cmd {
    readonly type: `${CmdTypeEnum.Functional}`;
    readonly targetRanges: [StaticRange, StaticRange];
}
export type CmdCallback = (ctx: EditorContext) => void | Promise<void>;
export type CmdCallbackInit = {
    /** 命令执行 或 redo时回调 */
    redoCallback?: CmdCallback;
    /** 命令撤销时 回调 */
    undoCallback?: CmdCallback;
    /** 命令最终回调（撤回栈满导致命令出队时 或保存/退出程序时 执行） */
    finalCallback?: CmdCallback;
};
export type Command = CmdCallbackInit & (CmdInsertNode | CmdRemoveNode | CmdReplaceNode | CmdInsertText | CmdDeleteText | CmdReplaceText | CmdInsertCompositionText | CmdInsertContent | CmdRemoveContent | CmdFunctional);
export type CommandMap = { [k in Command['type']]: Extract<Command, { type: k }> };
export type CommandInit = { [k in keyof CommandMap]: Prettify<Omit<CommandMap[k], 'type'>> };
// export type CommandCreator = <T extends keyof CommandMap>(type: T, init: CommandInit[T]) => CommandMap[T];
/**
 * 命令控制器
 */
export interface CommandHandler {
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
    // /**
    //  * 记录事务
    //  */
    // pushTransaction(this: CommandHandler, ctx: EditorContext): boolean;
    /**
     * 撤回事务
     */
    undoTransaction(this: CommandHandler, ctx: EditorContext): void;
    /**
     * 重做事务
     */
    redoTransaction(this: CommandHandler, ctx: EditorContext): void;
    /**
     * 确认所有事务，执行final回调，清空撤回栈; 用户退出页面前应自动执行该函数
     */
    commitAll(this: CommandHandler, ctx: EditorContext): void;

}

/* -------------------------------------------------------------------------- */
/*                            Global Augmentations                            */
/* -------------------------------------------------------------------------- */

declare global {
    interface HTMLElementEventMap {
        keydown: DOM.KeyboardEvent;
        keyup: DOM.KeyboardEvent;
        beforeinput: DOM.InputEvent;
        input: DOM.InputEvent;
        copy: DOM.ClipboardEvent;
        cut: DOM.ClipboardEvent;
        paste: DOM.ClipboardEvent;
    }
    interface HTMLElement {
        readonly elType?: ElType;
        setAttribute<K extends keyof ElAttrs>(qualifiedName: K, value: ElAttrs[K]): void;
        setAttribute(qualifiedName: string, value: string): void;
        getAttribute<K extends keyof ElAttrs>(qualifiedName: K): ElAttrs[K];
        getAttribute(qualifiedName: string): string;
        removeAttribute<K extends keyof ElAttrs>(qualifiedName: K): void;
        removeAttribute(qualifiedName: string): void;
        addEventListener(type: 'beforeinput', listener: (ev: DOM.InputEvent) => any, options?: boolean | EventListenerOptions): void;
    }
    interface Document {
        createElement<K extends keyof DefinedEtElementMap>(tagName: K): DefinedEtElementMap[K];
        addEventListener(type: 'beforeinput', listener: (ev: DOM.InputEvent) => any, options?: boolean | EventListenerOptions): void;
    }

    type ModifyAlter = "extend" | "move"
    type ModifyDirection = "forward" | "backward" | "left" | "right"
    type ModifyGranularity = "character" | "word" | "sentence" | "line" | "paragraph" | "lineboundary" | "sentenceboundary" | "paragraphboundary" | "documentboundary"
    /**
     * [Selection](https://developer.mozilla.org/zh-CN/docs/Web/API/Selection)
     */
    interface Selection {
        /**
         * [MDN Reference](https://developer.mozilla.org/zh-CN/docs/Web/API/Selection/modify)  
         * [Selection API W3C Working Draft 16 May 2023](https://www.w3.org/TR/selection-api/#dom-selection-modify)
         */
        // modify(alter: ModifyAlter, direction: "forward" | "backward" | "left" | "right", granularity: "character" | "word" | "sentence" | "line" | "paragraph" | "lineboundary" | "sentenceboundary" | "paragraphboundary" | "documentboundary"): void;
        modify(alter: ModifyAlter, direction: ModifyDirection, granularity: ModifyGranularity): void
    }
}


/* -------------------------------------------------------------------------- */
/*                                Et Constants                                */
/* -------------------------------------------------------------------------- */

export const BUILTIN_EFFECT_PREFFIX = BuiltinConfig.BUILTIN_EFFECT_PREFFIX
export { CssClassEnum as CssClass, HtmlCharEnum as HtmlChar } from './constant'
