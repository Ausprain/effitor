import { EtType, EtTypeEnum } from '@effitor/shared'

import { ETCODE, EtCodeTarget } from './config'
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
  Block: EtTypeEnum.Block,
  Paragraph: EtTypeEnum.Paragraph,
  Blockquote: EtTypeEnum.Blockquote,
  Heading: EtTypeEnum.Heading,
  Component: EtTypeEnum.Component,
  Embedment: EtTypeEnum.Embedment,
  Uneditable: EtTypeEnum.Uneditable,
  AllowEmpty: EtTypeEnum.AllowEmpty,
} as const
/** etcode专属元素表 */
interface EtCodeElementMap {
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

export const etcode = {
  Em,
  /**
   * 根据string(一般用小写元素名)获取一个唯一code，存在提取，不存在创建, 最多能保有30个code \
   * 为提高效率，获取后应另外保存副本，需要时直接引用副本
   */
  get: (key: string) => {
    let c = codeMap.get(key)
    if (c) return c
    if (count >= 30) {
      count = 0
      throw Error('!! etcode has reached the maximum limit. it would cause some problems.')
    }
    c = 1 << count++
    if (import.meta.env.DEV) {
      console.log(`etcode create No.${count - 1}: ${key} -> ${c}`)
    }
    return codeMap.set(key, c), c
  },
  /**
   * 校验一个html元素是否具备某效应; 缺省code时校验其是否为效应元素 \
   * * 这里计算的是相交, 只要有交集, 就认为el具备code的效应; 因此当code是联合效应时,
   *   只要el具有其中一项, 都会认为el具备code的效应
   */
  check: <T extends EffectElement, C extends number = number>(
    el: EtCodeTarget, code?: C,
  ): el is (EffectElement extends T ? EtCodeElementMap[C] : T) => {
    if (code === void 0) return el[ETCODE] !== void 0
    return !!(el[ETCODE] && (el[ETCODE] & code))
  },
  /**
   * 校验一个EtElement下是否允许某节点或某效应, 即其子节点是否允许为该节点或含有某效应类型的节点 \
   * * 当且仅当 `inEtCode & code && !(notInEtCode & code)` 时返回 true
   * * [NB]: 该方法使用交集(而不是子集)判断允许, 即 `inEtCode & code `非 0 就会认为允许, 因此在一些细粒度的
   *         校验中, 需要同时设置合理的 notInEtCode, 以避免误判
   * @param elOrInEtCode 效应元素或允许的效应码, 当该值为效应元素时, 将用其notInEtCode属性值作为第三个参数值
   * @param codeOrNode 要校验的子节点或效应码, 若为 0, 则视为不允许
   * @param notInEtCode 不允许的效应码, 默认为 0; 第一个参数是效应元素时, 此参数传入值无效
   */
  checkIn: (
    elOrInEtCode: EffectElement | number, codeOrNode: number | Node, notInEtCode = 0,
  ) => {
    // 理论上, checkIn 应该是用子集来判断一个效应元素是否允许为另一个效应元素的子节点
    // 但 etType 定义在类对象上, 如果使用子集判断, 那么后续扩展时就必须逐个扩充 inEtType
    // 如 et-body 和 et-bq 下允许一切段落, 插件实现 et-list, et-table 时, 就必须分别对
    // et-body, et-bq, 及其派生类型的 inEtType 进行扩充, 而如果另一个插件从 et-body 派生了一个
    // et-my-body 且覆盖了父类的 inEtType 类属性, 那么 et-list 插件由于无法访问到 et-my-body
    // 就没办法为 et-my-body 添加对应允许的子效应
    // 因此为了更好的扩展性, 这里使用交集的方式判断允许子效应, 并引入 notInEtType 来进行细粒度控制
    if (typeof elOrInEtCode === 'object') {
      notInEtCode = elOrInEtCode.notInEtCode
      elOrInEtCode = elOrInEtCode.inEtCode
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
  },
  /**
   * 计算子效应和, 即对应元素的所有直接子元素的etCode值的和(或运算); 若没有子效应元素, 则返回0
   */
  checkSum: (el: Element | DocumentFragment) => {
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
  },

  /**
   * 这是一个开发方法; 用于解析一个etCode的由哪些EtType组成
   * @returns 返回一个数组, 组成该etCode的类型名
   */
  parseCode: (code: number) => {
    const keySet = new Set<string>()
    for (const [k, v] of [...Object.entries(Em), ...codeMap.entries()].sort((a, b) => a[1] - b[1])) {
      if (code & v) {
        code -= code & v
        keySet.add(k)
      }
    }
    return [...keySet.keys()]
  },
}
