/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const OUT_DIR = path.resolve(__dirname, './tests/output')
const FILES = {
  EFFITOR_PLAIN: path.resolve(OUT_DIR, 'effitor-plain.txt'),
  EFFITOR_RICH: path.resolve(OUT_DIR, 'effitor-rich.txt'),
  LEXICAL_PLAIN: path.resolve(OUT_DIR, 'lexical-plain.txt'),
  LEXICAL_RICH: path.resolve(OUT_DIR, 'lexical-rich.txt'),
  TIPTAP_PLAIN: path.resolve(OUT_DIR, 'tiptap-plain.txt'),
  TIPTAP_RICH: path.resolve(OUT_DIR, 'tiptap-rich.txt'),
}

const resultPath = path.resolve(__dirname, './result.json')
const resultAvgPath = path.resolve(__dirname, './result-avg.json')
const resultRecord = {} as any
const METRIC_NAME_REG = /Metrics for: (.+) by \[(\w+)\]/
const DURATION_REG = /duration: (.+)s/
const METRIC_VALUE_REG = /│.+│(.+)│.+│/
const MEMORY_REG = /│ total: (\d+) MB/

const parseOutput = async (filePath: string) => {
  const content = await fs.promises.readFile(filePath, 'utf-8')
  const metrics = content.split('\n\n')
  for (const metric of metrics) {
    const metricRecord = await parseMetric(metric)
    if (!metricRecord) {
      continue
    }
    const { name, editor, ...metrics } = metricRecord
    if (!name || !editor) {
      continue
    }
    if (!resultRecord[name]) {
      resultRecord[name] = {}
    }
    if (!resultRecord[name][editor]) {
      resultRecord[name][editor] = []
    }
    resultRecord[name][editor].push(metrics)
  }
}
const parseMetric = async (metric: string) => {
  metric = metric.trim()
  if (!metric) {
    return null
  }
  let name, editor, duration, lcp, cls, inp, inps, memory
  for (let line of metric.split('\n')) {
    line = line.trim()
    if (!line) {
      continue
    }
    if (line.startsWith('Metrics for')) {
      const match = line.match(METRIC_NAME_REG)
      if (match) {
        name = match[1]
        editor = match[2]
      }
      continue
    }
    if (line.startsWith('duration')) {
      const match = line.match(DURATION_REG)
      if (match) {
        duration = Number(match[1])
      }
      continue
    }
    if (line.startsWith('│ LCP')) {
      const match = line.match(METRIC_VALUE_REG)
      if (match) {
        lcp = Number(match[1].trim())
      }
      continue
    }
    if (line.startsWith('│ CLS')) {
      const match = line.match(METRIC_VALUE_REG)
      if (match) {
        cls = Number(match[1].trim())
      }
      continue
    }
    if (line.startsWith('│ INP ')) {
      const match = line.match(METRIC_VALUE_REG)
      if (match) {
        inp = Number(match[1].trim())
      }
      continue
    }
    if (line.startsWith('│ INPs')) {
      const match = line.match(METRIC_VALUE_REG)
      if (match) {
        inps = Number(match[1].trim())
      }
      continue
    }
    if (line.startsWith('│ Memory')) {
      const match = line.match(MEMORY_REG)
      if (match) {
        memory = Number(match[1].trim())
      }
      continue
    }
  }

  return {
    name,
    editor,
    duration,
    lcp,
    cls,
    inp,
    inps,
    memory,
  }
}
const writeResult = () => {
  fs.writeFileSync(resultPath, JSON.stringify(resultRecord))
}
const writeResultAvg = () => {
  const resultAvg = {} as any
  for (const name of Object.keys(resultRecord)) {
    resultAvg[name] = {}
    for (const editor of Object.keys(resultRecord[name])) {
      const metrics = resultRecord[name][editor]
      const avgMetrics = metrics.reduce((acc: any, cur: any) => {
        for (const key of Object.keys(cur)) {
          acc[key] = (acc[key] || 0) + cur[key]
        }
        return acc
      }, {})
      for (const key of Object.keys(avgMetrics)) {
        avgMetrics[key] = Number((avgMetrics[key] / metrics.length).toFixed(1))
      }
      resultAvg[name][editor] = avgMetrics
    }
  }
  fs.writeFileSync(resultAvgPath, JSON.stringify(resultAvg))
}
const main = async () => {
  for (const filePath of Object.values(FILES)) {
    await parseOutput(filePath)
  }
  writeResult()
  writeResultAvg()
}

await main()
