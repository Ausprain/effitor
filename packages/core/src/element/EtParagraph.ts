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
   * 回退为普通段落 (即 ctx.schema.paragraph 配置的元素类实例)\
   * 未重写时，会将当前节点的内容提取为纯文本插入到一个新的普通段落节点中
   * 用于自动处理顶层节点的边缘情况，如删除时，自动回退为段落节点, 再次执行删除操作时，就可使用内部的段落边缘处理逻辑\
   * **该方法不可对 DOM 内容进行更改; 返回的普通段落节点必须是副本而不可与当前段落存在引用关系**
   */
  regressToPlainParagraph(ctx: Et.EditorContext): EtParagraph {
    const p = ctx.createParagraph()
    p.prepend(this.textContent)
    return p
  }

  /**
   * 从普通段落(即 ctx.schema.paragraph 配置的元素类实例) 创建新的"段落"节点\
   * 用于插入在段落中间插入内容时, 将段落转为符合当前顶层节点的"段落",
   * 如 et-list, 子节点只允许 et-li, 则在一个 et-li"段落" 中间插入的所有普通段落
   * 都应转为 et-li"段落" 节点\
   * 未重写时, 创建一个与当前节点同名的元素节点, 并将普通段落内容以当前元素效应码对
   * 内容进行过滤, 然后插入该元素内部, 并返回该元素节点
   * @param plainParagraph 普通段落节点
   * @param _ctx 编辑器上下文
   * @param getNormalizedNodeContents 一个工具函数, 可将普通段落的内容以
   *      当前元素(this)的效应规则进行过滤, 返回包含过滤后内容的片段
   * @returns 新的段落节点
   */
  fromPlainParagraph(
    /** 普通段落节点 */
    plainParagraph: EtParagraph,
    _ctx: Et.EditorContext,
    getNormalizedNodeContents: (node: Node) => Et.Fragment,
  ): EtParagraph {
    const el = document.createElement(this.localName) as EtParagraph
    el.appendChild(getNormalizedNodeContents(plainParagraph))
    return el
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface EtParagraph {
  nextSibling: EtParagraph | null
  nextElementSibling: EtParagraph | null
  previousSibling: EtParagraph | null
  previousElementSibling: EtParagraph | null
}
