import './TheHotkeyTip.css'
import type { KeyState } from '../../editor/plugins/typingTipAssist'
import { useTranslation } from 'react-i18next'
import { useEffect, useRef } from 'react'

const TheHotkeyTip = ({ keyState }: { keyState: KeyState }) => {
  const { t } = useTranslation()

  const keysRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    keysRef.current?.children?.[keyState.index]?.scrollIntoView({
      inline: 'center',
    })
  }, [keyState.index])

  return (
    <div className="w-full h-full flex items-center justify-start flex-nowrap">
      {keyState.keys.length > 0 && (
        <>
          <span className="et-h-keymods flex items-center justify-center flex-nowrap">
            {keyState.mods.map(mod => (
              <kbd key={mod} className="kbd kbd-lg mx-1 shrink-0 bg-primary/20 Et-fade-in">{mod}</kbd>
            ))}
            {keyState.nextMods.map(mod => (
              <kbd key={mod} className="kbd kbd-lg mx-1 shrink-0 Et-fade-in">{mod}</kbd>
            ))}
          </span>
          <span ref={keysRef} className="flex items-center justify-center flex-nowrap">
            {keyState.keys.map((key, i) => (
              <kbd
                key={key.title}
                className={`kbd kbd-md mx-1 tooltip shrink-0 Et-fade-in ${
                  key.key === keyState.key || i === keyState.index
                    ? 'tooltip-open bg-primary/20 '
                    : ''
                }`}
                data-tip={t(`keymap.${key.title}`)}
              >
                {key.key}
              </kbd>
            ))}
          </span>
        </>
      )}
    </div>
  )
}

export default TheHotkeyTip
