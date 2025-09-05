import { BuiltinElName } from '../enums'
import type { EtBodyElement } from './EtBodyElement'
import type { EtEditorElement } from './EtEditorElement'
import type { EtParagraphElement } from './EtParagraphElement'

export type * from './config'
export * from './EffectElement'
export { EtBlockquote as EtBlockquote } from './EtBlockquote'
export { EtBodyElement } from './EtBodyElement'
export { etcode } from './etcode'
export { EtComponent } from './EtComponent'
export { EtEditorElement } from './EtEditorElement'
export { EtEmbedment } from './EtEmbedment'
export { EtHeading, type HeadingLevel } from './EtHeading'
export { EtParagraph } from './EtParagraph'
export { type EtParagraphCtor, EtParagraphElement } from './EtParagraphElement'
export { EtRichText } from './EtRichText'

interface BuiltinEtElement {
  [BuiltinElName.ET_EDITOR]: EtEditorElement
  [BuiltinElName.ET_BODY]: EtBodyElement
  [BuiltinElName.ET_PARAGRAPH]: EtParagraphElement
}
/**
 * 定义的EtElement映射表, 用于document.createElement()的提示
 * @expendable
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DefinedEtElementMap extends BuiltinEtElement { }
