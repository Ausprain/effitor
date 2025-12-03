import type { Et } from '@effitor/core'

import { ListEnum, ListType } from './config'
import type { ListActionMap } from './effector'
import type { EtListElement, EtListItemElement } from './EtListElement'

declare module '@effitor/core' {
  interface DefinedEtElementMap {
    [ListEnum.List]: EtListElement
    [ListEnum.Li]: EtListItemElement
  }
  interface EditorSchema {
    /** 列表元素类, 仅在使用了列表插件(useLinkPlugin)时非空 */
    list: typeof EtListElement
    /** 列表项元素类, 仅在使用了列表插件(useLinkPlugin)时非空 */
    listItem: typeof EtListItemElement
  }
  interface EditorActions {
    /** list plugin actions */
    list: ListActionMap
  }

  interface EffectHandleDeclaration {
    /* ---------------------------- mark list handler --------------------------- */

    /**
     * 将普通段落替换为列表
     * @param payload 列表类型、被替换的段落元素
     */
    replaceParagraphWithList: (ctx: Et.EditorContext, payload: {
      /** 列表类型 */
      listType: ListType
      /** 被替换的段落元素 */
      paragraph: Et.EtParagraphElement
      /** 是否移动段落内容到列表项中, 默认 false, 即替换段落为一个新列表 */
      moveContents?: boolean
    }) => boolean

    /* ----------------------------- in list item handler ---------------------------- */

    /** 光标位于 li 开头 tab 增加缩进 */
    listItemIndent: (ctx: Et.EditorContext, payload: {
      targetCaret: Et.ValidTargetCaretWithParagraph<EtListItemElement>
    }) => boolean
    /** 光标所在段落是 li, shift+tab 减少缩进 */
    listItemOutdent: (ctx: Et.EditorContext, payload: {
      targetCaret: Et.ValidTargetCaretWithParagraph<EtListItemElement>
    }) => boolean
    /** alt+arrowUp 列表项上移 */
    listItemMoveUp: (ctx: Et.EditorContext, payload: {
      targetCaret: Et.ValidTargetCaretWithParagraph<EtListItemElement>
    }) => boolean
    /** alt+arrowDown 列表项下移 */
    listItemMoveDown: (ctx: Et.EditorContext, payload: {
      targetCaret: Et.ValidTargetCaretWithParagraph<EtListItemElement>
    }) => boolean

  }
}
