import { BuiltinElName } from '../enums'
import type { EtBodyElement } from './EtBodyElement'
import type { EtEditorElement } from './EtEditorElement'
import type { EtParagraphElement } from './EtParagraphElement'

export * from './EffectElement'
export { EtBlockquoteElement as EtBlockquoteElement } from './EtBlockquoteElement'
export { EtBodyElement } from './EtBodyElement'
export { etcode } from './etcode'
export { EtComponentElement } from './EtComponentElement'
export { EtEditorElement } from './EtEditorElement'
export { EtEmbedElement as EtEmbedmentElement } from './EtEmbedElement'
export { EtHeadingElement } from './EtHeadingElement'
export { EtParagraph } from './EtParagraph'
export { type EtParagraphCtor, EtParagraphElement } from './EtParagraphElement'
export { EtRichTextElement } from './EtRichTextElement'

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
