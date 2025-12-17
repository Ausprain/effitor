import type { Et } from 'effitor'
import ReactDOM from 'react-dom/client'
import cssText from './keyTip.css?raw'
import { KeyTipFC } from './KeyTipFC'
import { createElement } from 'react'

declare module 'effitor' {
  interface EditorAssists {
    keyTip: KeyTipAssist
  }
}

interface KeyTipAssist {
  tipKey(ev: KeyboardEvent): void
}

export const useKeyTipAssist = (): Et.EditorPlugin => {
  return {
    name: 'keyTipAssist',
    cssText,
    effector: {
      htmlEventCapturedSolver: {
        keydown: (ev, ctx) => {
          if (ev.code.length < 2
            || ev.code.startsWith('Ctrl')
            || ev.code.startsWith('Shift')
            || ev.code.startsWith('Alt')
            || ev.code.startsWith('Meta')
          ) {
            return
          }
          ctx.assists.keyTip.tipKey(ev)
        },
      },
      onMounted: (ctx) => {
        const keyTipEl = document.createElement('div')
        keyTipEl.id = 'et-key-tip'
        ctx.root.appendChild(keyTipEl)

        ReactDOM.createRoot(keyTipEl).render(createElement(KeyTipFC, ctx))
      },
    },
  }
}
