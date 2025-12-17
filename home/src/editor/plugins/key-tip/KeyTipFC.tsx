import { hotkey, type Et } from 'effitor'
import { useRef } from 'react'

export const KeyTipFC = (ctx: Et.EditorContext) => {
  const el = useRef<HTMLDivElement>(null)
  let animation: Animation | undefined
  ctx.assists.keyTip = {
    tipKey: (ev: KeyboardEvent) => {
      if (!el.current) {
        return
      }
      el.current.textContent = hotkey.parseHotkey(hotkey.modKey(ev)).join('+')
      animation?.cancel()
      animation = el.current.animate([
        { opacity: 1 },
        { opacity: 0 },
      ], {
        duration: 3000,
      })
      animation.finished.catch(() => { /** omit error */ })
    },
  }

  return (
    <div
      ref={el}
      className="
        w-fit
        min-w-16
        h-16
        p-4
        rounded-2xl
        flex
        items-center
        justify-center
        bg-gray-800/50
        dark:bg-gray-500/50
        text-gray-200
        text-2xl
        shadow-2xl
        opacity-0
      "
    >
    </div>
  )
}
