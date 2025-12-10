import { useTranslation } from 'react-i18next'
import type { HotstringInfo } from '../../editor/plugins/typingTipAssist'

const TheHotstringTip = ({ hotstringState }: { hotstringState: HotstringInfo[] }) => {
  const { t } = useTranslation()
  return (
    <div className="w-full h-full flex flex-nowrap justify-start items-center font-mono">
      {hotstringState.map((hs, i) => (
        <div
          key={hs.chars}
          className={`tooltip shrink-0 m-2 ${i === 0 ? 'tooltip-open' : ''}`}
          data-tip={t(`hotstring.${hs.title}`)}
        >
          <span className="kbd kbd-lg">
            <span className="text-accent/80">{hs.chars.slice(0, hs.pos)}</span>
            <span>{hs.chars.slice(hs.pos)}</span>
          </span>
        </div>
      ))}
      {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        hotstringState.length === 1 && hotstringState[0]!.chars.length === hotstringState[0]!.pos && (
          <span>
            <span className="kbd kbd-lg">Space</span>
          </span>
        )
      }
    </div>
  )
}

export default TheHotstringTip
