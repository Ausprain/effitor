import type { Et } from '../@types'
import { builtinHotkeyActionMap, keyboardCodeKeyDownBuiltinMap, keyboardCodeKeyDownDefaultMap, KeyboardCodeKeyDownEffectMap, keyboardCodeKeydownToChineseImeChar, KeyboardWritableKeyToImeCharMap } from './builtin'
import { type A_actionKey, type A_hotkey, type HotkeyAction, HotkeyEnum } from './config'
import { keyChars } from './Key'
import { Mod, modChar } from './Mod'
import { create, createAction, withMod } from './util'

/** 快捷键 -> 操作名的映射，用于持久化存储 */
type HotkeyActionKeyMapping = Record<A_hotkey, A_actionKey>
type HotkeyActionMapping = Record<A_hotkey, HotkeyAction>
type ActionMap = Record<A_actionKey, HotkeyAction>

/** 快捷键配置持久化存储对象 */
interface HotkeyData {
  hotkeyMapping: HotkeyActionKeyMapping
  imeCharMapping: KeyboardWritableKeyToImeCharMap
}
interface HotkeyDataSaver {
  /** 存储快捷键列表 */
  save: (m: HotkeyData) => void
  /** 恢复快捷键列表 */
  restore: () => HotkeyData
}

export interface HotkeyManagerOptions {
  /** 存储器 */
  saver: (m: HotkeyData) => void
  /** 获取器 */
  getter: () => HotkeyData
}

const getHotkeySaver = (options?: HotkeyManagerOptions) => {
  if (options) {
    return {
      save: options.saver,
      restore: options.getter,
    }
  }
  return {
    save: (m: HotkeyData) => {
      return localStorage.setItem(HotkeyEnum.LocalStorageKey, JSON.stringify(m))
    },
    restore: () => {
      try {
        const data = localStorage.getItem(HotkeyEnum.LocalStorageKey)
        const hotkeyMapping = {} as HotkeyActionKeyMapping
        const imeCharMapping = {} as Record<string, string>
        if (data) {
          const hotkeyData = JSON.parse(data) as HotkeyData
          for (const [k, v] of Object.entries(hotkeyData.hotkeyMapping)) {
            if (typeof v !== 'string') {
              continue
            }
            hotkeyMapping[k] = v
          }
          for (const [k, v] of Object.entries(hotkeyData.imeCharMapping)) {
            if (typeof v !== 'string') {
              continue
            }
            imeCharMapping[k] = v
          }
        }
        return {
          hotkeyMapping,
          imeCharMapping,
        }
      }
      catch (_e) {
        return {
          hotkeyMapping: {},
          imeCharMapping: {},
        }
      }
    },
  }
}

/**
 * 快捷键管理器
 */
export class HotkeyManager {
  private readonly _ctx: Et.EditorContext
  /**
   * KeyboardEvent.key -> 输入字符 映射, 用于解决 MacOS 下无法通过 ev.key === 'Process'
   * 判断当前是否为输入法输入, 从而无法正确地根据输入法状态输入全角标点的问题;
   * 配合 ctx.isUsingIME, 为 true 时从该映射中获取输入字符, 否则输入 ev.key 字符
   */
  private readonly _imeCharMap = {} as Record<string, string>
  /** ime字符 -> KeyboardEvent.key 映射, 用于输入全角的 ime 字符后按空格替换回半角字符 */
  private readonly _imeCharToWritableKey = {} as Record<string, string>
  private readonly _builtinKeydownEffect: KeyboardCodeKeyDownEffectMap
  private readonly _defaultKeydownEffect: KeyboardCodeKeyDownEffectMap

  /** 快捷键数据存储器 */
  private readonly _hotkeyDataSaver: HotkeyDataSaver
  /** 快捷键配置, 快捷键-> 动作名; 用于自定义绑定动作的快捷键, 以及持久化配置 */
  private readonly _hotkeyActionKeyMap: HotkeyActionKeyMapping
  /** 快捷键map, 快捷键 -> 动作; 用于根据 hotkey 执行 action.run */
  private readonly _hotkeyActionMap: HotkeyActionMapping
  /** 快捷键动作map, 动作名 -> 动作; 用于根据 actionKey 更新 action.run */
  private readonly _actionMap: ActionMap

  readonly create = create
  readonly withMod = withMod
  readonly createAction = createAction

  constructor(
    ctx: Et.EditorContext,
    options?: HotkeyManagerOptions,
  ) {
    this._ctx = ctx
    this._hotkeyDataSaver = getHotkeySaver(options)
    const hotkeyData = this._hotkeyDataSaver.restore()

    this._hotkeyActionMap = {}
    this._actionMap = {}
    this._hotkeyActionKeyMap = new Proxy({}, {
      set: (o, hotkey, actionKey) => {
        if (typeof actionKey !== 'string' || typeof hotkey !== 'string') {
          return true
        }
        const action = this._actionMap[actionKey]
        if (!action) {
          return true
        }
        action.hotkey = hotkey
        this._hotkeyActionMap[hotkey] = action
        return Reflect.set(o, hotkey, actionKey)
      },
    })

    // 加载默认快捷键配置
    this.addActions(builtinHotkeyActionMap)
    // 恢复存储的快捷键配置
    for (const [hotkey, actionKey] of Object.entries(hotkeyData.hotkeyMapping)) {
      if (actionKey in this._actionMap) {
        this._hotkeyActionKeyMap[hotkey] = actionKey
      }
    }
    // 加载 ime 字符映射
    this.setImeChars(keyboardCodeKeydownToChineseImeChar)
    // 恢复存储的 ime 映射配置
    for (const [key, imeChar] of Object.entries(hotkeyData.imeCharMapping)) {
      this._imeCharMap[key] = imeChar
    }
    // 加载内置系统级按键行为
    this._builtinKeydownEffect = keyboardCodeKeyDownBuiltinMap
    // 加载默认按键行为
    this._defaultKeydownEffect = keyboardCodeKeyDownDefaultMap
  }

  /**
   * 在 keydown 中监听内置系统级按键行为; 如 MacOS 下 `opt+ArrowLeft` 光标向左移动一个单词等;
   * 监听成功返回 true, 结束 keydown 事件周期
   */
  listenBuiltin(modkey: string) {
    const effect = this._builtinKeydownEffect[modkey]
    if (!effect) {
      return false
    }
    // TODO 此处是否适合用Promise 来异步执行
    if (typeof effect === 'function') {
      Promise.resolve().then(() => {
        console.log('listen builtin run fun')
        effect(this._ctx)
      })
      return true
    }
    Promise.resolve().then(() => {
      this._ctx.dispatchInputEvent('beforeinput', {
        inputType: effect,
      })
    })
    return true
  }

  /**
   * 在 keydown 中监听快捷键绑定; 在 listenBuiltin 失败之后, 插件 keydownSovler 之前执行
   */
  listenBinding(modkey: string) {
    const action = this._hotkeyActionMap[modkey]
    if (action && action.run) {
      return action.run(this._ctx)
    }
    return false
  }

  /**
   * 在 MainKeydownSolver 前监听按键默认行为; 如 `opt+Backspace` 删除一个word
   */
  listenDefault(modkey: string) {
    const effect = this._defaultKeydownEffect[modkey]
    if (!effect) {
      return false
    }
    // TODO 此处是否适合用Promise 来异步执行
    if (typeof effect === 'function') {
      Promise.resolve().then(() => {
        effect(this._ctx)
      })
      return true
    }
    Promise.resolve().then(() => {
      this._ctx.dispatchInputEvent('beforeinput', {
        inputType: effect,
      })
    })
    return true
  }

  /**
   * 获取 KeyboardEvent.key 对应的 IME 字符
   */
  getImeChar(key: string): string | undefined {
    return this._imeCharMap[key]
  }

  /**
   * 获取一个 ime 字符对应的 KeyboardEvent.key 可写字符; 如 `。 -> .`
   * @param imeChar ime字符
   * @returns 一个长度为 1 的字符串, 或 undefined
   */
  getWritableKey(imeChar: string): string | undefined {
    return this._imeCharToWritableKey[imeChar]
  }

  /**
   * 获取 IME 字符映射表, 在需要自定义 ime 字符映射时需要
   */
  getImeCharsMap() {
    return { ...this._imeCharMap }
  }

  /**
   * 设置IME输入替换字符
   * @param mapping KeyboardEvent.key -> IME字符
   */
  setImeChars(mapping: KeyboardWritableKeyToImeCharMap) {
    // 最多允许 2 个字符; 中文破折号/省略号为 2 个字符
    for (const [key, char] of Object.entries(mapping)) {
      if (char) {
        this._imeCharToWritableKey[this._imeCharMap[key] = char.slice(0, 2)] = key
      }
    }
  }

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
  }

  /** 添加一组热键操作, 无视已存在，直接覆盖 */
  addActions(actions: ActionMap) {
    for (const [actionKey, action] of Object.entries(actions)) {
      if (!action) {
        continue
      }
      this._actionMap[actionKey] = action
      if (action.hotkey) {
        this._hotkeyActionKeyMap[action.hotkey] = actionKey
      }
    }
  }

  /**
   * 给一个操作重新设置快捷键和执行函数
   * @param [enforce=false] 是否强制设置，无视已存在; 否则若已存在会发出提示
   */
  setHotkey(actionKey: A_actionKey, hotkey: A_hotkey, run?: HotkeyAction['run'], enforce = false) {
    const action = this._actionMap[actionKey]
    if (!action) return false
    if (run) {
      action.run = run
    }
    if (action.hotkey === hotkey) return true
    if (!enforce && (hotkey in this._hotkeyActionMap)) {
      // TODO 提示快捷键冲突
      // const confirm = ctx.popover('该热键已存在, 是否覆盖')
      // if (!confirm) return false
    }
    this._hotkeyActionKeyMap[hotkey] = actionKey
    this._hotkeyDataSaver.save({
      hotkeyMapping: this._hotkeyActionKeyMap,
      imeCharMapping: this._imeCharMap,
    })
    return true
  }

  /** 为内置操作绑定执行函数 */
  bindActionRun(runMap: { [k in keyof typeof builtinHotkeyActionMap]?: HotkeyAction['run'] }) {
    for (const [actionKey, run] of Object.entries(runMap)) {
      const action = this._actionMap[actionKey]
      if (action) {
        action.run = run
      }
    }
  }

  /** 获取所有绑定的快捷键操作, 并分组 */
  allActions() {
    return Object.groupBy(Object.entries(this._actionMap).map(([actionKey, action]) => {
      return {
        actionName: actionKey,
        ...action,
      }
    }), v => v.group)
  }
}
