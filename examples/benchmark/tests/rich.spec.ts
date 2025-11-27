import { Page, TestInfo } from 'playwright/test'
import { rustNllRichHTML } from '../shared/nll-rich'
import { appendMetrics, typing_1000_chars_AtEditorEnd_WithInitialContent, typing_1000_chars_InEmptyEditor } from './utils'

const EFFITOR_RICH_URL = 'http://localhost:5173/src/effitor-rich.html'
const LEXICAL_RICH_URL = 'http://localhost:5173/src/lexical-rich.html'
const TIPTAP_RICH_URL = 'http://localhost:5173/src/tiptap-rich.html'

const saveMetrics = (fileName: string, testTitle: string) => async (page: Page, testInfo: TestInfo) => {
  await appendMetrics(page, fileName, testTitle, testInfo.duration)
}

const TEST_ITEM_1 = '支持基础 markdown 的空编辑器中输入 1000 个字符'

typing_1000_chars_InEmptyEditor({
  editor: 'effitor',
  pageUrl: EFFITOR_RICH_URL,
  testItem: TEST_ITEM_1,
  testEnd: saveMetrics('effitor-rich.txt', TEST_ITEM_1 + ' by [effitor]'),
})

typing_1000_chars_InEmptyEditor({
  editor: 'lexical',
  pageUrl: LEXICAL_RICH_URL,
  testItem: TEST_ITEM_1,
  testEnd: saveMetrics('lexical-rich.txt', TEST_ITEM_1 + ' by [lexical]'),
})

typing_1000_chars_InEmptyEditor({
  editor: 'tiptap',
  pageUrl: TIPTAP_RICH_URL,
  testItem: TEST_ITEM_1,
  testEnd: saveMetrics('tiptap-rich.txt', TEST_ITEM_1 + ' by [tiptap]'),
})

const initHTML = rustNllRichHTML.repeat(5)
const TEST_ITEM_2 = `支持基础 markdown 的编辑器, 加载 30 万字符 HTML (无表格和代码块), 并在末段落输入 1000 个字符`

typing_1000_chars_AtEditorEnd_WithInitialContent(initHTML, {
  editor: 'effitor',
  pageUrl: EFFITOR_RICH_URL,
  testItem: TEST_ITEM_2,
  testEnd: saveMetrics('effitor-rich.txt', TEST_ITEM_2 + ' by [effitor]'),
})

typing_1000_chars_AtEditorEnd_WithInitialContent(initHTML, {
  editor: 'lexical',
  pageUrl: LEXICAL_RICH_URL,
  testItem: TEST_ITEM_2,
  testEnd: saveMetrics('lexical-rich.txt', TEST_ITEM_2 + ' by [lexical]'),
})

typing_1000_chars_AtEditorEnd_WithInitialContent(initHTML, {
  editor: 'tiptap',
  pageUrl: TIPTAP_RICH_URL,
  testItem: TEST_ITEM_2,
  testEnd: saveMetrics('tiptap-rich.txt', TEST_ITEM_2 + ' by [tiptap]'),
})

const initHTML_3 = rustNllRichHTML.repeat(16)
const TEST_ITEM_3 = `支持基础 markdown 的编辑器, 加载 100 万字符 HTML (无表格和代码块), 并在末段落输入 1000 个字符`

typing_1000_chars_AtEditorEnd_WithInitialContent(initHTML_3, {
  editor: 'effitor',
  pageUrl: EFFITOR_RICH_URL,
  testItem: TEST_ITEM_3,
  testEnd: saveMetrics('effitor-rich.txt', TEST_ITEM_3 + ' by [effitor]'),
})

// timeout: 3min
// typing_1000_chars_AtEditorEnd_WithInitialContent(initHTML_3, {
//   editor: 'lexical',
//   pageUrl: LEXICAL_RICH_URL,
//   testItem: TEST_ITEM_3,
//   testEnd: saveMetrics('lexical-rich.txt', TEST_ITEM_3 + ' by [lexical]'),
// })

typing_1000_chars_AtEditorEnd_WithInitialContent(initHTML_3, {
  editor: 'tiptap',
  pageUrl: TIPTAP_RICH_URL,
  testItem: TEST_ITEM_3,
  testEnd: saveMetrics('tiptap-rich.txt', TEST_ITEM_3 + ' by [tiptap]'),
})
