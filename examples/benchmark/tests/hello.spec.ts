/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { test } from '@playwright/test'
import { writeMetrics } from './utils/metric'
import { lorem1000 } from '../shared/lorem'
import { rustNllPlainHTML } from '../shared/nll-plain'

// const CopyKey = process.platform === 'darwin' ? 'Meta+c' : 'Ctrl+c'
const PasteKey = process.platform === 'darwin' ? 'Meta+v' : 'Ctrl+v'

const pagepath = 'http://localhost:5173/src/tiptap-plain.html'

test.skip('test', async ({ page }) => {
  await page.goto(pagepath)

  // 聚焦编辑区, 光标移动至末尾
  await page.locator('[contenteditable="true"],[contenteditable=""]').click()
  await page.keyboard.press('Meta+ArrowDown')

  // // 复制粘贴
  // await page.evaluate(async ({ html, text }) => {
  //   const items = [
  //     new ClipboardItem({
  //       'text/html': new Blob([html], { type: 'text/html' }),
  //       'text/plain': new Blob([text], { type: 'text/plain' }),
  //     }),
  //   ]
  //   await navigator.clipboard.write(items)
  // }, {
  //   html: rustNllHTML,
  //   text: 'hello',
  // })
  // await page.keyboard.press(PasteKey)

  await page.evaluate(() => {
    // 记录打字延迟
    // @ts-ignore
    window.typingDelay = 0
    document.addEventListener('keydown', () => {
      // @ts-ignore
      window.keydownStart = Date.now()
      console.log('keydown ')
    }, true)
    document.addEventListener('input', () => {
      // @ts-ignore
      window.typingDelay += Date.now() - window.keydownStart
    }, true)
  })
  // 模拟打字
  await page.keyboard.type(lorem1000, { delay: 10 })

  const typingDelay = await page.evaluate(() => {
    // @ts-ignore
    return window.typingDelay
  })
  console.log('typingDelay ', typingDelay)

  // 性能指标
  // await writeMetrics(page, './index.bench.true.txt', 'hello')
  await page.waitForTimeout(10_000)
  await page.close()
})
