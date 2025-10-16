import { etcode } from '@effitor/core'

export const enum ListEnum {
  List = 'et-list',
  List_U = 'ET-LIST',
  Li = 'et-li',
  Li_U = 'ET-LI',
  Default_Unordered_Style_Type = 'disc',
  Default_Ordered_Style_Type = 'decimal',
}

export const enum ListAttr {
  Ordered = 'ordered',
  Style_Type = 'style-type',
  Check = 'et-check',
}

export interface ListType {
  ordered: boolean
  styleType: string
}

/**
 * 列表样式类型映射;
 * * 转markdown时, 将列表号插入到第一个项目的文本开头, 解析时抽出以恢复EtListElement的样式 ( 除 disc 和 decimal )
 */
// enum styleTypeMapping {
//     '-' = 'dash',
//     '*' = 'disc',
//     '1.' = 'decimal',
//     '一、' = 'cjk-ideographic',
//     '甲、' = 'cjk-heavenly-stem',
//     '子、' = 'cjk-earthly-branch',
//     'a.' = 'lower-alpha',
//     'A.' = 'upper-alpha',
//     'i.' = 'lower-roman',
//     'I.' = 'upper-roman',
// }

export const styleTypeMapping = (() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj = {} as any
  obj[obj['-'] = 'dash'] = '-'
  obj[obj['*'] = 'disc'] = '*'
  obj[obj['1.'] = 'decimal'] = '1.'
  obj[obj['一、'] = 'cjk-ideographic'] = '一、'
  obj[obj['甲、'] = 'cjk-heavenly-stem'] = '甲、'
  obj[obj['子、'] = 'cjk-earthly-branch'] = '子、'
  obj[obj['a.'] = 'lower-alpha'] = 'a.'
  obj[obj['A.'] = 'upper-alpha'] = 'A.'
  obj[obj['i.'] = 'lower-roman'] = 'i.'
  obj[obj['I.'] = 'upper-roman'] = 'I.'
  return obj
})()

export const unOrderedListStyle = ['dash', 'disc']
export const commonMarkdownSupportStyle = ['disc', 'decimal']

export const LIST_ET_TYPE = etcode.get(ListEnum.List)
export const LIST_ITEM_ET_TYPE = etcode.get(ListEnum.Li)
