import type { Et } from '@effitor/core'
import { platform } from '@effitor/core'

import type { DropdownTrigger } from './config'
import { Dropdown } from './dropdown'

const getTriggerAction = (modType: DropdownTrigger['triggerMod']): Et.KeyboardAction => {
  if (modType === true) {
    if (platform.isMac)
      return (ev, ctx) => {
        if (ev.metaKey) {
          if (ctx.assists.dropdown.open()) {
            ctx.preventAndSkipDefault(ev)
          }
        }
      }
    return (ev, ctx) => {
      if (ev.ctrlKey) {
        if (ctx.assists.dropdown.open()) {
          ctx.preventAndSkipDefault(ev)
        }
      }
    }
  }
  if (modType === 'Alt') {
    return (ev, ctx) => {
      if (ev.altKey) {
        if (ctx.assists.dropdown.open()) {
          ctx.preventAndSkipDefault(ev)
        }
      }
    }
  }
  if (modType === 'Control') {
    return (ev, ctx) => {
      if (ev.ctrlKey) {
        if (ctx.assists.dropdown.open()) {
          ctx.preventAndSkipDefault(ev)
        }
      }
    }
  }
  if (modType === 'Meta') {
    return (ev, ctx) => {
      if (ev.metaKey) {
        if (ctx.assists.dropdown.open()) {
          ctx.preventAndSkipDefault(ev)
        }
      }
    }
  }
  return (ev, ctx) => {
    if (ctx.assists.dropdown.open()) {
      ctx.preventAndSkipDefault(ev)
    }
  }
}

export const getDropdownEffector = (options: Required<DropdownTrigger>): Et.EffectorSupportInline => {
  return {
    inline: true,

    beforeKeydownSolver: {
      [options.triggerKey]: getTriggerAction(options.triggerMod),
    },
    htmlEventSolver: {
      mousedown: (ev, ctx) => {
        if (!ctx.assists.dropdown.isOpened) {
          return
        }
        // 鼠标点击外部关闭dropdown
        ctx.assists.dropdown.close(false)
        ctx.preventAndSkipDefault(ev)
      },
    },

    onMounted(ctx, signal) {
      ctx.assists.dropdown = new Dropdown(ctx, signal)
    },
  }
}
