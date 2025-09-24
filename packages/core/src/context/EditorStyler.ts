import { BuiltinConfig } from '@effitor/shared'

import { Et } from '../@types'

export class EditorStyler {
  constructor(
    private el: Et.EtBodyElement,
  ) {}

  /** 获取一个 css 类名的编辑器内部表示 */
  cssClassName(cls: string) {
    return BuiltinConfig.EDITOR_CSS_CLASS_PREFIX + cls
  }
}
