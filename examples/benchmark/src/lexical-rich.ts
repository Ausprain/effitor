import { CodeNode } from '@lexical/code'
import { $generateNodesFromDOM } from '@lexical/html'
import { LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { HeadingNode, QuoteNode, registerRichText } from '@lexical/rich-text'
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table'
import { $getRoot, createEditor, CreateEditorArgs, ParagraphNode, TextNode } from 'lexical'

import { listenWebMetrics } from '../shared/metric'
import { rustNllFullHTML } from '../shared/nll-full'
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
    HeadingNode,
    QuoteNode,
    ListNode,
    ListItemNode,
    CodeNode,
    TableNode,
    TableRowNode,
    TableCellNode,
    LinkNode,
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

window.$initEditorContentfromHTML(rustNllFullHTML.repeat(5))
