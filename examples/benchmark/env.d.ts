import {
  CLSMetric,
  FCPMetric,
  INPMetric,
  LCPMetric,
} from 'web-vitals'

export interface WebMetrics {
  FCP: FCPMetric
  LCP: LCPMetric
  CLS: CLSMetric
  INP: INPMetric
  INPs: INPMetric[]
  memory: PerformanceMemory | undefined
}

declare global {
  interface Window {
    webMetrics: WebMetrics
    $updateMemory: () => void
    $initEditorContentfromHTML(html: string): void
  }
  interface Performance {
    memory: PerformanceMemory
  }
  interface PerformanceMemory {
    jsHeapSizeLimit: number
    totalJSHeapSize: number
    usedJSHeapSize: number
  }
}
export {}
