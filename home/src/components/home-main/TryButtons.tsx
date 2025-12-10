import './TryButtons.css'

import { useTranslation } from 'react-i18next'

export const TryButtons = ({ onClickTryNow }: { onClickTryNow?: () => void }) => {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-center text-center mb-8 lg:mb-12">
      {/* Try Now 按钮 */}
      <button
        className="btn try-btn lg:btn-lg"
        onClick={() => onClickTryNow?.()}
      >
        {t('main.try')}
      </button>
      {/* See Features 按钮 */}
      <button
        className="btn try-btn lg:btn-lg"
      >
        {t('main.features')}
      </button>
    </div>
  )
}

export default TryButtons
