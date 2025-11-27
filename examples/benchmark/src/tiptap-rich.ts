import { Editor } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableRow } from '@tiptap/extension-table-row'
import StarterKit from '@tiptap/starter-kit'

import { listenWebMetrics } from '../shared/metric'
listenWebMetrics()

const editor = new Editor({
  element: document.querySelector('#app'),
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      // codeBlock: false,
      // blockquote: false,
      // bulletList: false,
      // orderedList: false,
      // listItem: false,
      // bold: false,
      // italic: false,
      // strike: false,
      // code: false,
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
    }),
    Image,
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
  ],
  // content: rustNllPlainHTML_50,
})

window.$initEditorContentfromHTML = (html: string) => {
  editor.commands.setContent(html)
}
