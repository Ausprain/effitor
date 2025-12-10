import { hotkey, hotstring, type Et } from 'effitor'
import { KEY_CONNECTOR, KEY_ROUTES, type KeyInfo } from './keymap'
import { hotstrings } from './hotstring'

declare module 'effitor' {
  interface EditorAssists {
    typingTip: TypingTipAssist
  }
}

export interface KeyState {
  index: number
  key: string
  mods: string[]
  nextMods: string[]
  keys: KeyInfo[]
}
export interface HotstringInfo {
  chars: string
  pos: number
  title: string
}

class TypingTipAssist {
  private prevScope = ''
  private prevModkey = ''
  private prevKeyState?: KeyState | null = null
  public onModChange?: (state: KeyState) => void
  public onHotstringProgress?: (his: HotstringInfo[]) => void

  constructor(options: { onModChange?: (state: KeyState) => void } = {}) {
    this.onModChange = options.onModChange
  }

  checkModkey(scope: string, modkey: string) {
    const routeMap = KEY_ROUTES[scope] || KEY_ROUTES.default
    if (!routeMap) {
      return
    }
    if (modkey === this.prevModkey && scope === this.prevScope) {
      if (!this.prevKeyState || this.prevKeyState.keys.some(k => k.key === this.prevKeyState?.key)) {
        return
      }
      this.prevKeyState.index = (this.prevKeyState.index + 1) % this.prevKeyState.keys.length
    }
    else {
      this.prevScope = scope
      this.prevModkey = modkey
      const parts = hotkey.parseHotkey(modkey)
      const key = parts.pop() || ''
      const keyBind = parts.length ? parts.join(KEY_CONNECTOR) : ''
      const route = routeMap[keyBind]
      if (!route) {
        return
      }
      this.prevKeyState = {
        index: -1,
        key,
        mods: parts,
        nextMods: route.nextMods,
        keys: route.keys,
      }
    }
    this.onModChange?.(this.prevKeyState)
  }

  checkHotstring(hss: readonly hotstring.Hotstring[]) {
    hss = hss.filter(hs => !!hs.pos)
    this.onHotstringProgress?.(hss.map(hs => ({
      chars: hs.chars.slice(0, -1),
      pos: hs.pos,
      title: hs.title,
    })).sort((a, b) => b.pos / b.chars.length - a.pos / a.chars.length))
  }
}

export const useTypingTipAssist = (): Et.EditorPlugin => {
  return {
    name: '@effitor/home-typingTipAssist',
    effector: [{
      enforce: 'pre',
      beforeKeydownSolver: {
        default: (ev, ctx) => {
          ctx.assists.typingTip.checkModkey(ctx.commonEtElement.localName, ctx.hotkeyManager.modkey)
          if (ev.key.length !== 1) {
            ctx.assists.typingTip.onHotstringProgress?.([])
          }
        },
      },
      afterInputSolver: {
        default: (ev, ctx) => {
          switch (ev.inputType) {
            case 'insertText':
            case 'deleteContentBackward':
            case 'deleteWordBackward':
              Promise.resolve().then(() => {
                ctx.assists.typingTip.checkHotstring(ctx.hotstringManager.allHotstrings())
              })
              break
            default:
              ctx.assists.typingTip.onHotstringProgress?.([])
              break
          }
        },
      },
      onEffectElementChanged: (_el, _old, ctx) => {
        if (!ctx.commonEtElement) {
          return
        }
        ctx.assists.typingTip.checkModkey(ctx.commonEtElement.localName, ctx.hotkeyManager.modkey)
      },
      onMounted(ctx) {
        // 注册热字符串
        ctx.hotstringManager.addHotStrings(hotstrings)
      },
    }],
    register(ctxMeta) {
      ctxMeta.assists.typingTip = new TypingTipAssist()
    },
  }
}
