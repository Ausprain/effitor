import type { Et } from '../@types'
import { ConfigManager } from '../editor/ConfigManager'
import {
  BuiltinHotkeyActionMap,
  ModKeyDownBuiltinMap,
  ModKeyDownDefaultMap,
  ModKeyDownEffectMap,
} from './builtin'
import { type A_actionKey, type A_hotkey, type HotkeyAction, HotkeyEnum } from './config'
import { keyChars } from './Key'
import { CtrlCmd, Mod, modChar } from './Mod'
import { create, createAction, modKey, withMod } from './util'

declare module '../editor/ConfigManager' {
  interface UserConfig {
    hotkeyData?: HotkeyData
  }
}

/** 快捷键 -> 操作名的映射，用于持久化存储 */
type HotkeyActionKeyMapping = Record<A_hotkey, A_actionKey>
type HotkeyActionMapping = Record<A_hotkey, HotkeyAction>
type ActionMap = Record<A_actionKey, HotkeyAction>

/** 快捷键配置持久化存储对象 */
interface HotkeyData {
  hotkeyMapping: HotkeyActionKeyMapping
}

/**
 * 快捷键管理器
 */
export class HotkeyManager {
  private readonly _builtinModKeyEffect: ModKeyDownEffectMap
  private readonly _defaultModKeyEffect: ModKeyDownEffectMap

  /** 快捷键配置, 快捷键-> 动作名; 用于自定义绑定动作的快捷键, 以及持久化配置 */
  private readonly _hotkeyActionKeyMap: HotkeyActionKeyMapping
  /** 快捷键map, 快捷键 -> 动作; 用于根据 hotkey 执行 action.run */
  private readonly _hotkeyActionMap: HotkeyActionMapping
  /** 快捷键动作map, 动作名 -> 动作; 用于根据 actionKey 更新 action.run */
  private readonly _actionMap: ActionMap

  readonly create = create
  readonly withMod = withMod
  readonly createAction = createAction

  private _modkey = ''
  /** 当前 keydown 按下的按键组合, 通过 `hotkey.modKey` 计算 */
  get modkey() {
    return this._modkey
  }

  /**
   * 设置当前 keydown 按下的按键组合
   * @param ev KeyboardEvent 事件对象
   */
  setModkey(ev: KeyboardEvent) {
    this._modkey = modKey(ev)
  }

  /**
   * 检查当前 keydown 按下的按键组合含 modifier 修饰键
   * @param modifier Mod.AltOpt | Mod.Ctrl | Mod.MetaCmd | Mod.Shift 修饰键, 缺省时自动适配 CtrlCmd
   */
  checkWithMod(modifier?: Mod.AltOpt | Mod.Ctrl | Mod.MetaCmd | Mod.Shift) {
    const [_, mod] = this._modkey.split(HotkeyEnum.Connector)
    const num = parseInt(mod)
    if (modifier) {
      return num === modifier
    }
    return num === CtrlCmd
  }

  private readonly _configManager: ConfigManager
  constructor(
    private readonly _ctx: Et.EditorContext,
  ) {
    // TODO 设置 hotkeyData 配置更新检查器
    // this._configManager.setConfigChecker('hotkeyData', (config) => {})
    this._configManager = _ctx.editor.configManager
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
    this.addActions(BuiltinHotkeyActionMap)
    // 恢复存储的快捷键配置
    const hotkeyData = this._configManager.getConfig('hotkeyData')
    let needUpdateConfig = false
    if (hotkeyData && hotkeyData.hotkeyMapping) {
      if (typeof hotkeyData.hotkeyMapping !== 'object') {
        needUpdateConfig = true
      }
      else {
        for (const [hotkey, actionKey] of Object.entries(hotkeyData.hotkeyMapping)) {
          if (actionKey in this._actionMap) {
            this._hotkeyActionKeyMap[hotkey] = actionKey
          }
          else {
            needUpdateConfig = true
          }
        }
      }
    }
    else {
      needUpdateConfig = true
    }
    if (needUpdateConfig) {
      this._configManager.updateConfig('hotkeyData', {
        hotkeyMapping: { ...this._hotkeyActionKeyMap },
      })
    }

    // 加载内置系统级按键行为
    this._builtinModKeyEffect = ModKeyDownBuiltinMap
    // 加载默认按键行为
    this._defaultModKeyEffect = ModKeyDownDefaultMap
  }

  /**
   * 根据当前 modkey 调用 effectMap 中对应的 effectAction
   * * 可在插件效应器中根据指定效应元素监听指定快捷键列表
   * @param effectActionMap modkey 到 effectAction 的映射, effectAction 可以是 inputType 字符串, 或带一个 ctx 参数的函数
   * @returns 是否监听成功, 如果 effectAction 是函数, 则返回的是函数执行结果
   */
  listenEffect(effectActionMap: ModKeyDownEffectMap) {
    const effect = effectActionMap[this._modkey]
    if (!effect) {
      return false
    }
    if (typeof effect === 'function') {
      return effect(this._ctx)
    }
    this._ctx.body.dispatchInputEvent('beforeinput', { inputType: effect })
    return true
  }

  /**
   * 在 keydown 中监听内置系统级按键行为; 如 MacOS 下 `opt+ArrowLeft` 光标向左移动一个单词等;
   * 监听成功返回 true, 结束 keydown 事件周期
   * * 具体行为在 {@link ModKeyDownBuiltinMap} 中定义;
   */
  listenBuiltin() {
    return this.listenEffect(this._builtinModKeyEffect)
  }

  /**
   * 在 MainKeydownSolver 前监听按键默认行为; 如 `opt+Backspace` 删除一个word
   */
  listenDefault() {
    return this.listenEffect(this._defaultModKeyEffect)
  }

  /**
   * 在 keydown 中监听快捷键绑定; 在 listenBuiltin 失败之后, 插件 keydownSovler 之前执行
   */
  listenBinding() {
    const action = this._hotkeyActionMap[this._modkey]
    if (action && action.run) {
      return action.run(this._ctx)
    }
    return false
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
    this._configManager.updateConfig('hotkeyData', {
      hotkeyMapping: { ...this._hotkeyActionKeyMap },
    })
    return true
  }

  /** 为内置操作绑定执行函数 */
  bindActionRun(runMap: { [k in keyof typeof BuiltinHotkeyActionMap]?: HotkeyAction['run'] }) {
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
