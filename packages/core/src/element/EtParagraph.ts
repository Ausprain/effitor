import type { Et } from '~/core/@types'

import { EtTypeEnum } from '../enums'
import { EffectElement } from './EffectElement'

/**
 * 段落抽象类, 编辑区 EtBodyElement 的子节点必须是段落实例
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export abstract class EtParagraph extends EffectElement {
  static readonly etType = EtTypeEnum.Paragraph | EtTypeEnum.Block

  /** 当前段落内部可编辑开始边界 */
  abstract innerStartEditingBoundary(): Et.EtCaret

  /** 当前段落内部可编辑末尾边界 */
  abstract innerEndEditingBoundary(): Et.EtCaret

  /**
   * 未重写时，会将当前节点的内容提取为纯文本插入到一个新的普通段落节点中
   * 用于自动处理顶层节点的边缘情况，如删除时，自动回退为段落节点, 再次执行删除操作时，就可使用内部的段落边缘处理逻辑\
   * **该方法不可对 DOM 内容进行更改; 返回的普通段落节点必须是副本而不可与当前段落存在引用关系**
   */
  regressToParagraphElement(ctx: Et.EditorContext): EtParagraph {
    const p = ctx.createParagraph()
    p.prepend(this.textContent)
    return p
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface EtParagraph {
  nextSibling: EtParagraph | null
  nextElementSibling: EtParagraph | null
  previousSibling: EtParagraph | null
  previousElementSibling: EtParagraph | null
}
