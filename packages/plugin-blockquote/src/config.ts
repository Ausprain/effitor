import type { Et } from '@effitor/core'

import type { EtBlockquoteElement } from './EtBlockquoteElement'

export const enum BlockquoteEnum {
  ElName = 'et-bq',
}

export const enum BlockquoteType {
  NOTE = 'note',
  TIP = 'tip',
  IMPORTANT = 'important',
  WARNING = 'warning',
  CAUTION = 'caution',
  // 段落组 (分栏)
  PG = 'pg',
  PG2 = 'pg2',
  PG3 = 'pg3',
}

declare module '@effitor/core' {
  interface EditorSchema {
    blockquote: typeof EtBlockquoteElement
  }
  interface DefinedEtElementMap {
    [BlockquoteEnum.ElName]: EtBlockquoteElement
  }
  interface EditorPluginContext {
    $bqPx: BlockquotePluginContext
  }
  interface EffectHandleDeclaration {
    /** 替换段落为引用块 */
    replaceParagraphWithBlockquote: Et.EffectHandle<{
      /** 引用块元数据，缺省时使用基础引用块 */
      meta?: BlockquoteMeta
      /** 被替换的段落元素 */
      paragraph: Et.EtParagraphElement
    }>
  }
}

export interface BlockquotePluginContext {
  readonly metaMap: Record<string, BlockquoteMeta>
}

/**
 * 引用块元数据, 记录在引用块的第一个段落中
 * @example
 * {
 *   type: 'warning',
 *   title: '警告'
 * }
 * 对应元素:
 * <et-bq data-type="warning" data-title="警告"></et-bq>
 *
 * 对应 markdown:
 * > [!WARNING] 警告
 *
 */
export interface BlockquoteMeta {
  /**
   * 引用块类型. 该值会直接赋值给 et-bq 的 data-type 属性, 并将其全大写应用于转化的 markdown 中
   */
  type: string
  /**
   * 引用块标题. 该值会直接赋值给 et-bq 的 data-title 属性; 该属性值可能会被原始 markdown 中的标题内容覆盖;
   * 即假如有一个 markdown 引用块:
   * > [!WARNING] 这是一条警告
   * 则该引用块的 title 为 "这是一条警告"
   */
  title: string
  /**
   * 缩写词, 用于添加到热字符串中, 以便利地插入对应的引用块
   */
  abbr: string
}

const buildinMetaMap: Record<string, BlockquoteMeta> = {
  [BlockquoteType.NOTE.toUpperCase()]: { type: BlockquoteType.NOTE, title: 'Note', abbr: 'note.' },
  [BlockquoteType.TIP.toUpperCase()]: { type: BlockquoteType.TIP, title: 'Tip', abbr: 'tip.' },
  [BlockquoteType.IMPORTANT.toUpperCase()]: { type: BlockquoteType.IMPORTANT, title: 'Important', abbr: 'impt.' },
  [BlockquoteType.WARNING.toUpperCase()]: { type: BlockquoteType.WARNING, title: 'Warning', abbr: 'warn.' },
  [BlockquoteType.CAUTION.toUpperCase()]: { type: BlockquoteType.CAUTION, title: 'Caution', abbr: 'caut.' },
  // 段落组 (分栏)
  [BlockquoteType.PG.toUpperCase()]: { type: BlockquoteType.PG, title: '', abbr: 'pg.' },
  [BlockquoteType.PG2.toUpperCase()]: { type: BlockquoteType.PG2, title: '', abbr: 'pg2.' },
  [BlockquoteType.PG3.toUpperCase()]: { type: BlockquoteType.PG3, title: '', abbr: 'pg3.' },
}

export const initBlockquotePluginContext = (
  ctxMeta: Et.EditorContextMeta,
  {
    metaMap = {},
    withBuiltinMetas = true,
  }: {
    metaMap?: Record<string, BlockquoteMeta>
    withBuiltinMetas?: boolean
  } = {},
) => {
  if (withBuiltinMetas) {
    Object.assign(metaMap, buildinMetaMap)
  }
  ctxMeta.pctx.$bqPx = {
    metaMap,
  }
}
