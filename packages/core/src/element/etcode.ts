import { EtType, EtTypeEnum } from '../enums'
import { EtCode, EtCodeTarget } from './config'
import type { EffectElement } from './EffectElement'
import type { EtBlockquote } from './EtBlockquote'
import type { EtComponent } from './EtComponent'
import type { EtEmbedment } from './EtEmbedment'
import type { EtHeading } from './EtHeading'
import type { EtParagraph } from './EtParagraph'
import type { EtRichText } from './EtRichText'

/** 效应类型枚举 */
const Em: { [K in keyof EtType]: EtType[K] } = {
  PlainText: EtTypeEnum.PlainText,
  RichText: EtTypeEnum.RichText,
  Heading: EtTypeEnum.Heading,
  Block: EtTypeEnum.Block,
  Paragraph: EtTypeEnum.Paragraph,
  Blockquote: EtTypeEnum.Blockquote,
  Uneditable: EtTypeEnum.Uneditable,
  Component: EtTypeEnum.Component,
  Embedment: EtTypeEnum.Embedment,
} as const
/** etcode专属元素表 */
interface CodeElementMap {
  [k: number]: EffectElement
  [Em.RichText]: EtRichText
  [Em.Heading]: EtHeading
  [Em.Paragraph]: EtParagraph
  [Em.Component]: EtComponent
  [Em.Embedment]: EtEmbedment
  [Em.Blockquote]: EtBlockquote
}
let count = Object.keys(Em).length
const codeMap = new Map<string, number>()
/**
 * 根据string获取一个唯一code，存在提取，不存在创建, 最多能保有30个code \
 * 为提高效率，获取后应另外保存副本，需要时直接调用副本
 */
const get = (key: string) => {
  let c = codeMap.get(key)
  if (c) return c
  if (count >= 30) {
    count = 0
    throw Error('!! etcode has reached the maximum limit. it would cause some problems.')
  }
  c = 1 << ++count
  return codeMap.set(key, c), c
}
/**
 * 校验一个html元素是否具备某效应; 缺省code时校验其是否为EffectElement \
 * * 这里计算的是相交, 只有有交集, 就认为el具备code的效应; 因此当code是联合效应时,
 *   只要el具有其中一项, 都会认为el具备code的效应
 */
const check = <T extends EffectElement, C extends number = number>(
  el: EtCodeTarget, code?: C,
): el is (EffectElement extends T ? CodeElementMap[C] : T) => {
  if (!code) return el[EtCode] !== void 0
  return !!(el[EtCode] && (el[EtCode] & code))
}
/**
 * 校验一个EtElement下是否允许某节点或某效应, 即其子节点是否允许为该节点或含有某效应类型的节点 \
 * * 当且仅当 `inEtCode & code && !(notInEtCode & code)` 时返回 true
 * @param elOrInEtCode 效应元素或允许的效应码, 当该值为元素时, 将用其notInEtCode属性值作为第三个参数值
 * @param codeOrNode 要校验的子节点或效应码
 * @param notInEtCode 不允许的效应码, 默认为 0; 第一个参数是元素时, 此参数无效
 */
const checkIn = (
  elOrInEtCode: EffectElement | number, codeOrNode: number | Node, notInEtCode = 0,
) => {
  if (typeof elOrInEtCode === 'object') {
    return elOrInEtCode.checkIn(codeOrNode)
  }
  const code = typeof codeOrNode === 'number' ? codeOrNode : codeOrNode.etCode
  if (code === void 0) {
    return true
  }
  if (notInEtCode & code) {
    return false
  }
  if (elOrInEtCode & code) {
    return true
  }
  return false
}
/**
 * 计算子效应和, 即对应元素的所有直接子元素的etCode值的和(或运算); 若没有子效应元素, 则返回0
 */
const checkSum = (el: Element | DocumentFragment) => {
  if (!el.children) {
    return 0
  }
  let sum = 0, code = 0
  for (const child of el.children) {
    if (!(code = (child as EffectElement).etCode)) {
      continue
    }
    sum |= code
  }
  return sum
}

/**
 * 这是一个开发方法; 用于解析一个etCode的由哪些EtType组成
 * @returns 返回一个数组, 组成该etCode的类型名
 */
const parseCode = (code: number) => {
  const keySet = new Set<string>()
  for (const [k, v] of [...Object.entries(Em), ...codeMap.entries()].sort((a, b) => a[1] - b[1])) {
    if (code & v) {
      code -= code & v
      keySet.add(k)
    }
  }
  return [...keySet.keys()]
}

const etcode = import.meta.env.DEV
  ? {
      Em,
      get,
      check,
      checkIn,
      checkSum,
      parseCode,
    } as const
  : {
      Em,
      get,
      check,
      checkIn,
      checkSum,
    } as const

export { etcode }
export type etcodeType = typeof etcode
