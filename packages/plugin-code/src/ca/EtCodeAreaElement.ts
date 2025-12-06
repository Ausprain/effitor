// import { cr, type Et, etcode, EtComponent, EtParagraphElement } from '@effitor/core'

// const enum Enum {
//   CodeArea = 'et-ca',
//   CodeLine = 'et-cl',
// }

// const CODE_TYPE = etcode.get(Enum.CodeArea)
// export const CODE_LINE_TYPE = etcode.get(Enum.CodeLine)

// export class EtCodeAreaElement extends EtComponent {
//   static elName: string = Enum.CodeArea
//   static etType: number = super.etType | CODE_TYPE
//   static inEtType: number = CODE_LINE_TYPE

//   declare lineWrapper: HTMLDivElement & Et.HTMLElement

//   static override create() {
//     const el = document.createElement(this.elName) as EtCodeAreaElement
//     el.lineWrapper = document.createElement('div') as HTMLDivElement & Et.HTMLElement
//     el.lineWrapper.setAttribute('contenteditable', '')
//     el.appendChild(el.lineWrapper)
//     el.lineWrapper.appendChild(document.createElement(Enum.CodeLine))
//     return el
//   }

//   innerStartEditingBoundary(): Et.EtCaret {
//     let firstLine = this.lineWrapper.firstElementChild as EtCodeLineElement
//     if (!firstLine) {
//       firstLine = document.createElement(Enum.CodeLine) as EtCodeLineElement
//       this.lineWrapper.appendChild(firstLine)
//     }
//     return cr.caretInStart(firstLine)
//   }

//   innerEndEditingBoundary(): Et.EtCaret {
//     let lastLine = this.lineWrapper.lastElementChild as EtCodeLineElement
//     if (!lastLine) {
//       lastLine = document.createElement(Enum.CodeLine) as EtCodeLineElement
//       this.lineWrapper.appendChild(lastLine)
//     }
//     return cr.caretInEnd(lastLine)
//   }

//   focusToInnerEditable(ctx: Et.EditorContext, toStart: boolean) {
//     if (toStart) {
//       ctx.setSelection(this.innerStartEditingBoundary())
//     }
//     else {
//       ctx.setSelection(this.innerEndEditingBoundary())
//     }
//     return null
//   }

//   toMdast(mdastNode: Et.CreateMdastNode): Et.ToMdastResult {
//     return mdastNode({
//       type: 'code',
//       value: this.lineWrapper.textContent || '',
//     })
//   }
// }

// export abstract class EtCodeLineElement extends EtParagraphElement {
//   static elName: string = Enum.CodeLine
//   static etType: number = super.etType | CODE_LINE_TYPE
//   static inEtType = 0
// }
