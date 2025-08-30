import type { Et } from '~/core/@types'

import { BuiltinElName, EtTypeEnum } from '../enums'
import { EtParagraph } from './EtParagraph'

/**
 * 组件节点, 只有含嵌套contenteditable的元素, 才算组件节点; 任何含嵌套contenteditable的元素, 都应继承该类
 */
export abstract class EtComponent extends EtParagraph {
  static readonly elName: string = BuiltinElName.ET_COMPONENT
  static readonly etType = super.etType
    | EtTypeEnum.Component
    | EtTypeEnum.Uneditable

  /**
   * component比较始终为false
   */
  isEqualTo(_el: Et.Element) {
    return false
  }

  toNativeElement() {
    return document.createElement('div')
  }

  /**
   * 光标聚焦到组件内部可编辑节点
   * @param ctx 编辑器上下文
   * @param toStart 是否聚焦到开始位置
   * @returns 聚焦到的元素
   */
  abstract focusToInnerEditable(ctx: Et.EditorContext, toStart: boolean): Et.HTMLElement
}
