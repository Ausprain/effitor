/**
 * 系统层面的编辑行为按键映射
 */

import type { Et } from '~/core/@types'

import { platform } from '../config'
import { Key } from './Key'
import { CtrlCmd, Mod, WordModifier } from './Mod'
import { create, createAction, withMod } from './util'

type EffectOrAction = Et.InputType | ((ctx: Et.UpdatedContext) => boolean)

export type KeyboardCodeKeyDownEffectMap = Record<string, EffectOrAction>
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
 * 系统层面的编辑行为, 在 (插件)KeydownSovler 之前执行, 执行成功则结束keydown事件周期
 */
export const keyboardCodeKeyDownBuiltinMap: KeyboardCodeKeyDownEffectMap = {
  [create(Key.Home, Mod.None)]: ctx => ctx.selection.modify('move', 'backward', 'lineboundary'),
  [create(Key.End, Mod.None)]: ctx => ctx.selection.modify('move', 'forward', 'lineboundary'),

  [create(Key.ArrowUp, Mod.None)]: ctx => ctx.selection.modify('move', 'backward', 'line'),
  [create(Key.ArrowDown, Mod.None)]: ctx => ctx.selection.modify('move', 'forward', 'line'),
  [create(Key.ArrowLeft, Mod.None)]: ctx => ctx.selection.modify('move', 'backward', 'character'),
  [create(Key.ArrowRight, Mod.None)]: ctx => ctx.selection.modify('move', 'forward', 'character'),

  [create(Key.ArrowUp, CtrlCmd)]: ctx => ctx.selection.modify('move', 'backward', 'documentboundary'),
  [create(Key.ArrowDown, CtrlCmd)]: ctx => ctx.selection.modify('move', 'forward', 'documentboundary'),
  [create(Key.ArrowLeft, WordModifier)]: ctx => ctx.selection.modify('move', 'backward', 'word'),
  [create(Key.ArrowRight, WordModifier)]: ctx => ctx.selection.modify('move', 'forward', 'word'),

  [create(Key.ArrowUp, CtrlCmd | Mod.Shift)]: ctx => ctx.selection.modify('extend', 'backward', 'documentboundary'),
  [create(Key.ArrowDown, CtrlCmd | Mod.Shift)]: ctx => ctx.selection.modify('extend', 'forward', 'documentboundary'),
  [create(Key.ArrowLeft, Mod.Shift)]: ctx => ctx.selection.modify('extend', 'backward', 'character'),
  [create(Key.ArrowRight, Mod.Shift)]: ctx => ctx.selection.modify('extend', 'forward', 'character'),
  [create(Key.ArrowLeft, WordModifier | Mod.Shift)]: ctx => ctx.selection.modify('extend', 'backward', 'word'),
  [create(Key.ArrowRight, WordModifier | Mod.Shift)]: ctx => ctx.selection.modify('extend', 'forward', 'word'),
  // TODO ...

  /* -------------------------------------------------------------------------- */
  /*                            MacOS 下的特殊按键映射                            */
  /* -------------------------------------------------------------------------- */
  ...(platform.isMac
    ? {
      // cmd + backspace 删除至行首
        [create(Key.Backspace, CtrlCmd)]: (ctx) => {
          if (ctx.selection.isCaretAtParagraphStart) {
            return false
          }
          ctx.commandManager.commitNextHandle()
          ctx.selection.modify('extend', 'backward', 'lineboundary')
          ctx.dispatchInputEvent('beforeinput', {
            inputType: 'deleteContentBackward',
          })
          return true
        },
        // cmd + delete 删除至行尾
        [create(Key.Delete, CtrlCmd)]: (ctx) => {
          if (ctx.selection.isCaretAtParagraphEnd) {
            return false
          }
          ctx.commandManager.commitNextHandle()
          ctx.selection.modify('extend', 'forward', 'lineboundary')
          ctx.dispatchInputEvent('beforeinput', {
            inputType: 'deleteContentForward',
          })
          return true
        },
      }
    : {}),
}

/**
 * 默认的编辑行为按键映射, 在 MainKeydownSolver 中执行
 */
export const keyboardCodeKeyDownDefaultMap: KeyboardCodeKeyDownEffectMap = {
  [create(Key.Backspace, Mod.None)]: 'deleteContentBackward',
  [create(Key.Backspace, WordModifier)]: 'deleteWordBackward',
  [create(Key.Delete, Mod.None)]: 'deleteContentForward',
  [create(Key.Delete, WordModifier)]: 'deleteWordForward',
  // TODO ...
}

/**
 * 内置快捷键操作列表
 */
export const builtinHotkeyActionMap = {
  /** 撤销 */
  editorUndo: createAction('editor', '撤销', { hotkey: withMod(Key.Z) }),
  /** 重做 */
  editorRedo: createAction('editor', '重做', { hotkey: withMod(Key.Z, Mod.Shift) }),
  /** 搜索 */
  editorSearch: createAction('editor', '编辑器内搜索', { hotkey: withMod(Key.F) }),
  /** 复制 */
  editorCopy: createAction('editor', '复制', { hotkey: withMod(Key.C) }),
  /** 粘贴 */
  editorPaste: createAction('editor', '粘贴', { hotkey: withMod(Key.V) }),
  /** 剪切 */
  editorCut: createAction('editor', '剪切', { hotkey: withMod(Key.X) }),

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
