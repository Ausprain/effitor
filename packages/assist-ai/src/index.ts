import './index.css'

import type { Et } from '@effitor/core'

import type { CreateEffitorAIOptions } from './config'
import { EffitorAI } from './EffitorAI'
import { mappingForBlockquote, mappingForCode, mappingForList, mappingForMark } from './mapping'

declare module '@effitor/core' {
  interface EditorAssists {
    ai: EffitorAI
  }
}

export type {
  TypingMarkdownArray,
  TypingResult } from './EffitorAI'
export {
  mappingForBlockquote,
  mappingForCode,
  mappingForList,
  mappingForMark,
} from './mapping'

export type AIAssistOptions = {
  // apiKey: string
} & CreateEffitorAIOptions

export const useAIAssist = (options?: AIAssistOptions): Et.EditorPlugin => {
  options = {
    markdownTextMappings: [
      mappingForCode, mappingForMark, mappingForList, mappingForBlockquote,
    ],
  }

  return {
    name: '@effitor/assist-ai',
    effector: [{
      onMounted: (ctx) => {
        ctx.assists.ai = new EffitorAI(ctx, options)
      },
    }],
  }
}
