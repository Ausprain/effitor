import { Page, TestInfo } from 'playwright/test'
import { rustNllPlainHTML_5, rustNllPlainHTML_50 } from '../shared/nll-plain'
import { appendMetrics, typing_1000_chars_AtEditorEnd_WithInitialContent, typing_1000_chars_InEmptyEditor } from './utils'

import { DEV_PORT } from '../shared/config'

const EFFITOR_PLAIN_URL = `http://localhost:${DEV_PORT}/src/effitor-plain.html`
const LEXICAL_PLAIN_URL = `http://localhost:${DEV_PORT}/src/lexical-plain.html`
const TIPTAP_PLAIN_URL = `http://localhost:${DEV_PORT}/src/tiptap-plain.html`

const saveMetrics = (fileName: string, testTitle: string) => async (page: Page, testInfo: TestInfo) => {
  await appendMetrics(page, fileName, testTitle, testInfo.duration)
}

const TEST_ITEM_1 = '仅支持标题和段落的空编辑器中输入 1000 个字符'

typing_1000_chars_InEmptyEditor({
  editor: 'effitor',
  pageUrl: EFFITOR_PLAIN_URL,
  testItem: TEST_ITEM_1,
  testEnd: saveMetrics('effitor-plain.txt', TEST_ITEM_1 + ' by [effitor]'),
})

typing_1000_chars_InEmptyEditor({
  editor: 'lexical',
  pageUrl: LEXICAL_PLAIN_URL,
  testItem: TEST_ITEM_1,
  testEnd: saveMetrics('lexical-plain.txt', TEST_ITEM_1 + ' by [lexical]'),
})

typing_1000_chars_InEmptyEditor({
  editor: 'tiptap',
  pageUrl: TIPTAP_PLAIN_URL,
  testItem: TEST_ITEM_1,
  testEnd: saveMetrics('tiptap-plain.txt', TEST_ITEM_1 + ' by [tiptap]'),
})

const TEST_ITEM_2 = '仅支持标题和段落的编辑器, 加载 30 万字符 HTML (1000 段落 和 250 标题), 并在末段落输入 1000 个字符'

typing_1000_chars_AtEditorEnd_WithInitialContent(rustNllPlainHTML_5, {
  editor: 'effitor',
  pageUrl: EFFITOR_PLAIN_URL,
  testItem: TEST_ITEM_2,
  testEnd: saveMetrics('effitor-plain.txt', TEST_ITEM_2 + ' by [effitor]'),
})

typing_1000_chars_AtEditorEnd_WithInitialContent(rustNllPlainHTML_5, {
  editor: 'lexical',
  pageUrl: LEXICAL_PLAIN_URL,
  testItem: TEST_ITEM_2,
  testEnd: saveMetrics('lexical-plain.txt', TEST_ITEM_2 + ' by [lexical]'),
})

typing_1000_chars_AtEditorEnd_WithInitialContent(rustNllPlainHTML_5, {
  editor: 'tiptap',
  pageUrl: TIPTAP_PLAIN_URL,
  testItem: TEST_ITEM_2,
  testEnd: saveMetrics('tiptap-plain.txt', TEST_ITEM_2 + ' by [tiptap]'),
})

const TEST_ITEM_3 = '仅支持标题和段落的编辑器, 加载 300 万字符 HTML (10000 段落 和 2500 标题), 并在末段落输入 1000 个字符'

typing_1000_chars_AtEditorEnd_WithInitialContent(rustNllPlainHTML_50, {
  editor: 'effitor',
  pageUrl: EFFITOR_PLAIN_URL,
  testItem: TEST_ITEM_3,
  testEnd: saveMetrics('effitor-plain.txt', TEST_ITEM_3 + ' by [effitor]'),
})

// timeout: 3min
// typing_1000_chars_AtEditorEnd_WithInitialContent(rustNllPlainHTML_50, {
//   editor: 'lexical',
//   pageUrl: LEXICAL_PLAIN_URL,
//   testItem: TEST_ITEM_3,
//   testEnd: saveMetrics('lexical-plain.txt', TEST_ITEM_3 + ' by [lexical]'),
// })

typing_1000_chars_AtEditorEnd_WithInitialContent(rustNllPlainHTML_50, {
  editor: 'tiptap',
  pageUrl: TIPTAP_PLAIN_URL,
  testItem: TEST_ITEM_3,
  testEnd: saveMetrics('tiptap-plain.txt', TEST_ITEM_3 + ' by [tiptap]'),
})
