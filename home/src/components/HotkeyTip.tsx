import './HotkeyTip.css'
import type { KeyState } from '../editor/plugins/typingTipAssist'

const KeyCombination = ({ keyState }: { keyState: KeyState }) => (
  <div className="w-full h-full flex items-center justify-start flex-nowrap">
    <span className="et-h-keymods flex items-center justify-center flex-nowrap">
      {keyState.mods.map(mod => (
        <kbd key={mod} className="kbd kbd-lg mx-1 shrink-0 bg-primary/20 Et-fade-in">{mod}</kbd>
      ))}
      {keyState.nextMods.map(mod => (
        <kbd key={mod} className="kbd kbd-lg mx-1 shrink-0 Et-fade-in">{mod}</kbd>
      ))}
    </span>
    {keyState.keys.map(key => (
      <kbd key={key.title} className="kbd kbd-md mx-1 tooltip shrink-0 Et-fade-in" data-tip={key.title}>{key.key}</kbd>
    ))}
  </div>
)

export default KeyCombination
