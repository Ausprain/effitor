import type { OmitStringIndexSignature } from '@effitor/shared'

import { defaultConfig } from '../config'
import type { EditorConfig } from '../editor'

type UserConfigItem = string | number | boolean | object | undefined

/**
 * 用户编辑器配置
 * @augmentable
 */
export interface UserConfig extends Record<string, UserConfigItem> {
  editorConfig?: EditorConfig
}

type ConfigChecker = {
  [k in keyof UserConfig]?: (config: unknown) => Required<UserConfig>[k]
}

interface configUpdateInfo {
  /** 此次更新的配置项键名 (config 的属性) */
  updatedKey: keyof UserConfig
  /** 更新后的配置对象 */
  config: Partial<UserConfig>
  /** 更新后的配置对象的json字符串, 这是一个 getter, 若 json 失败, 将返回 "{}" */
  configJson: string
}
interface ConfigManagerOptions {
  onConfigUpdate?: (info: configUpdateInfo) => void
}
export class ConfigManager {
  public readonly config: Partial<UserConfig>

  private readonly updateChecker = {} as ConfigChecker
  private readonly onConfigUpdate

  constructor(configJson?: string, {
    onConfigUpdate,
  } = {} as ConfigManagerOptions) {
    this.onConfigUpdate = onConfigUpdate
    if (!configJson) {
      this.config = {}
    }
    else {
      try {
        this.config = JSON.parse(configJson)
      }
      catch (e) {
        console.error('ConfigManager parse configJson error', e)
        this.config = {}
      }
    }

    this.setConfigChecker('editorConfig', (config) => {
      if (typeof config !== 'object' || config === null) {
        return defaultConfig
      }
      return Object.assign({ ...defaultConfig }, Object.fromEntries(
        Object.entries(defaultConfig).map(([k, v]) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return [k, typeof (config as any)[k] === typeof v ? (config as any)[k] : v]
        }),
      ))
    })
  }

  getConfig<K extends keyof OmitStringIndexSignature<UserConfig>>(key: K): UserConfig[K] | undefined {
    return this.config[key]
  }

  /**
   * 设置配置项更新检查器
   * @param key 配置项键名
   * @param checker 检查器, 校验将要更新的配置项, 并返回正确的配置项
   */
  setConfigChecker<K extends keyof OmitStringIndexSignature<UserConfig>>(key: K, checker: ConfigChecker[K]) {
    this.updateChecker[key] = checker
  }

  /**
   * 更新配置项; 若对应配置项存在更新检查器, 则使用校验后的值进行更新; 否则直接使用传入的 value 原值
   * @param key 配置项键名
   * @param value 配置项值
   */
  updateConfig<K extends keyof OmitStringIndexSignature<UserConfig>>(key: K, value: UserConfig[K]) {
    const ck = this.updateChecker[key]
    this.config[key] = ck ? ck(value) : value
    this.onConfigUpdate?.({
      updatedKey: key,
      config: this.config,
      get configJson() {
        try {
          return JSON.stringify(this.config)
        }
        catch (e) {
          console.error('ConfigManager updateConfig error', e)
          return JSON.stringify({})
        }
      },
    })
  }
}
