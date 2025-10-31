import type { Et } from '@effitor/core'

import type { EtHeadingElement } from './EtHeadingElement'

export const enum HeadingEnum {
  ElName = 'et-heading',
  Class_HiddenMarker = 'heading-marker--hidden',
}

declare module '@effitor/core' {
  interface DefinedEtElementMap {
    [HeadingEnum.ElName]: EtHeadingElement
  }
  export interface EffectHandleDeclaration {
    /**
     * 将普通段落替换为标题
     * @param payload 标题级别、标题内容、被替换的段落元素
     * @returns 是否成功
     */
    replaceParagraphWithHeading: (ctx: Et.EditorContext, payload: {
      /** 标题级别 */
      level: Et.HeadingLevel
      /** 标题内容 */
      title?: string
      /** 被替换的段落元素 */
      paragraph: Et.EtParagraphElement
    }) => boolean
    /**
     * 将标题回退为普通段落
     */
    regressHeadingToParagraph: (ctx: Et.EditorContext, payload: {
      /** 标题元素 */
      heading: EtHeadingElement
    }) => boolean
  }
}
