/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  onCLS,
  onFCP,
  onINP,
  onLCP,
} from 'web-vitals'

export const listenWebMetrics = () => {
  window.webMetrics = {} as any
  window.webMetrics.INPs = []

  window.$updateMemory = () => {
    if (performance.memory) {
      window.webMetrics.memory = {
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        usedJSHeapSize: performance.memory.usedJSHeapSize,
      }
    }
  }

  onFCP(m => window.webMetrics.FCP = m, { reportAllChanges: true })
  onLCP(m => window.webMetrics.LCP = m, { reportAllChanges: true })
  onCLS(m => window.webMetrics.CLS = m, { reportAllChanges: true })
  onINP((m) => {
    window.webMetrics.INP = m
    window.webMetrics.INPs.push({ ...m })
    window.$updateMemory()
  }, { reportAllChanges: true })
}
