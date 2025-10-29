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

/**
 * keydown中按下组合键对应行为
 */
export type ModKeyDownEffectMap = Record<string, InputTypeOrActionRun>

/**
 * 内置快捷键操作列表
 */
export const BuiltinHotkeyActionMap = {
  // /** 撤销 */
  // editorUndo: createAction('editor', '撤销', { hotkey: withMod(Key.Z) }),
  // /** 重做 */
  // editorRedo: createAction('editor', '重做', { hotkey: withMod(Key.Z, Mod.Shift) }),
  // editorRedoOnWindows: createAction('editor', '重做', { hotkey: withMod(Key.Y) }),
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

/**
 * 系统层面的编辑行为, 在 (插件)KeydownSovler 之前执行, 执行成功则结束keydown事件周期
 */
export const ModKeyDownBuiltinMap: ModKeyDownEffectMap = {

  // ctrl+a 逐级全选
  [create(Key.A, CtrlCmd)]: ctx => ctx.selection.selectAllGradually(),

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
export const ModKeyDownDefaultMap: ModKeyDownEffectMap = {

  /* -------------------------------------------------------------------------- */
  /*                                   编辑行为                                  */
  /* -------------------------------------------------------------------------- */

  // 删除相关
  [create(Key.Backspace, Mod.None)]: 'deleteContentBackward',
  [create(Key.Backspace, Mod.Shift)]: 'deleteContentBackward',
  [create(Key.Backspace, WordModifier)]: 'deleteWordBackward',
  [create(Key.Delete, Mod.None)]: 'deleteContentForward',
  [create(Key.Delete, Mod.Shift)]: 'deleteContentForward',
  [create(Key.Delete, WordModifier)]: 'deleteWordForward',
  [create(Key.Backspace, LineModifier)]: 'deleteSoftLineBackward',
  [create(Key.Delete, LineModifier)]: 'deleteSoftLineForward',
  // 插入相关
  [create(Key.Enter, Mod.None)]: 'insertParagraph',
  [create(Key.Enter, Mod.Shift)]: 'insertLineBreak',
  // cmd+opt+enter / ctrl+alt+enter 无视光标位置, 在当前顶层段落后边追加一个普通段落
  [create(Key.Enter, CtrlCmd | Mod.AltOpt)]: (ctx) => {
    const tc = ctx.selection.getTargetCaret()
    if (!tc) {
      return false
    }
    return ctx.commonHandler.appendParagraph(tc, { topLevel: true })
  },
  // TODO ...
}

/**
 * keydown 事件中放行默认行为的按键组合, 默认放行 复制/剪切/粘贴
 */
export const KeepDefaultModkeyMap: Et.EditorContextMeta['keepDefaultModkeyMap'] = {
  [create(Key.X, CtrlCmd)]: true,
  [create(Key.C, CtrlCmd)]: true,
  [create(Key.V, CtrlCmd)]: true,
}
