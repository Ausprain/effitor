import fs from 'node:fs'
import { Page } from 'playwright/test'
import type { WebMetrics } from '../../env.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 获取 INP 评分
 * [ref](https://web.developers.google.cn/articles/inp?hl=en)
 * @param inp INP 值
 * @returns 评分
 */
const getInpRating = (inp: number) => {
  if (inp <= 200) {
    return 'good'
  }
  else if (inp <= 500) {
    return 'needs improvement'
  }
  else if (inp > 500) {
    return 'poor'
  }
  return 'undefined'
}
export const easyMetrics = (title: string, duration: number, env: string, metrics: WebMetrics) => {
  let memory = 'undefined'
  if (metrics.memory) {
    memory = `total: ${Math.round(metrics.memory.totalJSHeapSize / 1048576)} MB, `
    memory += `used: ${Math.round(metrics.memory.usedJSHeapSize / 1048576)} MB`
  }
  // 去掉最大值和最小值
  if (metrics.INPs.length > 2) {
    metrics.INPs = metrics.INPs.sort((a, b) => a.value - b.value).slice(1, -1)
  }
  const inps = metrics.INPs.reduce((acc, cur) => acc + cur.value, 0) / metrics.INPs.length
  // 使用制表字符组成表格呈现
  return `Metrics for: ${title}
duration: ${(duration / 1000).toFixed(1)}s
env: ${env}
┌────────────┬───────────┬─────────────────────┐
│ metric     │ ${'value'.padEnd(10, ' ')}│ ${'rating'.padEnd(20, ' ')}│
├────────────┼───────────┼─────────────────────┤
│ FCP        │ ${('' + metrics.FCP?.value).padEnd(10, ' ')}│ ${('' + metrics.FCP?.rating).padEnd(20, ' ')}│
│ LCP        │ ${('' + metrics.LCP?.value).padEnd(10, ' ')}│ ${('' + metrics.LCP?.rating).padEnd(20, ' ')}│
│ CLS        │ ${('' + metrics.CLS?.value.toFixed(4)).padEnd(10, ' ')}│ ${('' + metrics.CLS?.rating).padEnd(20, ' ')}│
│ INP        │ ${('' + metrics.INP?.value).padEnd(10, ' ')}│ ${('' + metrics.INP?.rating).padEnd(20, ' ')}│
│ INPs (avg) │ ${inps.toFixed(1).padEnd(10, ' ')}│ ${getInpRating(inps).padEnd(20, ' ')}│ 
│ Memory     │ ${memory.padEnd(32, ' ')}│
└────────────┴───────────┴─────────────────────┘\n\n`
}

const getPathAndMetricString = async (page: Page, fileName: string, title: string, duration: number) => {
  const [metrics, env] = await page.evaluate(() => {
    return [window.webMetrics, navigator.userAgent]
  })
  const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../output')
  const filePath = path.resolve(outDir, fileName)
  return [filePath, easyMetrics(title, duration, env, metrics)]
}

export const writeMetrics = async (page: Page, fileName: string, title: string, duration: number) => {
  const [filePath, metricString] = await getPathAndMetricString(page, fileName, title, duration)
  fs.writeFileSync(filePath, metricString)
}

export const appendMetrics = async (page: Page, fileName: string, title: string, duration: number) => {
  const [filePath, metricString] = await getPathAndMetricString(page, fileName, title, duration)
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, metricString)
  }
  else {
    fs.appendFileSync(filePath, metricString)
  }
}
