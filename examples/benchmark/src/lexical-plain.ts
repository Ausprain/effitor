import { HeadingNode, registerRichText } from '@lexical/rich-text'
import { $getRoot, createEditor, CreateEditorArgs, ParagraphNode, TextNode } from 'lexical'

import { $generateNodesFromDOM } from '@lexical/html'
import { listenWebMetrics } from '../shared/metric'
listenWebMetrics()

const editorConfig: CreateEditorArgs = {
  namespace: 'MarkdownEditor',
  theme: {},
  onError(error: Error) {
    console.error(error)
  },
  nodes: [
    HeadingNode,
    ParagraphNode,
    TextNode,
  ],
  editable: true,
}
const editor = createEditor(editorConfig)
registerRichText(editor)

window.$initEditorContentfromHTML = (html: string) => {
  editor.update(() => {
    const parser = new DOMParser()
    const dom = parser.parseFromString(html, 'text/html')
    const nodes = $generateNodesFromDOM(editor, dom)
    const root = $getRoot()
    root.clear()
    root.append(...nodes)
  })
}

const app = document.getElementById('app') as HTMLDivElement
const host = document.createElement('div')
host.contentEditable = 'true'
app.appendChild(host)
editor.setRootElement(host)
