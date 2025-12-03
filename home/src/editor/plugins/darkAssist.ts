import type { Et } from 'effitor'

declare module 'effitor' {
  interface EditorAssists {
    darkAssist: DarkAssist
  }
}

interface DarkAssist {
  isDark?: boolean
  toggleDark?: () => void
}

export const useDarkAssist = (): Et.EditorPlugin => {
  return {
    name: '@effitor/home-darkAssist',
    effector: [],
    register(ctxMeta) {
      ctxMeta.assists.darkAssist = {}
    },
  }
}
