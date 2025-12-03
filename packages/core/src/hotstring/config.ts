declare module '../editor/ConfigManager' {
  interface UserConfig {
    hotstringData?: HotstringData
  }
}

export interface HotstringData {
  hotstringMapping: Record<string, string>
}

export const enum HotstringEnum {
  TriggerChar = '\x20',
}
