import type { Et } from '@effitor/core'
import { etcode } from '@effitor/core'

import type { LinkActionMap } from './effector'
import type { EtLinkElement } from './EtLinkElement'

export const enum LinkEnum {
  ElName = 'et-link',

  Popup_Key = '__popup_$et-link',

  Class_Popup = 'et-link-popup',
  Class_Popup_Input = 'et-link-popup_input',
  Class_Popup_Items = 'et-link-popup_items',
  Class_Dialog_Input = 'et-link-dialog_input',
  Class_Dialog_Btn = 'et-link-dialog_btn',

  Name_Max_Length = 128,
  Url_Max_Length = 1024,
}

declare module '@effitor/core' {
  interface DefinedEtElementMap {
    [LinkEnum.ElName]: EtLinkElement
  }
  interface EditorSchema {
    /** 链接元素类, 仅在使用了链接插件(useLinkPlugin)时非空 */
    link: typeof EtLinkElement
  }
  interface EditorActions {
    /** link plugin actions */
    link: LinkActionMap
  }
  interface EditorPluginContext {
    $linkPx: {
      readonly mdUrlMapping: Partial<Et.MdUrlMapping>
      readonly urlReg: RegExp
      /** 链接元素的名称最大长度, 默认 128 */
      readonly maxNameLength: number
      /** 链接元素的url最大长度, 默认 1024 */
      readonly maxUrlLength: number
    }
  }
  interface EffectHandleDeclaration {
    /**
     * 识别markdown链接: remainText[showText](url title)
     * * 当输入`)`时, 对当前ctx.node文本节点内容进行校验, 校验成功后invoke此效应,
     * * 此效应会删除链接文本, 保留剩余文本, 或剩余文本为空, 则直接删除当前ctx.node
     */
    markLink: Et.EffectHandle<Et.ValidTargetCaretAtText>
  }
}

export const urlSchemeList = [
  'http://',
  'https://',
  'www.',
  // 'ftp://',
  // 'file://',
  // 'mailto:',
  // 'tel:',
  // 'sms:',
  // 'geo:',
  // 'data:',
  // 'about:',
  // 'chrome:',
  // 'chrome-extension:',
  // 'moz-extension:',
  // 'ms-settings:',
  // 'ms-word:',
  // 'ms-excel:',
]

export const LINK_ET_TYPE = etcode.get(LinkEnum.ElName)

export interface LinkPluginContextOptions {
  /** 支持的url shceme 列表(即markdown链接中url的前缀), 默认支持 `https://`  和 `http://` `www.` */
  urlSchemes?: string[]
  /** markdown 互转时的 url 映射函数; */
  mdUrlMapping?: Partial<Et.MdUrlMapping>
  /** 链接元素的名称最大长度, 默认 128 */
  maxNameLength?: number
  /** 链接元素的url最大长度, 默认 1024 */
  maxUrlLength?: number
}

export const initLinkPluginContext = (meta: Et.EditorContextMeta, options?: LinkPluginContextOptions) => {
  const schemes = [...new Set([...urlSchemeList, ...(options?.urlSchemes || [])])].join('|')
  const urlReg = new RegExp(`^(${schemes})[^\\s]+\\.[^\\s]+$`)
  meta.pctx.$linkPx = {
    mdUrlMapping: { ...options?.mdUrlMapping },
    urlReg,
    maxNameLength: options?.maxNameLength || LinkEnum.Name_Max_Length,
    maxUrlLength: options?.maxUrlLength || LinkEnum.Url_Max_Length,
  }
}
