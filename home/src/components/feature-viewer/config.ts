import type { TypingMarkdownArray } from '@effitor/assist-ai'

export interface FeatureData {
  icon: React.ReactNode
  title: string
  pluginName: string
  editorActions: TypingMarkdownArray
  mdText: string
}
