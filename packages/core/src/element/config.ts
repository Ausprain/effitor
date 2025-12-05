export const ETCODE: unique symbol = Symbol('etCode')
export const IN_ETCODE: unique symbol = Symbol('inEtCode')
export const NOT_IN_ETCODE: unique symbol = Symbol('notInEtCode')

export interface EtCodeTarget {
  /** Effitor 类型增强属性, 指定效应元素的效应码, 除了效应元素, 该值都是undefined */
  readonly [ETCODE]?: number
  /** Effitor 类型增强属性, 指定效应元素的效应码, 除了效应元素, 该值都是undefined */
  readonly etCode?: number
}

export interface EtCode extends EtCodeTarget {
  readonly [ETCODE]: number
  readonly [IN_ETCODE]: number
  readonly [NOT_IN_ETCODE]: number
  /** 效应类型，即该类元素的效应码；用于初始化元素对象的etCode属性; 该值只能使用位运算 */
  readonly etCode: number
  /** 该元素内部直接子节点允许的效应类型; 该值只能使用位运算 */
  readonly inEtCode: number
  /** 该元素内部直接子节点`不`允许的效应类型; 该值只能使用位运算 */
  readonly notInEtCode: number
}

/**
 * 转换为原生 html 元素时样式偏好, 优先使用 class 还是 style 来表示样式;
 * 大多数情况(如复制)都应使用 style, 而如果希望导入为html文档, 则应使用 class
 */
export type ToNativeHTMLPrefers = 'class' | 'style'
