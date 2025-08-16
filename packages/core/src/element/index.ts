import { BuiltinElName } from '../enums'
import { EtBodyElement } from './EtBodyElement'
import { EtEditorElement } from './EtEditorElement'
import { EtParagraphElement } from './EtParagraphElement'

export { etcode } from './config'
export * from './EffectElement'
export { EtBlockquoteElement as EtBlockquoteElement } from './EtBlockquoteElement'
export { EtBodyElement } from './EtBodyElement'
export { EtComponentElement } from './EtComponentElement'
export { EtEditorElement } from './EtEditorElement'
export { EtEmbedElement as EtEmbedmentElement } from './EtEmbedElement'
export { EtHeadingElement } from './EtHeadingElement'
export { EtParagraph } from './EtParagraph'
export { type EtParagraphCtor, EtParagraphElement } from './EtParagraphElement'
export { EtRichTextElement } from './EtRichTextElement'
export const elseCssText = `
.etp {
    /* 段落不定位, 若定位, 会影响其后代的position-anchor定位 */
    /* position: relative; */
    display: block;
    padding-block: 0.2em;
    line-height: 1.5;
    hyphens: auto;  /* 末尾单词自动连接符 */
    white-space: pre-wrap;
    /* 两端对齐需要时, 设置在et-body上, 而非段落 */
    /* text-align: justify; */
    /* 分栏在需要时, 设置在段落上 */
    /* column-count: 2; */
}
`

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
