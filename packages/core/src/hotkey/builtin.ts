/**
 * 系统层面的编辑行为按键映射
 */

import type { Et } from '..'
import { platform } from '../config'
import { CtrlCmd, Key, Mod } from './config'
import { create } from './manager'

const isMac = platform.isMac
const wordModifier = isMac ? Mod.AltOpt : Mod.Ctrl

type EffectOrAction = keyof Et.DefaultEffectHandleMap | ((ctx: Et.UpdatedContext) => boolean)

type KeyboardCodeKeyDownEffectMap = Record<string, EffectOrAction>

/**
 * 系统层面的编辑行为, 在 (插件)KeydownSovler 之前执行, 执行成功则结束keydown事件周期
 */
export const keyboardCodeKeyDownBuiltinMap: KeyboardCodeKeyDownEffectMap = {
  [create(Key.Home, 0)]: ctx => ctx.selection.modify('move', 'backward', 'lineboundary'),
  [create(Key.End, 0)]: ctx => ctx.selection.modify('move', 'forward', 'lineboundary'),
  [create(Key.ArrowUp, CtrlCmd)]: ctx => ctx.selection.modify('move', 'backward', 'documentboundary'),
  [create(Key.ArrowDown, CtrlCmd)]: ctx => ctx.selection.modify('move', 'forward', 'documentboundary'),
  [create(Key.ArrowLeft, wordModifier)]: ctx => ctx.selection.modify('move', 'backward', 'word'),
  [create(Key.ArrowRight, wordModifier)]: ctx => ctx.selection.modify('move', 'forward', 'word'),
  // TODO ...
}

/**
 * 默认的编辑行为按键映射, 在 MainKeydownSolver 中执行
 */
export const keyboardCodeKeyDownDefaultMap: KeyboardCodeKeyDownEffectMap = {
  [create(Key.Backspace, 0)]: 'EdeleteContentBackward',
  [create(Key.Backspace, wordModifier)]: 'EdeleteWordBackward',
  [create(Key.Delete, 0)]: 'EdeleteContentForward',
  [create(Key.Delete, wordModifier)]: 'EdeleteWordForward',
  // TODO ...
}
