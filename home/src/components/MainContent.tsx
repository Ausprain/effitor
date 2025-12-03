import React from 'react'
import MainSlogan from './MainSlogan'
import { useTranslation } from 'react-i18next'

const MainContent: React.FC<{ onClickTryNow?: () => void, children?: React.ReactNode }> = ({
  onClickTryNow,
  children,
}) => {
  const { t } = useTranslation()
  return (
    <div className="@container w-4/5 max-w-[960px] mx-auto">
      {/* 标语 */}
      <MainSlogan />

      {/* Try Now 按钮 */}
      <div className="text-center mb-8">
        <button
          className="px-8 py-3 bg-linear-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all transform hover:-translate-y-1"
          onClick={() => onClickTryNow?.()}
        >
          {t('main.try')}
        </button>
      </div>

      {/* 编辑区主体 */}
      {children}
    </div>
  )
}

export default MainContent
