import './TryButtons.css'

import { useTranslation } from 'react-i18next'

export const TryButtons = ({
  onClickTryNow,
  onClickFeature,
}: {
  onClickTryNow?: () => void
  onClickFeature?: () => void
}) => {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-center text-center mb-8 lg:mb-12">
      {/* See Features 按钮 */}
      <button
        className="btn try-btn lg:btn-lg"
        onClick={() => onClickFeature?.()}
      >
        {t('main.features')}
      </button>
      {/* Try Now 按钮 */}
      <button
        className="btn try-btn lg:btn-lg"
        onClick={() => onClickTryNow?.()}
      >
        {t('main.try')}
      </button>
    </div>
  )
}

export default TryButtons
