
export { EtEditorElement, type EtEditorCtor } from './EtEditorElement'
export { EtBodyElement, type EtBodyCtor } from './EtBodyElement'
export { EtRichTextElement, type EtRichTextCtor } from './EtRichTextElement'
export { EtPlainTextElement, type EtPlainTextCtor } from './EtPlainTextElement'
export { EtParagraphElement, type EtParagraphCtor } from './EtParagraphElement'
export { EtComponentElement, type EtComponentCtor } from './EtComponentElement'

import { EtEditorElement } from './EtEditorElement'
import { EtBodyElement } from './EtBodyElement'
import { EtRichTextElement } from './EtRichTextElement';
import { EtPlainTextElement } from './EtPlainTextElement';
import { EtParagraphElement } from './EtParagraphElement';
import { EtComponentElement } from './EtComponentElement';

export const builtinEl = {
    /** 编辑器, shadow-root容器 */
    EtEditorElement,
    /** 编辑区主体 */
    EtBodyElement,
    /** 富文本 */
    EtRichTextElement,
    /** 纯文本 */
    EtPlainTextElement,
    /** 段落 */
    EtParagraphElement,
    /** 组件 */
    EtComponentElement,
}



