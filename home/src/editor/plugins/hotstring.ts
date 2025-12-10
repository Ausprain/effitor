import { hotstring } from 'effitor'

export const hotstrings = [
  hotstring.create('>dark', void 0, {
    title: '深色模式切换',
    action: (ctx, _hs, rm) => {
      rm()
      ctx.assists.darkAssist.toggleDark?.()
    },
  }),
  hotstring.create('>clear', void 0, {
    title: '清空编辑器',
    action: (ctx) => {
      ctx.commonHandler.initEditorContents(false)
    },
  }),
]
