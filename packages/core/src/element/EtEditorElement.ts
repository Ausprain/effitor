import { BuiltinElName, EtTypeEnum } from '@effitor/shared'

import type { EditorContext } from '../context'
import { dom } from '../utils'
import type { ToNativeHTMLPrefers } from './config'
import { EffectElement } from './EffectElement'

/**
 * 编辑器, shadow-root容器 \
 * et-editor作为shadowRoot的host（在shadow dom外部）, 样式需要挂在自己身上; 或者使用 :host \
 * 由于et-editor不参与markdown转换, 因此无需实现toMdast, 继承时可继续使用 abstract类
 */
export abstract class EtEditorElement extends EffectElement {
  static override readonly elName: string = BuiltinElName.ET_EDITOR
  static override readonly etType: number = EtTypeEnum.Uneditable | EtTypeEnum.Block

  static override create() {
    return document.createElement(BuiltinElName.ET_EDITOR) as EtEditorElement
  }

  override connectedCallback(this: EffectElement): void {
    // 插入一个标题
    // const h2 = document.createElement('h2')
    // h2.innerText = 'Effitor Edit Body'
    // this.appendChild(h2)
  }

  toNativeHTML(_ctx: EditorContext, prefers: ToNativeHTMLPrefers, bodyHTML = ''): string {
    if (prefers === 'style') {
      return `<div>${bodyHTML}</div>`
    }
    const el = dom.elementAsEtEl('div', this)
    return el.outerHTML.slice(0, -6) + bodyHTML + '</div>'
  }
}
