import { Effitor, EtBodyElement, EtEditorElement, EtHeading, EtParagraphElement } from './src'

const editor = new Effitor({
  schemaInit: {
    editor: EtEditorElement,
    body: EtBodyElement,
    paragraph: EtParagraphElement,
    heading: EtHeading,
  },
})

const host = document.getElementById('effitor-host') as HTMLDivElement
editor.mount(host)

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.ctx = editor.context

// editor.observeBody((ms) => {
//   for (const m of ms) {
//     console.log('record', m.type, m.addedNodes, m.removedNodes)
//   }
// }, {
//   childList: true,
//   subtree: true,
// })

export { }
