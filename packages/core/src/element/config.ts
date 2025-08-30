export const EtCode: unique symbol = Symbol('etCode')
export const InEtCode: unique symbol = Symbol('inEtCode')
export const NotInEtCode: unique symbol = Symbol('notInEtCode')

export interface EtCodeTarget {
  /** Effitor 类型增强属性, 指定效应元素的效应码, 除了效应元素, 该值都是undefined */
  readonly [EtCode]?: number
  /** Effitor 类型增强属性, 指定效应元素的效应码, 除了效应元素, 该值都是undefined */
  readonly etCode?: number
}

export interface EtCode extends EtCodeTarget {
  readonly [EtCode]: number
  readonly [InEtCode]: number
  readonly [NotInEtCode]: number
  /** 效应类型，即该类元素的效应码；用于初始化元素对象的etCode属性; 该值只能使用位运算 */
  readonly etCode: number
  /** 该元素内部直接子节点允许的效应类型; 该值只能使用位运算 */
  readonly inEtCode: number
  /** 该元素内部直接子节点`不`允许的效应类型; 该值只能使用位运算 */
  readonly notInEtCode: number
}
