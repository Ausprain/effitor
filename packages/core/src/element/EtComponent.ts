import { BuiltinElName, EtTypeEnum } from '@effitor/shared'

import type { Et } from '../@types'
import { EtParagraph } from './EtParagraph'

/**
 * 组件节点, 只有含嵌套contenteditable的元素, 才算组件节点; 任何含嵌套contenteditable的元素, 都应继承该类
 * * 现（v0.2.0）组件默认不支持复制粘贴，复制内容中包含组件节点，将会丢失组件节点
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

  toNativeElement(this: Et.EffectElement, _ctx: Et.EditorContext): null | HTMLElement | (() => HTMLElement) {
    return document.createElement('div')
  }

  onAfterCopy(_ctx: Et.EditorContext): this | null {
    return null
  }

  /**
   * 光标聚焦到组件内部可编辑节点
   * @param ctx 编辑器上下文
   * @param toStart 是否聚焦到开始位置
   * @returns 聚焦到的元素, 若不暴露可返回null
   */
  abstract focusToInnerEditable(ctx: Et.EditorContext, toStart: boolean): HTMLElement | null
}
