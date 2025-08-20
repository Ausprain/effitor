import type { Et } from '~/core/@types'

declare global {
  interface Object {
    __proto__: Object
  }
}

/* -------------------------------------------------------------------------- */
/*                               DOM Augmentations                            */
/* -------------------------------------------------------------------------- */

declare global {
  interface Navigator {
    /**
     * [MDN: NavigatorUAData](https://developer.mozilla.org/en-US/docs/Web/API/NavigatorUAData)
     */
    userAgentData: {
      brands: {
        brand: string
        version: string
      }[]
      mobile: boolean
      platform: string
    }
  }
  interface Text {
    /** 文本节点使用.data, 不要使用.textContent; 前者比后者快 1 倍 */
    textContent: never
  }
  interface HTMLElement {
    textContent: string
    setAttribute<K extends keyof Et.ElAttrs>(qualifiedName: K, value: Et.ElAttrs[K]): void
    setAttribute(qualifiedName: string, value: string): void
    getAttribute<K extends keyof Et.ElAttrs>(qualifiedName: K): Et.ElAttrs[K]
    getAttribute(qualifiedName: string): string | null
    removeAttribute<K extends keyof Et.ElAttrs>(qualifiedName: K): void
    removeAttribute(qualifiedName: string): void
    addEventListener(type: 'beforeinput', listener: (ev: InputEvent) => void, options?: boolean | EventListenerOptions): void
  }
  interface Document {
    createElement<K extends keyof Et.DefinedEtElementMap>(tagName: K): Et.DefinedEtElementMap[K]
    addEventListener(type: 'beforeinput', listener: (ev: InputEvent) => void, options?: boolean | EventListenerOptions): void
  }

  type ModifyAlter = 'extend' | 'move'
  type ModifyDirection = 'forward' | 'backward' | 'left' | 'right'
  type ModifyGranularity = 'character' | 'word' | 'sentence' | 'line' | 'paragraph' | 'lineboundary' | 'sentenceboundary' | 'paragraphboundary' | 'documentboundary'
  /**
   * [Selection](https://developer.mozilla.org/en-US/docs/Web/API/Selection)
   */
  interface Selection {
    /**
     * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Selection/modify)
     * [Selection API W3C Working Draft 16 May 2023](https://www.w3.org/TR/selection-api/#dom-selection-modify)
     */
    modify(alter: ModifyAlter, direction: ModifyDirection, granularity: ModifyGranularity): void
  }
}

export {}
