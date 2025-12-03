import './Navbar.css'
import React from 'react'
import type { HotstringInfo, KeyState } from '../editor/plugins/typingTipAssist'
import KeyCombination from './HotkeyTip'
import type { ColorScheme } from '../hooks/useColorScheme'
import HotstringTip from './HotstringTip'
import { useTranslation } from 'react-i18next'
import i18n, { i18nLangMap } from '../i18n'

const Navbar: React.FC<{
  hotstringState: HotstringInfo[]
  keyState: KeyState
  isEditorFocused: boolean
  colorMode: ColorScheme
  onChangeColorMode: (mode: ColorScheme) => void
}> = ({
  hotstringState,
  keyState,
  isEditorFocused,
  colorMode,
  onChangeColorMode,
}) => {
  const { t } = useTranslation()

  const changeLanguage = (value: string) => {
    i18n.changeLanguage(value)
  }

  return (
    <div className="p-4">
      {/* 导航栏 */}
      <section className={`${isEditorFocused ? 'opacity-0' : 'relative z-10'} flex items-center justify-between transition-opacity`}>
        {/* 左侧：Logo 和名称 */}
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold bg-linear-to-tr from-[#6671e7]  to-[#9921e7] bg-clip-text text-transparent">
            ✨Effitor
          </div>
        </div>

        {/* 中间：导航链接 */}
        <div className="text-gray-700 transition-colors dark:text-gray-300 hidden md:flex items-center gap-6">
          <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 font-medium">
            {t('navbar.playground')}
          </a>
          <span className="text-gray-400 dark:text-gray-600">|</span>
          <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 font-medium">
            {t('navbar.docs')}
          </a>
        </div>

        {/* 右侧：语言切换、github图标和主题切换按钮 */}
        <div className="flex items-center gap-2">
          {/* 语言切换按钮 */}
          <div className="et-h-navbar__btn dropdown dropdown-hover">
            <div tabIndex={0} role="button">
              <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 8 6 6" />
                <path d="m4 14 6-6 2-3" />
                <path d="M2 5h12" />
                <path d="M7 2h1" />
                <path d="m22 22-5-10-5 10" />
                <path d="M14 18h6" />
              </svg>
            </div>
            <ul className="dropdown-content menu bg-base-100 rounded-box z-1 w-32 p-2 mt-2 right-0 shadow-sm">
              <li><a onClick={() => changeLanguage('en')}>{i18nLangMap.en}</a></li>
              <li><a onClick={() => changeLanguage('zh')}>{i18nLangMap.zh}</a></li>
            </ul>
          </div>
          {/* Github图标按钮 */}
          <a
            href="https://github.com/Ausprain/effitor"
            target="_blank"
            rel="noopener noreferrer"
            className="et-h-navbar__btn"
            aria-label="Github"
          >
            <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
              <path d="M9 18c-4.51 2-5-2-7-2" />
            </svg>
          </a>
          {/* 主题切换按钮 */}
          <button
            onClick={() => onChangeColorMode(colorMode === 'auto' ? 'dark' : colorMode === 'dark' ? 'light' : 'auto')}
            className="et-h-navbar__btn"
            aria-label="Toggle theme"
          >
            {
              {
                auto: (
                  <span>
                    <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v2" />
                      <path d="M14.837 16.385a6 6 0 1 1-7.223-7.222c.624-.147.97.66.715 1.248a4 4 0 0 0 5.26 5.259c.589-.255 1.396.09 1.248.715" />
                      <path d="M16 12a4 4 0 0 0-4-4" />
                      <path d="m19 5-1.256 1.256" />
                      <path d="M20 12h2" />
                    </svg>
                  </span>
                ),
                light: (
                  <span>
                    <svg className="w-5 h-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="4" />
                      <path d="M12 2v2" />
                      <path d="M12 20v2" />
                      <path d="m4.93 4.93 1.41 1.41" />
                      <path d="m17.66 17.66 1.41 1.41" />
                      <path d="M2 12h2" />
                      <path d="M20 12h2" />
                      <path d="m6.34 17.66-1.41 1.41" />
                      <path d="m19.07 4.93-1.41 1.41" />
                    </svg>
                  </span>
                ),
                dark: (
                  <span>
                    <svg className="w-5 h-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" /></svg>
                  </span>
                ),
              }[colorMode]
            }
          </button>
        </div>
      </section>
      {/* 按键跟踪 */}
      <section className={`${isEditorFocused ? 'opacity-100' : ''} opacity-0 absolute inset-0 pl-12 -ml-9 mr-3 pt-5 -mt-5 overflow-x-auto transition-opacity select-none`}>
        {
          hotstringState.length
            ? (
                <HotstringTip hotstringState={hotstringState} />
              )
            : (
                <KeyCombination keyState={keyState} />
              )
        }
      </section>
    </div>
  )
}

export default Navbar
