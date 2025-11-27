import test, { Page, TestInfo } from 'playwright/test'
import { lorem1000 } from '../../shared/lorem'

interface TestOpts {
  editor: string
  testItem: string
  pageUrl: string
  testStart?: (page: Page) => Promise<void>
  testEnd?: (page: Page, testInfo: TestInfo) => Promise<void>
  testAction: (page: Page) => Promise<void>
}

const waitForMemoryStable = async (page: Page, timeout = 10000) => {
  const getMemory = async () => {
    return await page.evaluate(() => performance.memory?.usedJSHeapSize || 0)
  }

  let lastMemory = await getMemory()
  let stableCount = 0
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    await page.waitForTimeout(500)
    const currentMemory = await getMemory()

    // 如果内存变化小于 1MB，认为稳定
    if (Math.abs(currentMemory - lastMemory) < 1024 * 1024) {
      stableCount++
      if (stableCount >= 3) break // 连续 3 次稳定
    }
    else {
      stableCount = 0 // 重置计数
    }

    lastMemory = currentMemory
  }
  await page.evaluate(() => window.$updateMemory())
}

const testEditorPerf = ({ editor, testItem, pageUrl, testStart, testEnd, testAction }: TestOpts) => {
  test(testItem + ` by [${editor}]`, async ({ page }, testInfo) => {
    // 预热
    await page.goto(pageUrl)
    await page.waitForTimeout(2000)
    await page.keyboard.type('warmup', { delay: 100 })

    const testStartTime = Date.now()
    await page.goto(pageUrl)
    // 等待页面加载完成
    await page.waitForFunction(() => window.webMetrics && window.$initEditorContentfromHTML)

    // 初始化编辑区内容
    if (testStart) {
      await testStart(page)
    }

    const editor = page.locator('[contenteditable="true"],[contenteditable=""]')
    // 点击一次，触发交互，防止滚动到页面底部时再次触发 LCP 指标更新
    // ps. LCP 指标在第一次交互后停止监听
    await editor.click()

    // 滚动页面至底部
    await page.evaluate(() => {
      document.documentElement.scrollTop = document.documentElement.scrollHeight
    })

    // 聚焦编辑区, 光标移动至末段落
    const lastP = editor.locator('>:last-child')
    if (await lastP.count() > 0) {
      await lastP.click({ position: { x: 100, y: 10 } })
    }
    else {
      await editor.click()
    }

    await testAction(page)

    testInfo.duration = Date.now() - testStartTime
    // 测试结束
    if (testEnd) {
      await testEnd(page, testInfo)
    }
    await waitForMemoryStable(page)
    await page.close()
  })
}

interface TypingTestOpts extends Omit<TestOpts, 'testAction'> {
  typingString: string
}

const testTyping = ({ editor, testItem, pageUrl, typingString, testStart, testEnd }: TypingTestOpts) => {
  testEditorPerf({
    editor,
    testItem,
    pageUrl,
    testStart,
    testEnd,
    testAction: async (page) => {
      await page.keyboard.type(typingString, { delay: 30 }) // 模拟人类输入延迟
    },
  })
}

export const typing_1000_chars_InEmptyEditor = ({ editor, pageUrl, testItem, testStart, testEnd }: Omit<TypingTestOpts, 'typingString'>) => {
  testTyping({
    editor,
    pageUrl,
    testItem,
    typingString: lorem1000,
    testStart,
    testEnd,
  })
}

export const typing_1000_chars_AtEditorEnd_WithInitialContent = (initHtml: string, { editor, pageUrl, testItem, testEnd }: Omit<TypingTestOpts, 'typingString' | 'testStart'>) => {
  testTyping({
    editor,
    pageUrl,
    testItem,
    typingString: lorem1000,
    testStart: async (page) => {
      await page.evaluate((html) => {
        window.$initEditorContentfromHTML(html)
      }, initHtml)
      // 等待初始化完毕 10s; 初始化性能通过 LCP 指标表现, 因此这里应尽可能长, 避免影响 INP 指标
      await page.waitForTimeout(10_000)
    },
    testEnd,
  })
}

interface PasteTestOpts extends Omit<TestOpts, 'testAction' | 'testStart'> {
  pasteHTML: string
}

export const testPaste = ({ editor, testItem, pageUrl, pasteHTML, testEnd }: PasteTestOpts) => {
  testEditorPerf({
    editor,
    testItem,
    pageUrl,
    testStart: async (page) => {
      // 复制粘贴
      await page.evaluate(async ({ html, text }) => {
        const items = [
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([text], { type: 'text/plain' }),
          }),
        ]
        await navigator.clipboard.write(items)
      }, {
        html: pasteHTML,
        text: pasteHTML,
      })
    },
    testEnd,
    testAction: async (page) => {
      page.evaluate(() => {
        // 清除指标, 粘贴性能只需记录 粘贴这一行为的 INP 指标
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.webMetrics = {} as any
      })
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+v' : 'Control+v')
    },
  })
}
