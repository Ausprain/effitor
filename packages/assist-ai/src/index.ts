import './index.css'

import type { Et } from '@effitor/core'

import type { CreateEffitorAIOptions } from './config'
import { EffitorAI } from './EffitorAI'

declare module '@effitor/core' {
  interface EditorAssists {
    ai: EffitorAI
  }
}

export type AIAssistOptions = {
  // apiKey: string
} & CreateEffitorAIOptions

export const useAIAssist = (options?: AIAssistOptions): Et.EditorPlugin => {
  return {
    name: '@effitor/assist-ai',
    effector: [{
      onMounted: (ctx) => {
        ctx.assists.ai = new EffitorAI(ctx, options)
      },
    }],
  }
}
export { mappingForCode, mappingForMark } from './mapping'
