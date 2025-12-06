/**
 * 系统层面的编辑行为按键映射
 */

import type { Et } from '../@types'
import { platform } from '../config'
import { ModKeyDownModifySelectionMap } from './builtinKeydownArrow'
import type { HotkeyAction } from './config'
import { CtrlCmd, LineModifier, Mod, WordModifier } from './Mod'
import { create } from './util'

type InputTypeOrEditorAction = Et.InputType | Et.EditorAction

/**
 * keydown中按下组合键对应行为
 */
export type IModKeyDownEffectMap = Record<string, InputTypeOrEditorAction>

/**
 * 内置快捷键操作列表 \
 * // TODO 待完善
 */
export const BuiltinHotkeyActionMap: Record<string, HotkeyAction> = {
  // /** 撤销 */
  // editorUndo: createAction('editor', '撤销', { hotkey: withMod('KeyZ') }),
  // /** 重做 */
  // editorRedo: createAction('editor', '重做', { hotkey: withMod('KeyZ', Mod.Shift) }),
  // editorRedoOnWindows: createAction('editor', '重做', { hotkey: withMod('KeyY') }),
  /** 搜索 */
  // editorSearch: createAction('editor', '编辑器内搜索', { hotkey: withMod('KeyF') }),
  // /** 复制 */
  // editorCopy: createAction('editor', '复制', { hotkey: withMod('KeyC') }),
  // /** 粘贴 */
  // editorPaste: createAction('editor', '粘贴', { hotkey: withMod('KeyV') }),
  // /** 剪切 */
  // editorCut: createAction('editor', '剪切', { hotkey: withMod('KeyX') }),

  // /** 斜体 */
  // markItalic: createAction('editor', '添加斜体', { hotkey: withMod('KeyI') }),
  // /** 粗体 */
  // markBold: createAction('editor', '添加粗体', { hotkey: withMod('KeyB') }),
  // /** 内联代码, mac的 cmd+` 无法拦截, 绑定为ctrl+` */
  // markInlineCode: createAction('editor', '添加内联代码', { hotkey: create('KeyBackquote', Mod.Ctrl) }),
  // /** 删除线 */
  // markStrikethrough: createAction('editor', '添加删除线', { hotkey: withMod('KeyD') }),
  // /** 下划线 */
  // markUnderline: createAction('editor', '添加下划线', { hotkey: withMod('KeyU') }),
  // /** 高亮 */
  // markHighlight: createAction('editor', '添加高亮', { hotkey: withMod('KeyH') }),

  // /** 链接 */
  // insertLink: createAction('editor', '插入链接', { hotkey: withMod('KeyK') }),

}

/**
 * 系统级(不受输入法影响的)按键行为, keydown事件开始时执行, 执行返回 true 则结束keydown事件周期
 */
export const ModKeyDownBuiltinMap: IModKeyDownEffectMap = {
  ...ModKeyDownModifySelectionMap,

  // ctrl+a 逐级全选
  [create('KeyA', CtrlCmd)]: ctx => (ctx.selection.selectAllGradually(), true), // 始终返回 true, 禁止逃逸触发浏览器默认行为

  /* -------------------------------------------------------------------------- */
  /*                                 撤销 / 重做                                 */
  /* -------------------------------------------------------------------------- */
  // 1. 撤销重做放这里 而不放 hotkey, 是因为要支持 repeat
  // 2. Windows 下 ctrl+y 是传统的重做快捷键
  [create('KeyZ', CtrlCmd)]: 'historyUndo',
  [create('KeyZ', CtrlCmd | Mod.Shift)]: 'historyRedo',

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
        [create('KeyY', CtrlCmd)]: 'historyRedo',
      }),
}

type ParagraphMoveCopyEffect = 'ParagraphMoveUp' | 'ParagraphMoveDown' | 'ParagraphCopyUp' | 'ParagraphCopyDown'
const tryMoveOrCopyCurrentParagraph = (ctx: Et.EditorContext, effect: ParagraphMoveCopyEffect) => {
  const p = ctx.selection.isSelectionInSameParagraph()
  if (!p) {
    return false
  }
  return ctx.effectInvoker.invoke(p, effect, ctx,
    ctx.selection.getTargetRange() as Et.ValidTargetRangeWithParagraph,
  )
}
/**
 * 默认的编辑行为按键映射, 在 MainKeydownSolver 之后执行
 */
export const ModKeyDownDefaultMap: IModKeyDownEffectMap = {

  /* -------------------------------------------------------------------------- */
  /*                                   编辑行为                                  */
  /* -------------------------------------------------------------------------- */

  // 移动相关
  [create('ArrowUp', Mod.AltOpt)]: ctx => tryMoveOrCopyCurrentParagraph(ctx, 'ParagraphMoveUp'),
  [create('ArrowDown', Mod.AltOpt)]: ctx => tryMoveOrCopyCurrentParagraph(ctx, 'ParagraphMoveDown'),
  // 移动拷贝
  [create('ArrowUp', Mod.AltOpt | Mod.Shift)]: ctx => tryMoveOrCopyCurrentParagraph(ctx, 'ParagraphCopyUp'),
  [create('ArrowDown', Mod.AltOpt | Mod.Shift)]: ctx => tryMoveOrCopyCurrentParagraph(ctx, 'ParagraphCopyDown'),
  // 删除相关
  [create('Backspace', Mod.None)]: 'deleteContentBackward',
  [create('Backspace', Mod.Shift)]: 'deleteContentBackward',
  [create('Backspace', WordModifier)]: 'deleteWordBackward',
  [create('Delete', Mod.None)]: 'deleteContentForward',
  [create('Delete', Mod.Shift)]: 'deleteContentForward',
  [create('Delete', WordModifier)]: 'deleteWordForward',
  [create('Backspace', LineModifier)]: 'deleteSoftLineBackward',
  [create('Delete', LineModifier)]: 'deleteSoftLineForward',
  // 插入相关
  [create('Enter', Mod.None)]: 'insertParagraph',
  [create('Enter', Mod.Shift)]: 'insertLineBreak',
  [create('Enter', CtrlCmd)]: (ctx) => {
    const tc = ctx.selection.getTargetCaret()
    return tc
      ? ctx.commonHandler.appendParagraph(tc, { topLevel: false })
      : false
  },
  // cmd+shift+enter / ctrl+shift+enter 无视光标位置, 在当前顶层段落后边追加一个普通段落
  [create('Enter', CtrlCmd | Mod.Shift)]: (ctx) => {
    const tc = ctx.selection.getTargetCaret()
    return tc
      ? ctx.commonHandler.appendParagraph(tc, { topLevel: true })
      : false
  },
  // TODO ...
}

/**
 * keydown 事件中放行默认行为的按键组合, 默认放行 复制/剪切/粘贴
 */
export const KeepDefaultModkeyMap: Et.EditorContextMeta['keepDefaultModkeyMap'] = {
  [create('KeyX', CtrlCmd)]: true,
  [create('KeyC', CtrlCmd)]: true,
  [create('KeyV', CtrlCmd)]: true,
}
