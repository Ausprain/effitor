import type { Et } from '~/core/@types'

import { BuiltinElName, EtTypeEnum } from '../enums'
import { EtParagraph } from './EtParagraph'

/**
 * 段落组抽象类, 初始化仅支持 (段落, 标题, 组件) 作为其子节点, 若插件需要增加其支持的效应元素类型,
 * 如列表, 应额外通过 extentEtElement 扩展空 handler 来间接扩充其允许的子元素效应类型
 * @example
 * extentEtElement(EtBlockquote, {}, [ EtListElement ])
 */
export abstract class EtBlockquoteElement extends EtParagraph {
  static readonly elName: string = BuiltinElName.ET_BLOCKQUOTE
  static readonly etType = super.etType | EtTypeEnum.Blockquote
  /** blockquote 下允许一切段落效应 */
  static readonly inEtType: number = EtTypeEnum.Paragraph
  /** blockquote 不允许自身嵌套, 内联文本元素 或内嵌元素 */
  static readonly notInEtType: number = EtTypeEnum.Blockquote
    | EtTypeEnum.Embedment
    | EtTypeEnum.PlainText
    | EtTypeEnum.RichText

  /** Blockquote 内的第一个段落 */
  abstract get firstParagraph(): EtParagraph
  /** Blockquote 内的最后一个段落 */
  abstract get lastParagraph(): EtParagraph

  /** 当前blockquote内部可编辑开始边界, 理论上为firstParagraph内开头 */
  abstract innerStartEditingBoundary(): Et.EtCaret
  /** 当前blockquote内部可编辑末尾边界, 理论上为lastParagraph内结尾 */
  abstract innerEndEditingBoundary(): Et.EtCaret
}
