/** 项目常量枚举, 不对外导出, 需要导出的 在export.ts 中转为常量再导出
 * @author: Ausprain 
 * @email: ausprain@qq.com 
 * @date: 2024-04-20 20:10:49 
 */

/**
 * KeyboardEvent.code;
 */
export const enum KeyboardCodeEnum {
    F1 = "F1",
    F2 = "F2",
    F3 = "F3",
    F4 = "F4",
    F5 = "F5",
    F6 = "F6",
    F7 = "F7",
    F8 = "F8",
    F9 = "F9",
    F10 = "F10",
    F11 = "F11",
    F12 = "F12",
    Numpad0 = "Numpad0",
    Numpad1 = "Numpad1",
    Numpad2 = "Numpad2",
    Numpad3 = "Numpad3",
    Numpad4 = "Numpad4",
    Numpad5 = "Numpad5",
    Numpad6 = "Numpad6",
    Numpad7 = "Numpad7",
    Numpad8 = "Numpad8",
    Numpad9 = "Numpad9",
    NumpadDecimal = "NumpadDecimal",
    NumpadEnter = "NumpadEnter",
    NumpadAdd = "NumpadAdd",
    NumpadSubtract = "NumpadSubtract",
    NumpadMultiply = "NumpadMultiply",
    NumpadDivide = "NumpadDivide",
    Digit0 = "Digit0",
    Digit1 = "Digit1",
    Digit2 = "Digit2",
    Digit3 = "Digit3",
    Digit4 = "Digit4",
    Digit5 = "Digit5",
    Digit6 = "Digit6",
    Digit7 = "Digit7",
    Digit8 = "Digit8",
    Digit9 = "Digit9",
    KeyA = "KeyA",
    KeyB = "KeyB",
    KeyC = "KeyC",
    KeyD = "KeyD",
    KeyE = "KeyE",
    KeyF = "KeyF",
    KeyG = "KeyG",
    KeyH = "KeyH",
    KeyI = "KeyI",
    KeyJ = "KeyJ",
    KeyK = "KeyK",
    KeyL = "KeyL",
    KeyM = "KeyM",
    KeyN = "KeyN",
    KeyO = "KeyO",
    KeyP = "KeyP",
    KeyQ = "KeyQ",
    KeyR = "KeyR",
    KeyS = "KeyS",
    KeyT = "KeyT",
    KeyU = "KeyU",
    KeyV = "KeyV",
    KeyW = "KeyW",
    KeyX = "KeyX",
    KeyY = "KeyY",
    KeyZ = "KeyZ",
    BackQuote = "BackQuote",
    Minux = "Minux",
    Equal = "Equal",
    BracketLeft = "BracketLeft",
    BracketRight = "BracketRight",
    Backslash = "Backslash",
    Semicolon = "Semicolon",
    Quote = "Quote",
    Comma = "Comma",
    Period = "Period",
    Slash = "Slash",
    Delete = "Delete",
    Backspace = "Backspace",
    Enter = "Enter",
    Space = "Space",
    Tab = "Tab",
    ArrowDown = "ArrowDown",
    ArrowLeft = "ArrowLeft",
    ArrowRight = "ArrowRight",
    ArrowUp = "ArrowUp",
    Escape = "Escape",
    CtrlLeft = "CtrlLeft",
    CtrlRight = "CtrlRight",
    AltLeft = "AltLeft",
    AltRight = "AltRight",
    ShiftLeft = "ShiftLeft",
    ShiftRight = "ShiftRight",
    MetaLeft = "MetaLeft",
    MetaRight = "MetaRight"
}
/**
 * KeyboardEvent.key枚举; 小写字母使用大写字母映射
 */
export const enum KeyboardKeyEnum {
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
    '!' = "!",
    '@' = "@",
    '#' = "#",
    '$' = "$",
    '%' = "%",
    '^' = "^",
    '&' = "&",
    '*' = "*",
    '(' = "(",
    ')' = ")",
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
    '"' = "\"",
    ',' = ",",
    '<' = "<",
    '.' = ".",
    '>' = ">",
    '/' = "/",
    '?' = "?",
    Space = " ",
    Tab = "Tab",
    Enter = "Enter",
    Backspace = "Backspace",
    Delete = "Delete",
    Ctrl = "Ctrl",
    Shift = "Shift",
    Alt = "Alt",
    Meta = "Meta",
    ArrowUp = "ArrowUp",
    ArrowDown = "ArrowDown",
    ArrowLeft = "ArrowLeft",
    ArrowRight = "ArrowRight",
    PageUp = "PageUp",
    PageDown = "PageDown",
    Home = "Home",
    End = "End",
    Escape = "Escape",
    F1 = "F1",
    F2 = "F2",
    F3 = "F3",
    F4 = "F4",
    F5 = "F5",
    F6 = "F6",
    F7 = "F7",
    F8 = "F8",
    F9 = "F9",
    F10 = "F10",
    F11 = "F11",
    F12 = "F12"
}
/**
 * Valid `inputType` of `InputEvent`  
 * `ref.` https://www.w3.org/TR/input-events-2/#interface-InputEvent-Attributes
 */
export const enum InputTypeEnum {
    /** 未初始化 或 不是规定以内的值; 该值作为保留, 其对应真正的inputType为空串"" 仅MainInputTypeSolver可实现 */
    '' = "",
    /** 插入字符 */
    insertText = "insertText",
    /** 替换字符 */
    /** 输入法插入字符 */
    insertCompositionText = "insertCompositionText",
    /**
     * chrome 120 不支持, 将被转为""
     * 插入链接, 在effitor中有如下规定:
     * ev.data 一个EtLink对象的json字符串
     */
    /** Enter换行 */
    insertParagraph = "insertParagraph",
    /** Shift+Enter换行 */
    insertLineBreak = "insertLineBreak",
    /** Backspace删除 */
    deleteContentBackward = "deleteContentBackward",
    /** Delete删除 */
    deleteContentForward = "deleteContentForward",
    /** Ctrl+Backspace删除 */
    deleteWordBackward = "deleteWordBackward",
    /** Ctrl+Delete删除 */
    deleteWordForward = "deleteWordForward",
    /** 拖拽删除 */
    /** 拖拽插入 */
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
    insertFromPaste = "insertFromPaste",
    /** 剪切删除 */
    deleteByCut = "deleteByCut",
    /** 光标Ctrl+x剪切所在行 */
    /** Ctrl+z撤销 */
    historyUndo = "historyUndo",
    /** Ctrl+y重做 */
    historyRedo = "historyRedo",
    /** 加粗 */
    /** 斜体 */
    /** 下划线 */
    /** 删除线 */
    /** 增加缩进（仅段落 */
    formatIndent = "formatIndent",
    /** 减少缩进（仅段落 */
    formatOutdent = "formatOutdent"
}

/* -------------------------------------------------------------------------- */
/*                                  only dev                                  */
/* -------------------------------------------------------------------------- */
/** 内置配置, 不对外导出, 仅开发使用 */
export const enum BuiltinConfig {
    /** 内置Effect前缀, 便于effectBlocker过滤 */
    BUILTIN_EFFECT_PREFFIX = "E"
}
export const enum BuiltinElType {
    UNDEFINED = "undefined",
    RICHTEXT = "richtext",
    PLAINTEXT = "plaintext",
    PARAGRAPH = "paragraph",
    COMPONENT = "component"
}
export const enum BuiltinElName {
    ET_APP = "et-editor",
    ET_BODY = "et-body",
    ET_RICHTEXT = "et-r",
    ET_PLAINTEXT = "et-t",
    ET_PARAGRAPH = "et-p",
    ET_COMPONENT = "et-comp",
    ET_CODE = "et-code",
    ET_IMAGE = "et-img",
    ET_LINK = "et-link",
    ET_LIST = "et-list"
}

/* -------------------------------------------------------------------------- */
/*                            for const to export                             */
/* -------------------------------------------------------------------------- */
export const enum HtmlCharEnum {
    ZERO_WIDTH_SPACE = '\u200B',
    NBSP = '\u00A0',
}
export const enum MIMETypeEnum {
    /** effitor复制元信息, 以json字符串存储 */
    ET_COPY_METADATA = "application/effitor.copy.metadata",
    ET_TEXT_HTML = "text/et-html",
    TEXT_PLAIN = "text/plain",
    TEXT_HTML = "text/html",
}
export const enum CssClassEnum {
    /** 当前活跃 */
    Active = "active",
    /** 当前被拖拽目标 */
    Dragging = "dragging",
    /** 当前拖拽悬浮 */
    Dragover = "dragover",
    /** 当前元素被选择 */
    Selected = "selected",
    /** 用于et-body 选区为Range, 需通过ctx.range.collpased==false判断, Selection.isCollapsed在shadowRoot内不准 */
    SelectionRange = "selection-range",
    /** 用于et-p 标记为标题段落 */
    Heading = "heading",

    /** 前缀缩写符 */
    Prefix = "prefix",
    /** 后缀缩写符 */
    Suffix = "suffix",
    /** 块级缩写符 */
    Block = "block",
}
export const enum CmdTypeEnum  {
    Insert_Node = "Insert_Node",
    Remove_Node = "Remove_Node",
    Replace_Node = "Replace_Node",
    Insert_Text = "Insert_Text",
    /**
     * 构建此命令时, 请确保deleteRange是始末都在同一#text节点的Range
     */
    Delete_Text = "Delete_Text",
    Replace_Text = "Replace_Text",
    /**
     * 该命令只做记录, 用户操作时不执行（由不可取消的beforeinput事件插入）,
     *  撤回栈记录事务时, 将连续的insertCompositionText合并成insertText（或insertNode插入#text节点）,
     *  redo时就执行insertText（或insertNode）; 相应的其逆命令为deleteText（deleteNode）
     */
    Insert_Composition_Text = "Insert_Composition_Text",
    Insert_Content = "Insert_Content",
    Remove_Content = "Remove_Content",
    /**
     * 函数式命令，仅使用三个回调，用于那些不修改dom但又需要可撤销的操作
     *   如 更改缩进
     * * 回调不要与具体的dom节点相关, 否则可能发生异常, 如命令撤回时 虽然节点信息不变, 但已经不是原来那个节点了
     */
    Functional = "Functional",
}