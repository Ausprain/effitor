/**
 * 系统层面的编辑行为按键映射
 */

import type { Et } from '../@types'
import { platform } from '../config'
import type { ActionRun } from './config'
import { Key } from './Key'
import { CtrlCmd, LineModifier, Mod, WordModifier } from './Mod'
import { create, createAction, withMod } from './util'

type InputTypeOrActionRun = Et.InputType | ActionRun['run']

export type KeyboardCodeKeyDownEffectMap = Record<string, InputTypeOrActionRun>
export type KeyboardWritableKeyToImeCharMap = Partial<Record<Et.KeyboardKey, string>>

/**
 * 中文输入法全角标点符号映射
 */
export const keyboardCodeKeydownToChineseImeChar: KeyboardWritableKeyToImeCharMap = {
  '`': '·',
  '~': '～',
  '!': '！',
  '@': '＠',
  '$': '¥',
  '^': '……',
  '(': '（',
  ')': '）',
  '-': '－',
  '_': '——',

  '[': '【',
  ']': '】',
  '{': '「',
  '}': '」',
  '\\': '、',
  '|': '｜',
  ';': '；',
  ':': '：',
  '\'': '‘',
  '"': '“',
  ',': '，',
  '.': '。',
  '<': '《',
  '>': '》',
  '?': '？',
}

/**
 * 内置快捷键操作列表
 */
export const builtinHotkeyActionMap = {
  // /** 撤销 */
  // editorUndo: createAction('editor', '撤销', { hotkey: withMod(Key.Z) }),
  // /** 重做 */
  // editorRedo: createAction('editor', '重做', { hotkey: withMod(Key.Z, Mod.Shift) }),
  /** 搜索 */
  editorSearch: createAction('editor', '编辑器内搜索', { hotkey: withMod(Key.F) }),
  // /** 复制 */
  // editorCopy: createAction('editor', '复制', { hotkey: withMod(Key.C) }),
  // /** 粘贴 */
  // editorPaste: createAction('editor', '粘贴', { hotkey: withMod(Key.V) }),
  // /** 剪切 */
  // editorCut: createAction('editor', '剪切', { hotkey: withMod(Key.X) }),

  /** 斜体 */
  markItalic: createAction('editor', '添加斜体', { hotkey: withMod(Key.I) }),
  /** 粗体 */
  markBold: createAction('editor', '添加粗体', { hotkey: withMod(Key.B) }),
  /** 内联代码, mac的 cmd+\` 无法拦截, 绑定为ctrl+\` */
  markInlineCode: createAction('editor', '添加内联代码', { hotkey: create(Key.Backquote, Mod.Ctrl) }),
  /** 删除线 */
  markDelete: createAction('editor', '添加删除线', { hotkey: withMod(Key.D) }),
  /** 下划线 */
  markUnderline: createAction('editor', '添加下划线', { hotkey: withMod(Key.U) }),
  /** 高亮 */
  markHighlight: createAction('editor', '添加高亮', { hotkey: withMod(Key.H) }),

  /** 链接 */
  insertLink: createAction('editor', '插入链接', { hotkey: withMod(Key.K) }),

}

let moveToDocumentStart, moveToDocumentEnd, extendToDocumentStart, extendToDocumentEnd
if (platform.isFirefox) {
  moveToDocumentEnd = (ctx: Et.EditorContext) => {
    const lastParagraph = ctx.bodyEl.lastChild
    if (!lastParagraph || !ctx.isEtParagraph(lastParagraph)) {
      ctx.editor.blur()
      return true
    }
    ctx.setCaretToAParagraph(lastParagraph, false, true)
    if (ctx.forceUpdate()) {
      ctx.selection.revealSelection(false)
    }
    return true
  }
  moveToDocumentStart = (ctx: Et.EditorContext) => {
    const firstParagraph = ctx.bodyEl.firstChild
    if (!firstParagraph || !ctx.isEtParagraph(firstParagraph)) {
      ctx.editor.blur()
      return true
    }
    ctx.setCaretToAParagraph(firstParagraph, true, true)
    if (ctx.forceUpdate()) {
      ctx.selection.revealSelection(true)
    }
    return true
  }
  extendToDocumentEnd = (ctx: Et.EditorContext) => {
    const lastParagraph = ctx.bodyEl.lastChild
    if (!lastParagraph || !ctx.isEtParagraph(lastParagraph)) {
      ctx.editor.blur()
      return true
    }
    const newRange = lastParagraph.innerEndEditingBoundary().toRange()
    if (!newRange || !ctx.selection.range) {
      ctx.editor.blur()
      return true
    }
    newRange.setStart(ctx.selection.range.endContainer, ctx.selection.range.endOffset)
    ctx.selection.selectRange(newRange)
    if (ctx.forceUpdate()) {
      ctx.selection.revealSelection(false)
    }
    return true
  }
  extendToDocumentStart = (ctx: Et.EditorContext) => {
    const firstParagraph = ctx.bodyEl.firstChild
    if (!firstParagraph || !ctx.isEtParagraph(firstParagraph)) {
      ctx.editor.blur()
      return true
    }
    const newRange = firstParagraph.innerStartEditingBoundary().toRange()
    if (!newRange || !ctx.selection.range) {
      ctx.editor.blur()
      return true
    }
    newRange.setEnd(ctx.selection.range.startContainer, ctx.selection.range.startOffset)
    ctx.selection.selectRange(newRange)
    if (ctx.forceUpdate()) {
      ctx.selection.revealSelection(true)
    }
    return true
  }
}
else {
  moveToDocumentEnd = (ctx: Et.EditorContext) => ctx.selection.modify('move', 'forward', 'documentboundary') && ctx.forceUpdate()
  moveToDocumentStart = (ctx: Et.EditorContext) => ctx.selection.modify('move', 'backward', 'documentboundary') && ctx.forceUpdate()
  extendToDocumentEnd = (ctx: Et.EditorContext) => ctx.selection.modify('extend', 'forward', 'documentboundary') && ctx.forceUpdate()
  extendToDocumentStart = (ctx: Et.EditorContext) => ctx.selection.modify('extend', 'backward', 'documentboundary') && ctx.forceUpdate()
}

/**
 * 系统层面的编辑行为, 在 (插件)KeydownSovler 之前执行, 执行成功则结束keydown事件周期
 */
export const keyboardCodeKeyDownBuiltinMap: KeyboardCodeKeyDownEffectMap = {

  /* -------------------------------------------------------------------------- */
  /*                                 撤销 / 重做                                 */
  /* -------------------------------------------------------------------------- */
  // 1. 撤销重做放这里 而不放 hotkey, 是因为要支持 repeat
  // 2. Windows 下 ctrl+y 是传统的重做快捷键
  [create(Key.Z, CtrlCmd)]: 'historyUndo',
  [create(Key.Z, CtrlCmd | Mod.Shift)]: 'historyRedo',

  // TODO ...

  ...(platform.isMac
    /* -------------------------------------------------------------------------- */
    /*                            MacOS 下的特殊按键映射                            */
    /* -------------------------------------------------------------------------- */
    ? {

      }
    /* -------------------------------------------------------------------------- */
    /*                           Windows 下的特殊按键映射                           */
    /* -------------------------------------------------------------------------- */
    : {
      // Windows 下重做快捷键
        [create(Key.Y, CtrlCmd)]: 'historyRedo',
      }),
}

/**
 * 默认的编辑行为按键映射, 在 MainKeydownSolver 之后执行
 */
export const keyboardCodeKeyDownDefaultMap: KeyboardCodeKeyDownEffectMap = {
  /* -------------------------------------------------------------------------- */
  /*                                 光标移动/选择                                */
  /* -------------------------------------------------------------------------- */

  // 1. firefox 不支持 documentboundary 粒度, 需要手动移动或选择
  // 2. chromium 和 safari 在 cmd+shfit+left 之后再 cmd+shift+right 之后会全选当前行
  //    而不是从当前位置要么全选左边, 要么全选右边, 这反直觉, 因此要先 collapsed

  [create(Key.Home, Mod.None)]: ctx => ctx.selection.modify('move', 'backward', 'lineboundary') && ctx.forceUpdate(),
  [create(Key.End, Mod.None)]: ctx => ctx.selection.modify('move', 'forward', 'lineboundary') && ctx.forceUpdate(),
  // 光标移动到行首, MacOS: cmd + left, Windows: alt + left
  [create(Key.ArrowLeft, LineModifier)]: ctx => ctx.selection.modify('move', 'backward', 'lineboundary') && ctx.forceUpdate(),
  [create(Key.ArrowRight, LineModifier)]: ctx => ctx.selection.modify('move', 'forward', 'lineboundary') && ctx.forceUpdate(),

  [create(Key.ArrowUp, Mod.None)]: ctx => (ctx.selection.isCollapsed
    ? ctx.selection.modify('move', 'backward', 'line')
    : ctx.selection.collapse(true, true)) && ctx.forceUpdate(),
  [create(Key.ArrowDown, Mod.None)]: ctx => (ctx.selection.isCollapsed
    ? ctx.selection.modify('move', 'forward', 'line')
    : ctx.selection.collapse(false, true)) && ctx.forceUpdate(),
  [create(Key.ArrowLeft, Mod.None)]: ctx => (ctx.selection.isCollapsed
    ? ctx.selection.modify('move', 'backward', 'character')
    : ctx.selection.collapse(true, true)) && ctx.forceUpdate(),
  [create(Key.ArrowRight, Mod.None)]: ctx => (ctx.selection.isCollapsed
    ? ctx.selection.modify('move', 'forward', 'character')
    : ctx.selection.collapse(false, true)) && ctx.forceUpdate(),
  [create(Key.ArrowUp, CtrlCmd)]: moveToDocumentStart,
  [create(Key.ArrowDown, CtrlCmd)]: moveToDocumentEnd,
  [create(Key.ArrowLeft, WordModifier)]: ctx => (ctx.selection.isCollapsed
    ? ctx.selection.modify('move', 'backward', 'word')
    : ctx.selection.collapse(true, true)) && ctx.forceUpdate(),
  [create(Key.ArrowRight, WordModifier)]: ctx => (ctx.selection.isCollapsed
    ? ctx.selection.modify('move', 'forward', 'word')
    : ctx.selection.collapse(false, true)) && ctx.forceUpdate(),

  // 选择
  [create(Key.ArrowUp, Mod.Shift)]: ctx => ctx.selection.modify('extend', 'backward', 'line') && ctx.forceUpdate(),
  [create(Key.ArrowDown, Mod.Shift)]: ctx => ctx.selection.modify('extend', 'forward', 'line') && ctx.forceUpdate(),
  [create(Key.ArrowUp, CtrlCmd | Mod.Shift)]: extendToDocumentStart,
  [create(Key.ArrowDown, CtrlCmd | Mod.Shift)]: extendToDocumentEnd,
  [create(Key.ArrowLeft, Mod.Shift)]: ctx => ctx.selection.modify('extend', 'backward', 'character') && ctx.forceUpdate(),
  [create(Key.ArrowRight, Mod.Shift)]: ctx => ctx.selection.modify('extend', 'forward', 'character') && ctx.forceUpdate(),
  [create(Key.ArrowLeft, WordModifier | Mod.Shift)]: ctx => ctx.selection.modify('extend', 'backward', 'word') && ctx.forceUpdate(),
  [create(Key.ArrowRight, WordModifier | Mod.Shift)]: ctx => ctx.selection.modify('extend', 'forward', 'word') && ctx.forceUpdate(),
  [create(Key.ArrowLeft, CtrlCmd | Mod.Shift)]: ctx => ctx.selection.collapse(true, false) && ctx.selection.modify('extend', 'backward', 'lineboundary') && ctx.forceUpdate(),
  [create(Key.ArrowRight, CtrlCmd | Mod.Shift)]: ctx => ctx.selection.collapse(false, false) && ctx.selection.modify('extend', 'forward', 'lineboundary') && ctx.forceUpdate(),
  // ctrl+a 逐级全选
  [create(Key.A, CtrlCmd)]: ctx => ctx.selection.selectAllGradually() && ctx.forceUpdate(),

  /* -------------------------------------------------------------------------- */
  /*                                   编辑行为                                  */
  /* -------------------------------------------------------------------------- */

  // 删除相关
  [create(Key.Backspace, Mod.None)]: 'deleteContentBackward',
  [create(Key.Backspace, WordModifier)]: 'deleteWordBackward',
  [create(Key.Delete, Mod.None)]: 'deleteContentForward',
  [create(Key.Delete, WordModifier)]: 'deleteWordForward',
  [create(Key.Backspace, LineModifier)]: 'deleteSoftLineBackward',
  [create(Key.Delete, LineModifier)]: 'deleteSoftLineForward',
  // 插入相关
  [create(Key.Enter, Mod.None)]: 'insertParagraph',
  [create(Key.Enter, Mod.Shift)]: 'insertLineBreak',
  // TODO ...
}

/**
 * keydown 事件中放行默认行为的按键组合, 默认放行 复制/剪切/粘贴
 */
export const defaultKeepDefaultModkeyMap: Et.EditorContextMeta['keepDefaultModkeyMap'] = {
  [create(Key.X, CtrlCmd)]: true,
  [create(Key.C, CtrlCmd)]: true,
  [create(Key.V, CtrlCmd)]: true,
}
