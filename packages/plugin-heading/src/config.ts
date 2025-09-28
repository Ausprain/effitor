import type { Et } from '@effitor/core'

import type { EtHeadingElement } from './element'

export const enum HeadingEnum {
  ElName = 'et-heading',
}

declare module '@effitor/core' {
  interface DefinedEtElementMap {
    [HeadingEnum.ElName]: EtHeadingElement
  }
  export interface EffectHandleDeclaration {
    /** 将普通段落转为标题 */
    checkAtxToHeading: (ctx: Et.UpdatedContext, payload: {
      level: Et.HeadingLevel
      paragraph: Et.Paragraph
    }) => boolean
    /** 将标题回退为段落 */
    regressHeadingToParagraph: (ctx: Et.UpdatedContext, payload: {
      heading: EtHeadingElement
    }) => boolean
  }
}
