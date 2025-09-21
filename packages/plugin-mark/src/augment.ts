import type { Et } from '@effitor/core'

import { MarkEnum, MarkPluginContext, MarkType } from './config'
import type { EtMarkElement } from './element'

declare module 'mdast' {
  interface Highlight extends Parent {
    type: 'highlight'
    children: PhrasingContent[]
  }
  interface PhrasingContentMap {
    highlight: Highlight
  }
  interface RootContentMap {
    highlight: Highlight
  }
}

declare module '@effitor/core' {
  interface EditorSchema {
    /** mark元素类, 仅在使用了mark插件(useMarkPlugin)时非空 */
    mark: typeof EtMarkElement
  }
  interface DefinedEtElementMap {
    [MarkEnum.ElName]: EtMarkElement
  }
  interface EditorSettings {
    /**
     * 切换 mark 元素的标记符提示功能, 开启时光标落入标记节点内, 会展开标记符
     * * 仅 mounted 之后可用
     * @param hinting 是否开启标记符提示
     */
    toggleHintingMarker: (hinting: boolean) => void
  }
  interface EditorPluginContext {
    [MarkEnum.CtxKey]: MarkPluginContext
  }
  interface EffectHandleDeclaration {
    /* -------------------------------------------------------------------------- */
    /*                              挂到EffectElement上                              */
    /* -------------------------------------------------------------------------- */
    /** 插入标记符节点 */
    checkInsertMarkNode: (_that: Et.EffectHandleThis, ctx: Et.EditorContext, payload: {
      markType: MarkType
      /** 并移除已经插入页面的标记符文本, 若为 undefined 或空串, 则不检查 */
      removeMarkerChars?: string
      /** 目标范围, 为空时使用当前选区; 若非 collapsed, 则返回 false */
      targetRange?: Et.ValidTargetSelection | null
    }) => boolean
    /** 将选区转为mark节点 */
    checkFormatMark: (_that: Et.EffectHandleThis, ctx: Et.EditorContext, payload: {
      markType: MarkType
      /** 目标范围, 为空时使用当前选区 */
      targetRange?: Et.ValidTargetRange | null
    }) => boolean

    /* -------------------------------------------------------------------------- */
    /*                              挂到EtMarkElement上                              */
    /* -------------------------------------------------------------------------- */
    /** 撤销临时节点, 并插入该节点对应的标记字符 */
    // regressToMarkChar: (_that: Et.EffectHandleThis, ctx: Et.EditorContext, markType: MarkType) => boolean
    /** 移除标记节点, 插回文本 */
    // unformatMark: (_that: Et.EffectHandleThis, ctx: Et.EditorContext) => boolean
    /** 标记节点内末尾Delete, 删除标记节点, 并将前标记字符与内容插回 */
    // deleteAtMarkEnd: (_that: Et.EffectHandleThis, ctx: Et.EditorContext) => boolean
  }
}
