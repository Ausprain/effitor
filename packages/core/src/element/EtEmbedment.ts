import type { Et } from '~/core/@types'

import { BuiltinElName, EtTypeEnum } from '../enums'
import { EffectElement } from './EffectElement'

/**
 * 嵌入元素, 只有整体不可编辑的才算嵌入元素, 如 image, audio, video 等
 */
export abstract class EtEmbedment extends EffectElement {
  static readonly elName: string = BuiltinElName.ET_EMBEDMENT
  static readonly etType = EtTypeEnum.Embedment | EtTypeEnum.Uneditable
  // 嵌入效应元素子节点不允许一切效应元素
  static readonly notInEtType: number = -1

  /**
   * embed比较始终为false
   */
  isEqualTo(_el: Et.Element) {
    return false
  }
}
