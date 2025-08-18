import type { Et } from '~/core/@types'

import { throttle } from '../utils'
import type { A_actionKey, A_hotkey, ActionGroupMap, ModCode } from './config'
import { CtrlCmd, Key, keyChars, Mod, modChar } from './config'

const enum HotkeyEnum {
  Connector = '_',
  LocalStorageKey = '@effitor_$hotkey-mapping',
}

/**
 * 获取一个快捷键字符串\
 * 最终的快捷键通过 `{KeyName}_{ModNum}` 的形式表示, 如 `ctrl+shift+A` 为 `KeyA_12`
 * @param mod 修饰键, 通过 hotkey.Mod 枚举获取, 多个修饰符通过 | 组合
 * @param key 按键, 通过 hotkey.Key 枚举获取
 */
export const create = (key: Key, mod: ModCode | 0): A_hotkey => {
  return key + HotkeyEnum.Connector + mod
}
/**
 * 获取一个快捷键字符串，该快捷键包含平台自适应的经典修饰键：如Mac的cmd 与 Win的ctrl
 * @param key 按键, 通过 hotkey.Key 枚举获取
 * @param extraMod 额外修饰键, 通过 hotkey.Mod 枚举获取, 默认0
 */
export const withMod = (key: Key, extraMod: ModCode | 0 = 0): A_hotkey => {
  return create(key, (CtrlCmd | extraMod) as ModCode)
}

/**
 * 根据 KeyboardEvent 生成快捷键字符串
 * @param ev 键盘事件
 * @returns 快捷键字符串
 */
export const modKey = (ev: KeyboardEvent) => {
  return ev.code + HotkeyEnum.Connector + (
    (ev.metaKey ? Mod.MetaCmd : 0)
    | (ev.ctrlKey ? Mod.Ctrl : 0)
    | (ev.altKey ? Mod.AltOpt : 0)
    | (ev.shiftKey ? Mod.Shift : 0)
  )
}

type ActionGroup = keyof ActionGroupMap
interface HotkeyAction {
  title: string
  descr: string
  group: ActionGroup
  hotkey: A_hotkey
  canCustom: boolean
  /** 当且仅当返回true，跳过后续操作 */
  run?: (ctx: Et.EditorContext) => boolean
}
/**
 * 创建一个快捷键操作
 * @param group 快捷键所属组别
 * @param title 标题
 * @param hotkey 将绑定的快捷键，使用hotkey函数创建
 * @param descr 快捷键操作描述, 默认空串
 * @param canCustom 是否可绑定自定义快捷键， 默认false
 * @param run 操作执行函数
 */
export const createAction = (group: ActionGroup, title: string, {
  hotkey = '',
  descr = '',
  canCustom = false,
  run = void 0,
}: {
  hotkey?: A_hotkey
  descr?: string
  canCustom?: boolean
  run?: HotkeyAction['run']
}): HotkeyAction => ({
  title,
  descr,
  group,
  hotkey,
  canCustom,
  run: run || (() => {
    if (import.meta.env.DEV) {
      console.warn('该快捷键无对应操作: ', title)
    }
    return false
  }),
})

/**
 * 内置快捷键操作列表
 */
const builtinActions = {
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
  markInlineCode: createAction('editor', '添加内联代码', { hotkey: withMod(Key.Backquote) }),
  /** 删除线 */
  markDelete: createAction('editor', '添加删除线', { hotkey: withMod(Key.D) }),
  /** 下划线 */
  markUnderline: createAction('editor', '添加下划线', { hotkey: withMod(Key.U) }),
  /** 高亮 */
  markHighlight: createAction('editor', '添加高亮', { hotkey: withMod(Key.H) }),

  /** 链接 */
  insertLink: createAction('editor', '插入链接', { hotkey: withMod(Key.K) }),

}

interface HotkeyManagerOptions {
  /** 存储器 */
  saver: (m: HotkeyMapping) => void
  /** 获取器 */
  getter: () => HotkeyMapping
}
/** 快捷键 -> 操作名的映射，用于持久化存储 */
type HotkeyMapping = Record<A_hotkey, string>
/**
 * 获取一个快捷键管理器
 */
export const getHotkeyManager = (ctx: Et.EditorContext, options?: HotkeyManagerOptions) => {
  const hotkeySaver = options
    ? {
        save: options.saver,
        restore: options.getter,
      }
    : {
        save: (m: HotkeyMapping) => {
          return localStorage.setItem(HotkeyEnum.LocalStorageKey, JSON.stringify(m))
        },
        restore: () => JSON.parse(localStorage.getItem(HotkeyEnum.LocalStorageKey) || '{}'),
      }
  const hotkeyMapping: HotkeyMapping = hotkeySaver.restore()
  /** 快捷键map, 快捷键 -> 动作 */
  const hotkeyMap = new Map<A_hotkey, HotkeyAction>()
  /** 快捷键动作map, 动作名 -> 动作 */
  const actionMap = new Map<A_actionKey, HotkeyAction>()
  Object.entries(builtinActions).forEach(([k, v]) => {
    actionMap.set(k, v)
    if (v.hotkey) {
      hotkeyMap.set(v.hotkey, v)
    }
  })
  Object.entries(hotkeyMapping).forEach(([hotkey, acK]) => {
    const action = actionMap.get(acK)
    if (action) {
      hotkeyMap.set(hotkey, action)
    }
  })

  return {
    create,
    withMod,
    createAction,
    /**
     * 监听keydown，返回true说明触发了快捷键，应跳过后续操作\
     * 此方法被throttle包装，10ms内重复调用会被忽略;
     * 但属于立即执行型节流, 执行时可获取返回值; 否则返回值为 undefined
     */
    listen: throttle((modkey: string) => {
      const action = hotkeyMap.get(modkey)
      if (action && action.run) {
        return action.run(ctx)
      }
      return false
    }, 10),
    /**
     * 解析一个快捷键，返回其组成数组, 该数组至少含 2 个元素, 最后一个元素为按键名, 前面的为修饰键简写字符;\
     * 修饰键顺序固定为: `['Ctrl', 'Shift', 'Alt', 'Win']` in Windows, `['⌃', '⇧', '⌥', '⌘']` in MacOS \
     * 如"KeyA_12"(快捷键`ctrl+shift+A`), 对应为: `['Ctrl', 'Shift', 'A']` 或 `['⌃', '⇧', 'A']` \
     */
    parseHotkey(modKey: string) {
      const [key, mod] = modKey.split(HotkeyEnum.Connector)
      const num = parseInt(mod)
      const parts = [
        (num & Mod.Ctrl) ? modChar.ctrl : '',
        (num & Mod.Shift) ? modChar.shift : '',
        (num & Mod.AltOpt) ? modChar.altopt : '',
        (num & Mod.MetaCmd) ? modChar.metacmd : '',
      ].filter(Boolean)
      parts.push(keyChars[key as keyof typeof keyChars] ?? key)
      return parts
    },
    /** 添加一组热键操作, 无视已存在，直接覆盖 */
    addActions(map: Partial<ActionMap>) {
      Object.entries(map).forEach(([k, v]) => {
        if (!v) return
        actionMap.set(k, v)
        if (hotkeyMap.has(v.hotkey)) {
          hotkeyMapping[v.hotkey] = k
        }
        hotkeyMap.set(v.hotkey, v)
      })
    },
    /**
     * 给一个操作重新设置快捷键和执行函数
     * @param [enforce=false] 是否强制设置，无视已存在; 否则若已存在会发出提示
     */
    setHotkey(actionKey: A_actionKey, hotkey: A_hotkey, run?: HotkeyAction['run'], enforce = false) {
      const action = actionMap.get(actionKey)
      if (!action) return false
      if (run) {
        action.run = run
      }
      if (action.hotkey === hotkey) return false
      if (!enforce && hotkeyMap.has(hotkey)) {
        // TODO 提示快捷键冲突
        // const confirm = ctx.popover('该热键已存在, 是否覆盖')
        // if (!confirm) return false
      }
      // 将非默认快捷键的操作记录，用于下次初始化时恢复
      hotkeyMapping[hotkey] = actionKey
      hotkeyMap.set(hotkey, action)
      hotkeySaver.save(hotkeyMapping)
      return true
    },
    /** 为内置操作绑定执行函数 */
    bindActionRun(runMap: { [k in keyof typeof builtinActions]?: Action['run'] }) {
      Object.entries(runMap).forEach(([actionKey, run]) => {
        const action = actionMap.get(actionKey)
        if (!action) return
        action.run = run
      })
    },
    /** 获取所有绑定的快捷键操作, 并分组 */
    allActions() {
      return Object.groupBy(Object.entries(actionMap).map(([k, v]) => {
        return {
          key: k,
          ...v,
        }
      }), v => v.group)
    },
  }
}
export type Manager = ReturnType<typeof getHotkeyManager>
export type ManagerOptions = HotkeyManagerOptions
export type Action = HotkeyAction
export type ActionMap = Record<string, Action>
